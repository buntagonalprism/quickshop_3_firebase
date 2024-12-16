import * as admin from "firebase-admin";
import {Request} from "firebase-functions/v2/https";

import {UserId} from "../types/editor";
import {ErrorMessage} from "../types/http";

const validateFirestoreToken = async (req: Request): Promise<[UserId | null, ErrorMessage | null]> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return [null, "Authorization header is missing"];
  }
  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    return [decodedIdToken.uid, null];
  } catch (e) {
    return [null, (e as Error).message];
  }
};
export default validateFirestoreToken;
