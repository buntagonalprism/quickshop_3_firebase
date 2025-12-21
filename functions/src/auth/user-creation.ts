import * as auth from "firebase-functions/v1/auth";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import {UserProfile} from "../models/user-profile";

export async function createUserProfile(userId: string): Promise<void> {
  const emptyUserProfile: UserProfile = {
    lastHistoryUpdate: 0,
    lastSuggestionsHidden: 0,
  };

  await admin.firestore()
    .collection("users")
    .doc(userId)
    .set(emptyUserProfile);

  logger.info(`Created user profile for user ${userId}`);
}

export const onUserCreated = auth.user().onCreate(async (user) => {
  const userId = user.uid;
  await createUserProfile(userId);
  logger.info(`Created user profile for user ${userId}`);
});
