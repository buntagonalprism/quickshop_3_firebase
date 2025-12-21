import {onRequest} from "firebase-functions/https";
import {logger} from "firebase-functions/v2";
import * as admin from "firebase-admin";
import {FieldValue} from "firebase-admin/firestore";
import validateFirestoreToken from "./validate-token";
import {Editor} from "../types/editor";

// When a user accepts a list invite, add them to the list's editors
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
  const userData : Editor = {
    name: user.displayName || "",
    email: user.email || "",
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

// When a user leaves a list, remove them from the editors array and delete any
// list invite they have created
export const leaveList = onRequest(async (req, res) => {
  // Validate the authentication token
  const [userId, errorMessage] = await validateFirestoreToken(req);
  if (!userId) {
    res.status(401).json({error: errorMessage});
    return;
  }
  logger.info("Validated ID token");

  // Get the list ID the user is leaving from the request JSON body
  const listId = req.body.listId;
  if (!listId) {
    res.status(400).json({error: "listId is missing"});
    return;
  }

  const fs = admin.firestore();

  // Load the list document from Firestore
  const listRef = fs.collection("lists").doc(listId);
  const listDoc = await listRef.get();
  if (!listDoc.exists) {
    res.status(404).json({error: "No list found with id: " + listId});
    return;
  }

  try {
    await fs.runTransaction(async (transaction) => {
      const listDoc = await transaction.get(listRef);
      const listData = listDoc.data();
      if (!listData) {
        throw new Error("List not found");
      }
      if (!listData.editorIds.includes(userId)) {
        throw new Error("User " + userId + " is not an editor of this list");
      }
      const invitesCollection = admin.firestore().collection("invites");
      const invites = await invitesCollection.where("listId", "==", listId).where("inviterId", "==", userId).get();
      invites.forEach((invite) => {
        transaction.delete(invite.ref);
      });
      transaction.update(listRef, {
        editorIds: FieldValue.arrayRemove(userId),
        editors: FieldValue.arrayRemove(listData.editors.find((editor: Editor) => editor.id === userId)),
        [`lastModified.${userId}`]: FieldValue.delete(),
      });
    });
    res.status(200).json({message: "Left list"});
    return;
  } catch (e) {
    res.status(400).json({error: (e as Error).message});
    return;
  }
});
