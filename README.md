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
- `FB_FIRESTORE_CREDENTIALS`: A google cloud service account JSON key with permission to configure Firestore. Use the steps detailed above, but instead grant only the `Cloud Datastore Owner` role when creating the service account. 





