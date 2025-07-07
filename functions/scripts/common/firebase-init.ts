import {oneOf, option} from "cmd-ts";
import * as admin from "firebase-admin";

export const ENV_VALUES = ["local", "dev", "prod"] as const;
export type Env = (typeof ENV_VALUES)[number];
export const targetEnvironmentOption = option({
  type: oneOf(ENV_VALUES),
  long: "env",
  short: "e",
  description: "Firebase environment to load target. Must be one of: " + ENV_VALUES.join(", "),
});

const devFirebaseConfig: admin.AppOptions = {
  databaseURL: "https://quickshop-dev.firebaseio.com",
  projectId: "quickshop-dev",
  storageBucket: "quickshop-dev.firebasestorage.app",
  credential: admin.credential.applicationDefault(),
};

const prodFirebaseConfig: admin.AppOptions = {
  databaseURL: "https://quickshop-prod.firebaseio.com",
  projectId: "quickshop-prod",
  storageBucket: "quickshop-prod.firebasestorage.app",
  credential: admin.credential.applicationDefault(),
};

export async function initializeFirestore(env: "local" | "dev" | "prod") : Promise<admin.firestore.Firestore> {
  let fs: admin.firestore.Firestore;
  switch (env) {
  case "local":
    console.log("Using dev Firebase configuration with local Firestore emulator.");
    admin.initializeApp(devFirebaseConfig);
    fs = admin.firestore();
    fs.settings({
      host: "localhost:8080",
      ssl: false,
    });
    return fs;
  case "dev":
    console.log("Using dev Firebase configuration.");
    admin.initializeApp(devFirebaseConfig);
    return admin.firestore();
  case "prod":
    console.log("Using prod Firebase configuration.");
    admin.initializeApp(prodFirebaseConfig);
    return admin.firestore();
  default:
    throw new Error(`Invalid environment: ${env}. Must be one of: ${ENV_VALUES.join(", ")}`);
  }
}
