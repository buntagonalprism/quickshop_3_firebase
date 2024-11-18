import {setGlobalOptions} from "firebase-functions/options";
import {onRequest, Request} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {FieldValue} from "firebase-admin/firestore";


// Set the default execution region for all functions to Sydney
setGlobalOptions({region: "australia-southeast1"});

admin.initializeApp();

type UserId = string;
type ErrorMessage = string;

const validateFirestoreToken = async (req: Request): Promise<[UserId | null, ErrorMessage | null]> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return [null, "Authorization header is missing"];
  }
  const unused_var = 3;
  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    return [decodedIdToken.uid, null];
  } catch (e) {
    return [null, (e as Error).message];
  }
};


export const acceptListInvite = onRequest(async (req, res) => {
  // Validate the authentication token
  const [userId, errorMessage] = await validateFirestoreToken(req);
  if (!userId) {
    res.status(401).json({error: errorMessage});
    return;
  }
  logger.info("Validated ID token");

  // Get the invite ID the user is accepting from the request JSON body
  const inviteId = req.body.inviteId;
  if (!inviteId) {
    res.status(400).json({error: "inviteId is missing"});
    return;
  }

  const fs = admin.firestore();

  // Load the invite document from Firestore
  const inviteRef = fs.collection("invites").doc(inviteId);
  const inviteData = (await inviteRef.get()).data();
  if (!inviteData) {
    res.status(404).json({error: "No invite found with id: " + inviteId});
    return;
  }

  // Load the list document from firestore
  const listId : string = inviteData.listId;
  const listRef = fs.collection("lists").doc(listId);
  const listDoc = await listRef.get();
  if (!listDoc.exists) {
    res.status(404).json({error: "No list found for invite with id: " + listId});
    return;
  }

  // Get user information
  const user = await admin.auth().getUser(userId);
  const userData = {
    name: user.displayName || "",
    email: user.email,
    id: user.uid,
  };

  try {
    await fs.runTransaction(async (transaction) => {
      const listDoc = await transaction.get(listRef);
      const listData = listDoc.data();
      if (!listData) {
        throw new Error("List not found");
      }
      if (listData.editorIds.includes(userId)) {
        throw new Error("User " + userId + " is already an editor of this list");
      }
      transaction.update(listRef, {
        editorIds: FieldValue.arrayUnion(userId),
        editors: FieldValue.arrayUnion(userData),
      });
    });
    res.status(200).json({message: "Invite accepted"});
    return;
  } catch (e) {
    res.status(400).json({error: (e as Error).message});
    return;
  }
});
