import {setGlobalOptions} from "firebase-functions/options";
import * as admin from "firebase-admin";

// Set the default execution region for all functions to Sydney
// This must be done before exporting functions from other files
setGlobalOptions({region: "australia-southeast1"});

// Export functions from other files
export {acceptListInvite, leaveList} from "./http/list_invite";
export {onListNameChanged, onListDeleted, onItemDeleted} from "./firestore/list_edits";

// Initialise the connection to Firebase. This only needs to be done once.
admin.initializeApp();
