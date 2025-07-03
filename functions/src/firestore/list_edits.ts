import {onDocumentCreated, onDocumentDeleted, onDocumentUpdated} from "firebase-functions/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {ShoppingItem} from "../models/shopping-item";
import {ItemDelete, itemDeleteSchema} from "../models/item-delete";
import {ShoppingItemHistory, shoppingItemHistorySchema} from "../models/history/shopping-item-history";
import {ShoppingCategoryHistory, shoppingCategoryHistorySchema} from "../models/history/shopping-category-history";
import {CollectionReference, DocumentReference, QueryDocumentSnapshot, Timestamp, Transaction} from "firebase-admin/firestore";
import {UserProfile, userProfileSchema} from "../models/user-profile";

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
  const fs = admin.firestore();
  const listRef = fs.collection("lists").doc(listId);
  const deleteId = event.params.deleteId;
  const deleteRef = fs.collection("lists").doc(listId).collection("_itemDeletes").doc(deleteId);
  const itemCountQuery = fs.collection("lists").doc(listId).collection("items").count();

  await fs.runTransaction(async (transaction) => {
    const [listDoc, deleteSnap, itemCountSnap] = await Promise.all([
      transaction.get(listRef),
      transaction.get(deleteRef),
      transaction.get(itemCountQuery),
    ]);
    const deleteData: ItemDelete = itemDeleteSchema.parse(deleteSnap.data());
    const itemCount = itemCountSnap.data().count;
    const listData = listDoc.data();
    if (!listData) {
      throw new Error("List not found");
    }

    // Update user
    const completedItems: ShoppingItem[] = deleteData.items.filter((item) => item.completed);
    const lastModifyingUsers = new Set(completedItems.map((item) => item.lastModifiedByUserId));
    const users = await transaction.get(fs.collection("users").where("id", "in", Array.from(lastModifyingUsers)));

    const allUserHistoryUpdates: UserHistoryUpdates[] = [];
    const userUpdates: {docRef: DocumentReference, data: UserProfile}[] = [];

    for (const userId of lastModifyingUsers) {
      let updateTimestamp: Timestamp = Timestamp.now();

      const userDoc = users.docs.find((doc) => doc.id === userId);
      if (userDoc) {
        const userData = userProfileSchema.parse(userDoc.data()) as UserProfile;
        // We must *always* increase the value of the lastHistoryUpdate field so that client apps will register
        // the value as having changed, and therefore know to fetch history updates
        updateTimestamp = maxTimestamp(Timestamp.fromMillis(userData.lastHistoryUpdate.toMillis() + 1), Timestamp.now());
        userData.lastHistoryUpdate = updateTimestamp;
        userUpdates.push({
          docRef: userDoc.ref,
          data: userData,
        });
      } else {
        userUpdates.push({
          docRef: fs.collection("users").doc(userId),
          data: {
            lastHistoryUpdate: updateTimestamp,
            hiddenSuggestions: {items: [], categories: []},
          } as UserProfile,
        });
      }
      const userItems = completedItems.filter((item) => item.lastModifiedByUserId === userId);
      const historyUpdates = await updateUserHistory(transaction, userId, userItems, updateTimestamp);
      allUserHistoryUpdates.push(historyUpdates);
    }

    // Add all the updates to the transaction
    for (const userUpdate of userUpdates) {
      transaction.set(userUpdate.docRef, userUpdate.data);
    }
    for (const historyUpdates of allUserHistoryUpdates) {
      for (const itemUpdate of historyUpdates.items) {
        transaction.set(itemUpdate.ref, itemUpdate.data);
      }
      for (const categoryUpdate of historyUpdates.categories) {
        transaction.set(categoryUpdate.ref, categoryUpdate.data);
      }
    }

    // Update the list item count if it is incorrect due to concurrent deletes
    if (itemCount !== listData.itemCount) {
      logger.info("Correcting list itemCount", {
        listId: listId,
        oldItemCount: listData.itemCount,
        newItemCount: itemCount,
      });
      transaction.update(listRef, {itemCount: itemCount});
    }

    // Once processed the delete record is no longer needed
    transaction.delete(deleteRef);
  });
});


async function updateUserHistory(transaction: Transaction, userId: string, items: ShoppingItem[], timestamp: Timestamp) : Promise<UserHistoryUpdates> {
  const fs = admin.firestore();
  const userDocRef = fs.collection("users").doc(userId);
  const itemHistoryRef = userDocRef.collection("itemHistory");
  const categoryHistoryRef = userDocRef.collection("categoryHistory");

  const result: UserHistoryUpdates = {
    items: [],
    categories: [],
  };

  // Get existing item and category history documents for the user
  const [itemHistorySnap, categoryHistorySnap] = await Promise.all([
    getAllWhereIn(transaction, itemHistoryRef, "nameLower", items.map((item) => item.product.toLowerCase())),
    getAllWhereIn(transaction, categoryHistoryRef, "nameLower", Array.from(new Set(items.flatMap((item) => item.categories))).map((cat) => cat.toLowerCase())),
  ]);


  for (const item of items) {
    // Increment usage count for the item in history, or create a new history entry
    let itemHistory: ShoppingItemHistory;
    const itemLower = item.product.toLowerCase();
    const existingItemUpdate = result.items.find((i) => i.data.nameLower === itemLower);
    if (existingItemUpdate) {
      existingItemUpdate.data.lastUsed = timestamp;
      existingItemUpdate.data.usageCount += 1;
    } else {
      const itemHistoryDoc = itemHistorySnap.find((doc) => doc.data().nameLower === itemLower);
      if (itemHistoryDoc) {
        itemHistory = shoppingItemHistorySchema.parse(itemHistoryDoc.data());
        itemHistory.lastUsed = timestamp;
        itemHistory.usageCount += 1;
        result.items.push({ref: itemHistoryDoc.ref, data: itemHistory});
      } else {
        itemHistory = {
          name: item.product,
          nameLower: itemLower,
          categories: item.categories,
          lastUsed: timestamp,
          usageCount: 1,
        };
        result.items.push({ref: itemHistoryRef.doc(), data: itemHistory});
      }
    }

    // Update or create category history entries
    for (const category of item.categories) {
      const categoryLower = category.toLowerCase();
      const existingCategoryUpdate = result.categories.find((c) => c.data.nameLower === categoryLower);
      if (existingCategoryUpdate) {
        existingCategoryUpdate.data.lastUsed = timestamp;
        existingCategoryUpdate.data.usageCount += 1;
      } else {
        const existingCategoryDoc = categoryHistorySnap.find((doc) => doc.data().nameLower === categoryLower);
        if (existingCategoryDoc) {
          const existingCategory = shoppingCategoryHistorySchema.parse(existingCategoryDoc.data());
          existingCategory.lastUsed = timestamp;
          existingCategory.usageCount += 1;
          result.categories.push({ref: existingCategoryDoc.ref, data: existingCategory});
        } else {
          result.categories.push({
            ref: categoryHistoryRef.doc(),
            data: {
              name: category,
              nameLower: categoryLower,
              lastUsed: timestamp,
              usageCount: 1,
            },
          });
        }
      }
    }
  }

  return result;
}

// Helper function to get all documents where a field is in a list of values, working around Firestore's limit of 30 values for "in" queries
async function getAllWhereIn(transaction: Transaction, collection: CollectionReference, field: string, values: string[]): Promise<QueryDocumentSnapshot[]> {
  const chunks: QueryDocumentSnapshot[] = [];
  // Firestore has a limit of 30 values for "in" queries, but we can chunk them
  // https://firebase.google.com/docs/firestore/query-data/queries#in_not-in_array-contains-any_limits
  const chunkSize = 30;
  for (let i = 0; i < values.length; i += chunkSize) {
    const chunk = values.slice(i, i + chunkSize);
    const query = collection.where(field, "in", chunk);
    const querySnapshot = await transaction.get(query);
    querySnapshot.forEach((doc) => {
      chunks.push(doc);
    });
  }
  return chunks;
}

function maxTimestamp(a: Timestamp, b: Timestamp): Timestamp {
  return a.toMillis() > b.toMillis() ? a : b;
}

type UserHistoryUpdates = {
  items: {ref: DocumentReference, data: ShoppingItemHistory}[];
  categories: {ref: DocumentReference, data: ShoppingCategoryHistory}[];
}
