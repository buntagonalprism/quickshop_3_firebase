import {command, run, option, oneOf} from "cmd-ts";

const ENV_VALUES = ["local", "dev", "prod"] as const;
type Env = (typeof ENV_VALUES)[number];

type Args = {
  env: Env;
}

function main(args: Args) {
  console.log("Loading suggestions... with args:", args);
}


const cmd = command({
  name: "load-suggestions",
  description: "Load suggestions into the database",
  version: "1.0.0",
  args: {
    env: option({
      type: oneOf(ENV_VALUES),
      long: "env",
      short: "e",
      description: "Environment to load suggestions into. Must be one of: " + ENV_VALUES.join(", "),
    }),
  },
  handler: (args) => {
    main(args);
  },
});


run(cmd, process.argv.slice(2));
