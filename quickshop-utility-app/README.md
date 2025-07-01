# Quickshop Utility App 
The utility app is a Next.js application that handles sharing links for users that do not already have Quickshop installed. The app is built as a [static SPA](https://nextjs.org/docs/pages/building-your-application/deploying#static-html-export) with no server-side logic, and hosted in Firebase Hosting. 

## App Distribution Invite Links
The utility app uses [invite links for Firebase App Distribution](https://firebase.google.com/docs/app-distribution/create-invite-links?platform=android) to make it easy for users to sign themselves up as a tester in Firebase App Distribution. 

Invite links for each target environment are stored in environment files at: `/quickshop-utility-app/.env.<ENVIRONMENT_NAME>`

## Develop and Deploy
To run locally, from the `quickshop-utility-app` folder:
1. Copy and rename either of `.env.dev` or `.env.prod` to `.env`
2. Run `npm run dev`

To deploy to dev via command line
1. In `quickshop-utility-app` folder, rename `.env.dev` to `.env`
2. From `quickshop-utility-app` folder run `npm run build`. This will build a static web app version of the NextJS app, outputting to `quickshop-utility-app\out`
3. Copy and rename `app-links/assetlinks-dev.json` to `quickshop-utility-app/out/.well-known/assetlinks.json`. The `.well-known` folder will need to be created.
4. From root folder run `firebase deploy --only hosting`. This will deploy the built assets to the default Firebase project, `quickshop-dev`, as specified in the `.firebaserc` file

To deploy to prod via command line
1. Copy and rename `.env.prod` to `.env`
2. From `quickshop-utility-app` folder run `npm run build`. This will build a static web app version of the NextJS app, outputting to `quickshop-utility-app\out`
3. Copy and rename `app-links/assetlinks-prod.json` to `quickshop-utility-app/out/.well-known/assetlinks.json`. The `.well-known` folder will need to be created.
4. From root folder run `firebase deploy --project quickshop-prod --only hosting`. This will deploy the built assets to the `quickshop-prod` Firebase project

## App Links Configuration - Android
Android apps can be configured to automatically handle `https` URLs instead of the link being opened in a browser. The complete steps required to enable this behaviour for a flutter app are described here: https://docs.flutter.dev/cookbook/navigation/set-up-app-links

In this repository, the `/app-links` folder contains verions of the `assetslinks.json` file for each deployment environment. In the CI deployment pipelines, the corresponding file for the environment is copied into the built output folder at `/quickshop-utility-app/out/.well-known/assetlinks.json`. This file is deployed to firebase hosting along with the utility app. For example, in prod, this file is publically available at `https://quickshop.buntagon.com/.well-known/assetlinks.json`

When a link to the Quickshop domain name is opened on a user's device, and when the Quickshop app is already installed with its Android manifest declaring that it can handle https links to that hostname, then the Android OS automatically loads this `assetlinks.json` file to verify if the app should be allowed to automatically handle the link instead of opening it in the browser. 

## App Links Configuration - Sharing Links via Facebook products 
Our delightful friends at Facebook & Co have *helpfully* (sarcasm strongly intended) created their own standards for deep linking into mobile apps. Instead of just supporting what the Android and iOS operating systems do natively, if you open a HTTP deep link from Facebook or from Facebook Messenger (and probably also instagram), instead of deep-linking into the app it will open the link as a webpage in an embedded browser instead.

It is possible to register your app with Facebook so that deep links work as they should when opening them from Facebook products; see the documentation here: https://developers.facebook.com/docs/applinks/overview. However, this requires further configuration to be added to the utility app webpage, and the installation of a facebook plugin in the mobile app, all just to handle behaviour which the operating system already provides. Personally, the improvement in user experience is not worth giving Meta the satisfaction of succumbing to their walled garden. 

The workaround implemented in the utility app is to display a button which can open the app using an [Android deep link](https://developer.android.com/training/app-links#deep-links) with a custom scheme rather than the https scheme. Of course, Facebook can't resist getting in one last parting shot. It shows a dialogue message that tries to make everything outside the "Metaverse" sound scary and untrustworthy: "The website you're viewing is attemping to open an external app. Would you like to continue?" Hilarious. 