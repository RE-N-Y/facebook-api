# facebook-api

downloadFacebookPageMessages.js downloads all private conversations with our
Facebook Page and saves them, one file per user, in a ./Conversations/
directory. This is highly private and confidential information that should be
carefully protected.

## Setup

* Install or upgrade to Node.js v10.0.0+.
* Run `npm install`.

## Usage

* Obtain a valid Facebook Page API token for the appropriate Facebook Page
(e.g., https://www.facebook.com/ZhennovateUWC/) from
https://developers.facebook.com/tools/explorer/. Make sure to require the
pages_messaging permission, and replace the token when it expires.
* Run `node downloadFacebookPageMessages.js <auth_token>`.
