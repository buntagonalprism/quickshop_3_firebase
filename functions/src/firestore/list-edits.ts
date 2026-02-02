import {onDocumentCreated, onDocumentDeleted, onDocumentUpdated} from "firebase-functions/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {ShoppingItem} from "../models/shopping-item";
import {ItemDelete, itemDeleteSchema} from "../models/item-delete";
import {ShoppingItemHistory, shoppingItemHistorySchema} from "../models/history/shopping-item-history";
import {ShoppingCategoryHistory, shoppingCategoryHistorySchema} from "../models/history/shopping-category-history";
import {CollectionReference, DocumentReference, QueryDocumentSnapshot, Transaction} from "firebase-admin/firestore";
import {UserProfile, userProfileSchema} from "../models/user-profile";
import {Temporal} from "temporal-polyfill";


const collections = {
  lists: "lists",
  listItems: "items",
  listItemDeletes: "_itemDeletes",
  users: "users",
  userItemHistory: "itemHistory",
  userCategoryHistory: "categoryHistory",
  invites: "invites",
};

const refs = {
  // Users and their history
  users: () => admin.firestore().collection(collections.users),
  user: (userId: string) => refs.users().doc(userId),
  userItemHistory: (userId: string) => refs.user(userId).collection(collections.userItemHistory),
  userCategoryHistory: (userId: string) => refs.user(userId).collection(collections.userCategoryHistory),
  // Lists and their items
  lists: () => admin.firestore().collection(collections.lists),
  list: (listId: string) => refs.lists().doc(listId),
  listItems: (listId: string) => refs.list(listId).collection(collections.listItems),
  listItemDeletes: (listId: string) => refs.list(listId).collection(collections.listItemDeletes),
  // Invites
  invites: () => admin.firestore().collection(collections.invites),
};

// When a list is renamed, rename all the invites for that list
export const onListNameChanged = onDocumentUpdated(`/${collections.lists}/{listId}`, async (event) => {
  const oldListName = event.data?.before.get("name");
  const newListName = event.data?.after.get("name");
  if (oldListName === newListName) {
    return;
  }
  const listId = event.params.listId;
  const invites = await refs.invites().where("listId", "==", listId).get();
  const batch = admin.firestore().batch();
  invites.forEach((invite) => {
    batch.update(invite.ref, {listName: newListName});
  });
  await batch.commit();
});

// When a list is deleted, delete all the invites for that list and delete all list items
export const onListDeleted = onDocumentDeleted(`/${collections.lists}/{listId}`, async (event) => {
  const listId = event.params.listId;
  const invites = await refs.invites().where("listId", "==", listId).get();
  const items = await refs.listItems(listId).get();
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
export const onItemDeleted = onDocumentCreated(`/${collections.lists}/{listId}/${collections.listItemDeletes}/{deleteId}`, async (event) => {
  const listId = event.params.listId;
  const fs = admin.firestore();
  const listRef = refs.list(listId);
  const deleteId = event.params.deleteId;
  const deleteRef = refs.listItemDeletes(listId).doc(deleteId);
  const itemCountQuery = refs.listItems(listId).count();

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
    const users = await transaction.get(refs.users().where("id", "in", Array.from(lastModifyingUsers)));

    const allUserHistoryUpdates: UserHistoryUpdates[] = [];
    const userUpdates: { docRef: DocumentReference, data: UserProfile }[] = [];

    for (const userId of lastModifyingUsers) {
      let updateTimestamp: Temporal.Instant = Temporal.Now.instant();

      const userDoc = users.docs.find((doc) => doc.id === userId);
      if (userDoc) {
        const userData = userProfileSchema.parse(userDoc.data()) as UserProfile;
        // We must *always* increase the value of the lastHistoryUpdate field so that client apps will register
        // the value as having changed, and therefore know to fetch history updates
        updateTimestamp = maxInstant(Temporal.Instant.fromEpochMilliseconds(userData.lastHistoryUpdate + 1), Temporal.Now.instant());
        userData.lastHistoryUpdate = updateTimestamp.epochMilliseconds;
        userUpdates.push({
          docRef: userDoc.ref,
          data: userData,
        });
      } else {
        userUpdates.push({
          docRef: refs.user(userId),
          data: {
            lastHistoryUpdate: updateTimestamp.epochMilliseconds,
            hiddenSuggestionsVersion: 0,
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


async function updateUserHistory(transaction: Transaction, userId: string, items: ShoppingItem[], timestamp: Temporal.Instant): Promise<UserHistoryUpdates> {
  const itemHistoryRef = refs.userItemHistory(userId);
  const categoryHistoryRef = refs.userCategoryHistory(userId);

  const result: UserHistoryUpdates = {
    items: [],
    categories: [],
  };

  // Get existing item and category history documents for the user
  const [itemHistorySnap, categoryHistorySnap] = await Promise.all([
    getAllWhereIn(transaction, itemHistoryRef, "nameLower", items.map((item) => item.product.toLowerCase())),
    getAllWhereIn(transaction, categoryHistoryRef, "nameLower", items.map((item) => item.category.toLowerCase())),
  ]);


  for (const item of items) {
    // Increment usage count for the item in history, or create a new history entry
    let itemHistory: ShoppingItemHistory;
    const itemLower = item.product.toLowerCase();
    const existingItemUpdate = result.items.find((i) => i.data.nameLower === itemLower);
    if (existingItemUpdate) {
      existingItemUpdate.data.lastUsed = timestamp.epochMilliseconds;
      existingItemUpdate.data.usageCount += 1;
    } else {
      const itemHistoryDoc = itemHistorySnap.find((doc) => doc.data().nameLower === itemLower);
      if (itemHistoryDoc) {
        itemHistory = shoppingItemHistorySchema.parse(itemHistoryDoc.data());
        itemHistory.lastUsed = timestamp.epochMilliseconds;
        itemHistory.usageCount += 1;
        result.items.push({ref: itemHistoryDoc.ref, data: itemHistory});
      } else {
        itemHistory = {
          name: item.product,
          nameLower: itemLower,
          category: item.category,
          lastUsed: timestamp.epochMilliseconds,
          usageCount: 1,
        };
        result.items.push({ref: itemHistoryRef.doc(), data: itemHistory});
      }
    }


    // Update or create category history entries
    const categoryLower = item.category.toLowerCase();
    const existingCategoryUpdate = result.categories.find((c) => c.data.nameLower === categoryLower);
    if (existingCategoryUpdate) {
      existingCategoryUpdate.data.lastUsed = timestamp.epochMilliseconds;
      existingCategoryUpdate.data.usageCount += 1;
    } else {
      const existingCategoryDoc = categoryHistorySnap.find((doc) => doc.data().nameLower === categoryLower);
      if (existingCategoryDoc) {
        const existingCategory = shoppingCategoryHistorySchema.parse(existingCategoryDoc.data());
        existingCategory.lastUsed = timestamp.epochMilliseconds;
        existingCategory.usageCount += 1;
        result.categories.push({ref: existingCategoryDoc.ref, data: existingCategory});
      } else {
        result.categories.push({
          ref: categoryHistoryRef.doc(),
          data: {
            name: item.category,
            nameLower: categoryLower,
            lastUsed: timestamp.epochMilliseconds,
            usageCount: 1,
          },
        });
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

function maxInstant(a: Temporal.Instant, b: Temporal.Instant): Temporal.Instant {
  return a.epochMilliseconds > b.epochMilliseconds ? a : b;
}

type UserHistoryUpdates = {
  items: { ref: DocumentReference, data: ShoppingItemHistory }[];
  categories: { ref: DocumentReference, data: ShoppingCategoryHistory }[];
}
