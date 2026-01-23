# Utility Scripts
This folder contains useful scripts for administering the Firebase configuration, particularly the set of suggested items stored in Firestore. Execution of these scripts requires Application Default Credentials (ADC). In the google cloud ecosystem, ADC are a way of supplying connection information, like API keys and access tokens, to Google cloud libraries. For code executing in a google-hosted environment, e.g. Firebase Functions, ADC are provided automatically by Google's infrastructure. When executing locally, ADC can be provided via environment variables or by storing JSON files in standard locations. 

The Google Cloud CLI tool - `gcloud`, can be used to generate an ADC json file which gets put in your user home directory at the following path:
- Windows: `<USER_HOME>\AppData\Roaming\gcloud\application_default_credentials.json`
- MacOS/linux: `~/.config/gcloud/application_default_credentials.json`

To execute a script:
1. Install the [gcloud](https://cloud.google.com/sdk/docs/install) CLI
2. Login and create the ADC `gcloud auth application-default login`. It does not matter which project is selected by default, only that the account you log into has sufficient access to the Firebase project you want to target
3. Run a script using `npx tsx <script-name>.ts -e <env>`. Explanation:
    - `npx` is the node package executor, that can be used to execute NodeJS packages. It is an alternative to the previously common approach of installing packages globally.
    - `tsx` stands for [Typescript Execute](https://tsx.is/), which can do just-in-time compilation of typescript files to execute them in the Node JS engine without a seperate compilation step
    - `-e <env>` is common in most scripts, requiring the target environment (e.g. 'dev', 'prod') to be passed in


