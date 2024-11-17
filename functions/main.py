# The Cloud Functions for Firebase SDK to create Cloud Functions and set up triggers.
from typing import Optional
from firebase_functions import https_fn

# The Firebase Admin SDK to access Cloud Firestore.
from firebase_admin import initialize_app, firestore as fb_admin_firestore, auth
from google.cloud import firestore
import requests

app = initialize_app()

def validate_firestore_token(req: https_fn.Request) -> tuple[bool, Optional[str]]:
    # Get the token from the Authorization header
    auth_header = req.headers.get("Authorization")
    if auth_header is None:
        return False, 'Authorization header is missing'
    id_token = auth_header.split("Bearer ")[1]

    # Verify the token and store the result as parameter in the request object
    try:
        req.user =  auth.verify_id_token(id_token)
    except Exception as e:
        return False, str(e)
    return True, None



@https_fn.on_request()
def accept_list_invite(req: https_fn.Request) -> https_fn.Response:
    # Validate the authentication token
    validated, error = validate_firestore_token(req)
    if not validated:
        return https_fn.error(error, status=401)
    
    # Get the invite ID the user is accepting from the request JSON body
    invite_id = req.json.get('inviteId')
    if invite_id is None:
        return https_fn.error('inviteId is missing', status=400)
    
    fs = fb_admin_firestore.client()

    # Load the invite document from Firestore
    invite_ref = fs.collection('invites').document(invite_id)
    invite = invite_ref.get()
    if not invite.exists:
        return https_fn.error('Invite not found', status=404)
    
    # Load the list document from Firestore
    list_ref = fs.collection('lists').document(invite.get('listId'))
    list = list_ref.get()
    if not list.exists:
        return https_fn.error('List not found for invite', status=404)
    
    # Get user information
    user_id = req.user['uid']
    user = {
        'email': req.user['email'],
        'name': req.user['name'],
        'id': user_id
    }

    # Add the user to the list in a transaction to prevent double-adding
    transaction = fs.transaction()

    @firestore.transactional
    def update_in_transaction(transaction) -> bool:
        list = list_ref.get(transaction=transaction)
        
        # Check if the user is already a member of the list
        if user_id in list.get('editorIds'):
            return False 
        else:
            editors = list.get('editors') + [user]
            editor_ids = list.get('editorIds') + [user_id]
            transaction.update(
                list_ref,
                {
                    'editorIds': editor_ids,
                    'editors': editors,
                }
            )
            return True

    result = update_in_transaction(transaction)
    if not result:
        return https_fn.error('User already a member of the list', status=400)
    

    return https_fn.response('User added to list', status=200)

