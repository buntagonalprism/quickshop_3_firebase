import {onRequest} from "firebase-functions/https";
import {logger} from "firebase-functions/v2";
import validateFirestoreToken from "./validate-token";
import {createUserProfile} from "../auth/user-creation";

// When a user opens the app and they don't have a user profile, the app can request one to be created
export const createUser = onRequest(async (req, res) => {
  // Validate the authentication token
  const [userId, errorMessage] = await validateFirestoreToken(req);
  if (!userId) {
    res.status(401).json({error: errorMessage});
    return;
  }
  logger.info("Validated ID token");

  await createUserProfile(userId);
});
