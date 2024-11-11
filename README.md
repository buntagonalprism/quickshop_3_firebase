# Quickshop 3 Firebase Configuration

This project hosts the configuration deployed to Firebase for the Quickshop 3 project.

## Prerequesites
- [NodeJS](https://nodejs.org/en) 18.18 or greater
- [Firebase CLI](https://firebaseopensource.com/projects/firebase/firebase-tools/) 12.4.8 or greater

## Utility App 
The utility app is a Next.js application that handles sharing links for users that do not already have Quickshop installed. The app is built as a [static SPA](https://nextjs.org/docs/pages/building-your-application/deploying#static-html-export) with no server-side logic, and hosted in Firebase Hosting. 

To run locally
1. Copy and rename either of `.env.dev` or `.env.prod` to `.env`
2. From `quickshop-utility-app` folder run `npm run dev`

To deploy to dev via command line
1. Copy and rename `.env.dev` to `.env`
2. From `quickshop-utility-app` folder run `npm run build`. This will build a static web app version of the NextJS app, outputting to `quickshop-utility-app\out`
3. From root folder run `firebase deploy --only hosting`. This will deploy the built assets to the default Firebase project, `quickshop-dev`, as specified in the `.firebaserc` file

To deploy to prod via command line
1. Copy and rename `.env.prod` to `.env`
2. From `quickshop-utility-app` folder run `npm run build`. This will build a static web app version of the NextJS app, outputting to `quickshop-utility-app\out`
3. From root folder run `firebase deploy --project quickshop-prod --only hosting`. This will deploy the built assets to the `quickshop-prod` Firebase project,

### App Links Configuration - Android
Android apps can be configured to automatically handle `https` URLs instead of the link being opened in a browser. The complete steps required to enable this behaviour for a flutter app are described here: https://docs.flutter.dev/cookbook/navigation/set-up-app-links

In this repository, the `/app-links` folder contains verions of the `assetslinks.json` file for each deployment environment. In the CI deployment pipelines, the corresponding file for the environment is copied into the built output folder at `/quickshop-utility-app/out/.well-known/assetlinks.json`. This file is deployed to firebase hosting along with the utility app. For example, in prod, this file is publically available at `https://quickshop.buntagon.com/.well-known/assetlinks.json`

When a link to the Quickshop domain name is opened on a user's device, and the Quickshop app is already installed with its manifest entry declaring thatit can handle the link, then the Android OS automatically loads this `assetlinks.json` file to verify if the app should be allowed to automatically handle the link instead of opening it in the browser. I 

## Firestore Configuration
Configuration for the Firestore NoSQL databases used by Quickshop are stored in the following files:
1. `firestore.rules` Declares security rules which control user access to firestore documents. [Firestore security rules documentation](https://firebase.google.com/docs/firestore/security/get-started)
2. `firestore.indexes.json` Declares indexes on document fields required to support complex queries. [Firestore indexes documentation](https://firebase.google.com/docs/firestore/query-data/indexing)

To deploy via command line:
1. Run `firebase deploy --project <PROJECT_NAME> -- only firestore`

## Firebase Functions

## CI / CD Pipelines
The following environment variables are set in each environment in the Github Repo under Settings > Environments:
- `FB_HOSTING_CREDENTIALS`: A google cloud service account JSON key granting permission to push app builds to firebase hosting. [See steps detailed here](https://github.com/FirebaseExtended/action-hosting-deploy/blob/main/docs/service-account.md) for creating a service account with appropriate roles. All newlines should be removed from the json key file before adding it as a secret in github actions
- `FB_FIRESTORE_CREDENTIALS`: A google cloud service account JSON key with permission to configure Firestore. 

### Firestore Service Account Requirements
In Google Cloud identity and access management (IAM), access to services and APIs are controlled through *permissions*. Users and service accounts are not assigned permissions directly, but instead they are assigned *roles*. A role includes a collection of permissions all granted through that role.  

The service account used to deploy configuration to firestore requires [permissions to manage Firestore security rules](https://firebase.google.com/docs/projects/iam/permissions#security-rules). There are no [pre-defined firebase roles](https://firebase.google.com/docs/projects/iam/roles-predefined-product#firestore) that includes these permissions, apart from firebase project owner role - which would violate the principal of least-access if it was assigned to a service account. Therefore, we need to create a custom role with permissions to deploy rules.

See [Google cloud documentation on creating a custom role](https://cloud.google.com/iam/docs/creating-custom-roles?cloudshell=true#creating)
1. Open the roles list for the project: https://console.cloud.google.com/iam-admin/roles
2. Select `CREATE ROLE`
3. Give a title like `Firebase Rules Owner` and a role id like `firebaserules.owner`
4. Give a description like `Full access to create and manage Firebase security rules for Firestore and Cloud Storage`
4. Set the role launch stage to `General Availability`
5. Select `ADD PERMISSIONS`
6. Enter `firebaserules` in the `Filter: Enter property name or value` field. Don't use the `Filter permissions by role` dropdown
7. Select all permissions. **There may be multiple pages** of permissions - make sure to go through all the pages and select all the `firebaserules` permissions 
8. Create the role

When creating the service account for firestore deployment, the following roles should be assigned:
    - `Cloud Datastore Owner`
    - `Firebase Viewer`
    - `<RULES_OWNER_ROLE_NAME_FROM_ABOVE>`

The roles assigned to each user and service account in a project can be viewed and managed here: https://console.cloud.google.com/iam-admin/iam

### Google Cloud API Requirements
The following APIs must be enabled in each Google Cloud project in order for the pipelines to execute successfully:
- [Firebase Hosting API](https://console.cloud.google.com/apis/library/firebasehosting.googleapis.com) used by CI pipelines to deploy to Firebase Hosting via API call
- [Cloud Resource Manager API](https://console.cloud.google.com/apis/library/cloudresourcemanager.googleapis.com) used by CI pipelines to verify that service accounts have the necessary permissions for deployment



