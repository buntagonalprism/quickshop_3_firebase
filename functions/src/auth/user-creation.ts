import * as functionsv1 from "firebase-functions/v1";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import {UserProfile} from "../models/user-profile";

export async function createUserProfile(userId: string): Promise<void> {
  const emptyUserProfile: UserProfile = {
    lastHistoryUpdate: 0,
    hiddenSuggestionsVersion: 0,
  };

  await admin.firestore()
    .collection("users")
    .doc(userId)
    .set(emptyUserProfile);

  logger.info(`Created user profile for user ${userId}`);
}

// v1 Functions don't support the setGlobalOptions method used in index.ts to set
// the global functions region, so we need to explicitly set the region.
export const onUserCreated = functionsv1.region("australia-southeast1").auth.user().onCreate(async (user) => {
  const userId = user.uid;
  await createUserProfile(userId);
  logger.info(`Created user profile for user ${userId}`);
});
