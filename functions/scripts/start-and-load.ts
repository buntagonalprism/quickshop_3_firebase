import {spawn, ChildProcess} from "child_process";
import * as path from "path";

const TIMEOUT_MS = 120000; // 2 minutes
const READY_MESSAGE = "All emulators ready";

async function startEmulators(): Promise<ChildProcess> {
  console.log("Starting Firebase emulators...");

  const rootDir = path.resolve(__dirname, "../..");

  // Start build watcher in background
  console.log("Starting build watcher...");
  const buildProcess = spawn("npm", ["run", "--prefix", "functions", "build:watch"], {
    cwd: rootDir,
    stdio: "inherit",
    shell: true,
  });

  buildProcess.on("error", (error) => {
    console.error("Build watcher error:", error);
  });

  // Give build a moment to start
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Start Firebase emulators
  console.log("Starting Firebase emulators...");
  const emulatorProcess = spawn("firebase", ["emulators:start", "--inspect-functions", "--project", "quickshop-dev"], {
    cwd: rootDir,
    stdio: "pipe",
    shell: true,
  });

  return emulatorProcess;
}

async function waitForEmulators(emulatorProcess: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    let ready = false;
    const timeout = setTimeout(() => {
      if (!ready) {
        reject(new Error("Timeout waiting for emulators to start"));
      }
    }, TIMEOUT_MS);

    const checkOutput = (data: Buffer) => {
      const output = data.toString();
      process.stdout.write(output);

      if (output.includes(READY_MESSAGE)) {
        ready = true;
        clearTimeout(timeout);
        console.log("\n✓ Emulators are ready!\n");

        // Remove listeners after ready to avoid duplication
        emulatorProcess.stdout?.removeListener("data", checkOutput);
        emulatorProcess.stderr?.removeListener("data", checkOutput);

        resolve();
      }
    };

    emulatorProcess.stdout?.on("data", checkOutput);
    emulatorProcess.stderr?.on("data", checkOutput);

    emulatorProcess.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    emulatorProcess.on("exit", (code) => {
      if (!ready) {
        clearTimeout(timeout);
        reject(new Error(`Emulator process exited with code ${code}`));
      }
    });
  });
}

async function runLoadSuggestions(): Promise<void> {
  console.log("Running load-suggestions script...\n");

  return new Promise((resolve, reject) => {
    const scriptsDir = __dirname;
    const loadScript = spawn("npx", ["tsx", "load-suggestions.ts", "-e", "local"], {
      cwd: scriptsDir,
      stdio: "inherit",
      shell: true,
    });

    loadScript.on("exit", (code) => {
      if (code === 0) {
        console.log("\n✓ Load suggestions completed!");
        resolve();
      } else {
        reject(new Error(`Load suggestions script exited with code ${code}`));
      }
    });

    loadScript.on("error", reject);
  });
}

async function main() {
  let emulatorProcess: ChildProcess | null = null;

  function shutdownEmulators(exitCode = 0) {
    if (emulatorProcess && !emulatorProcess.killed) {
      console.log("\nStopping emulators...");
      emulatorProcess.kill("SIGINT");

      // Wait for graceful shutdown, then force exit if needed
      setTimeout(() => {
        if (!emulatorProcess?.killed) {
          console.log("Force killing emulators...");
          emulatorProcess?.kill("SIGKILL");
        }
        process.exit(exitCode);
      }, 5000); // Give 5 seconds for graceful shutdown
    } else {
      process.exit(exitCode);
    }
  }

  try {
    emulatorProcess = await startEmulators();
    await waitForEmulators(emulatorProcess);


    // Give it a moment to fully initialize
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await runLoadSuggestions();

    console.log("\nEmulators are still running. Press Ctrl+C to stop them.\n");

    // Keep the process alive and forward emulator output
    emulatorProcess.stdout?.on("data", (data) => process.stdout.write(data.toString()));
    emulatorProcess.stderr?.on("data", (data) => process.stderr.write(data.toString()));

    // Handle cleanup on exit
    const cleanup = () => {
      shutdownEmulators(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  } catch (error) {
    console.error("Error:", error);
    shutdownEmulators(1);
  }
}

main();
