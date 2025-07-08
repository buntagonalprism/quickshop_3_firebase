import {command, run} from "cmd-ts";
import {Env, initializeFirestore, targetEnvironmentOption} from "./common/firebase-init";
import * as fs from "fs";
import * as path from "path";


type Args = {
  env: Env;
}

interface SuggestionItem {
  id: string | undefined;
  item: string;
  category: string | undefined;
  categories?: string[] | undefined;
}

interface SuggestionCategory {
  id: string | undefined;
  name: string;
}

async function main(args: Args) {
  console.log("Loading suggestions... with args:", args);
  const firestore = await initializeFirestore(args.env);

  const timestampMs = Date.now();

  // Load categories from JSON file
  const categoriesPath = path.join(__dirname, "../../suggestions/en-AU/categories.json");
  const categories: SuggestionCategory[] = JSON.parse(fs.readFileSync(categoriesPath, "utf8"));
  console.log(`Loaded ${categories.length} categories`);

  // Load items from JSON file
  const itemsPath = path.join(__dirname, "../../suggestions/en-AU/items.json");
  const items: SuggestionItem[] = JSON.parse(fs.readFileSync(itemsPath, "utf8"));
  console.log(`Loaded ${items.length} items`);

  // Store categories in Firestore at /suggestions/categories/en-AU
  console.log("Storing categories in Firestore...");
  const categoriesCollection = firestore.collection("suggestions/categories/en-AU");
  const updatedCategoryIds = await Promise.all(categories.map(async (category) => {
    if (category.id) {
      // If the category has an ID, update it instead of adding a new one
      await categoriesCollection.doc(category.id).set({
        name: category.name,
        updated: timestampMs,
      }, {merge: true});
      return category.id;
    } else {
      // If the category does not have an ID, add it as a new document
      const docRef = await categoriesCollection.add({
        name: category.name,
        updated: timestampMs,
      });
      return docRef.id; // Return the newly created document ID
    }
  }));
  const categoriesDoc = firestore.collection("suggestions").doc("categories");
  await categoriesDoc.set({
    lastUpdated: {
      "en-AU": timestampMs,
    },
  }, {merge: true}); // Update the categories document with the timestamp
  for (let i = 0; i < categories.length; i++) {
    categories[i].id = updatedCategoryIds[i]; // Update the category with the new ID
  }
  fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 4)); // Save updated categories with IDs

  console.log("Categories stored successfully!");

  // Store items in Firestore at /suggestions/items/en-AU
  console.log("Storing items in Firestore...");
  const itemsCollection = firestore.collection("suggestions/items/en-AU");
  const updatedItemIds = await Promise.all(items.map(async (item) => {
    if (item.id) {
      // If the item has an ID, update it instead of adding a new one
      await itemsCollection.doc(item.id).set({
        name: item.item,
        categories: item.category ? [item.category] : (item.categories || []),
        updated: timestampMs,
      }, {merge: true});
      return item.id;
    } else {
      // If the item does not have an ID, add it as a new document
      const docRef = await itemsCollection.add({
        name: item.item,
        categories: item.category ? [item.category] : (item.categories || []),
        updated: timestampMs,
      });
      return docRef.id; // Return the newly created document ID
    }
  }));
  const itemsDoc = firestore.collection("suggestions").doc("items");
  await itemsDoc.set({
    lastUpdated: {
      "en-AU": timestampMs,
    },
  }, {merge: true}); // Update the items document with the timestamp
  for (let i = 0; i < items.length; i++) {
    items[i].id = updatedItemIds[i]; // Update the item with the new ID
  }
  fs.writeFileSync(itemsPath, JSON.stringify(items, null, 4)); // Save updated items with IDs

  console.log("Items stored successfully!");

  console.log("All suggestions loaded into Firestore!");
}

const cmd = command({
  name: "load-suggestions",
  description: "Load suggestions into the database",
  version: "1.0.0",
  args: {
    env: targetEnvironmentOption,
  },
  handler: (args) => {
    main(args);
  },
});


run(cmd, process.argv.slice(2));
