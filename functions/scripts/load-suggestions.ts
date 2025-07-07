import {command, run} from "cmd-ts";
import {Env, initializeFirestore, targetEnvironmentOption} from "./common/firebase-init";


type Args = {
  env: Env;
}

async function main(args: Args) {
  console.log("Loading suggestions... with args:", args);
  const fs = await initializeFirestore(args.env);

  const lists = await fs.collection("lists").get();
  console.log(`Found ${lists.docs.length} lists.`);
}

const cmd = command({
  name: "load-suggestions",
  description: "Load suggestions into the database",
  version: "1.0.0",
  args: {
    env: targetEnvironmentOption,
  },
  handler: (args) => {
    main(args);
  },
});


run(cmd, process.argv.slice(2));
