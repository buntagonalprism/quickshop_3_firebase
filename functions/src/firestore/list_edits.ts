import {onDocumentCreated, onDocumentDeleted, onDocumentUpdated} from "firebase-functions/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// When a list is renamed, rename all the invites for that list
export const onListNameChanged = onDocumentUpdated("lists/{listId}", async (event) => {
  const oldListName = event.data?.before.get("name");
  const newListName = event.data?.after.get("name");
  if (oldListName === newListName) {
    return;
  }
  const listId = event.params.listId;
  const invites = await admin.firestore().collection("invites").where("listId", "==", listId).get();
  const batch = admin.firestore().batch();
  invites.forEach((invite) => {
    batch.update(invite.ref, {listName: newListName});
  });
  await batch.commit();
});

// When a list is deleted, delete all the invites for that list and delete all list items
export const onListDeleted = onDocumentDeleted("lists/{listId}", async (event) => {
  const listId = event.params.listId;
  const invites = await admin.firestore().collection("invites").where("listId", "==", listId).get();
  const items = await admin.firestore().collection("lists").doc(listId).collection("items").get();
  const batch = admin.firestore().batch();
  invites.forEach((invite) => {
    batch.delete(invite.ref);
  });
  items.forEach((item) => {
    batch.delete(item.ref);
  });
  await batch.commit();
});

// When a user deletes an item, they do so in an offline-friendly batched write that does not
// guarantee consistency in case of concurrent deletes. This could result in the list itemCount
// being decremented twice for the same item. This function corrects the count by checking the
// item count in a transaction, and updating the list if needed.
export const onItemDeleted = onDocumentCreated("lists/{listId}/_itemDeletes/{deleteId}", async (event) => {
  const listId = event.params.listId;
  const listRef = admin.firestore().collection("lists").doc(listId);
  const deleteId = event.params.deleteId;
  const deleteRef = admin.firestore().collection("lists").doc(listId).collection("_itemDeletes").doc(deleteId);
  const itemCountQuery = admin.firestore().collection("lists").doc(listId).collection("items").count();

  await admin.firestore().runTransaction(async (transaction) => {
    const listDoc = await transaction.get(listRef);
    const itemCount = (await transaction.get(itemCountQuery)).data().count;
    const listData = listDoc.data();
    if (!listData) {
      throw new Error("List not found");
    }
    transaction.delete(deleteRef);
    if (itemCount !== listData.itemCount) {
      logger.info("Correcting list itemCount", {
        listId: listId,
        oldItemCount: listData.itemCount,
        newItemCount: itemCount,
      });
      transaction.update(listRef, {itemCount: itemCount});
    }
  });
});
