# The Cloud Functions for Firebase SDK to create Cloud Functions and set up triggers.
from firebase_functions import https_fn

# The Firebase Admin SDK to access Cloud Firestore.
from firebase_admin import initialize_app, credentials
import requests

app = initialize_app()

@https_fn.on_request()
def add_tester(req: https_fn.Request) -> https_fn.Response:
    # Grab the email parameter.
    email = req.args.get("email")
    if email is None:
        return https_fn.Response("No email parameter provided", status=400)

    # Get an access token used to authenticate with firebase APIs
    token = credentials.ApplicationDefault().get_access_token()
    if token is None:
        return https_fn.Response("Failed to get access token", status=500)

    # Make a HTTP POST request to add the tester to the Firebase App Distribution group
    path='https://firebaseappdistribution.googleapis.com/v1/projects/160735283718/groups/all-testers:batchJoin'
    body={'emails': [email], 'createMissingTesters': 'true'}
    headers={'Authorization': 'Bearer ' + token.access_token}
    response = requests.post(path, json=body, headers=headers)

    # Check if the request was successful
    if response.status_code != 200:
        return https_fn.Response(f"Failed to make POST request: {response.text}", status=response.status_code)
    else:
        return https_fn.Response(f"Successfully added Quickshop tester: {email}", status=200)