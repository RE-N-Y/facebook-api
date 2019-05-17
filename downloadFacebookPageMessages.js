'use strict';

const fs = require('fs').promises;

const request = require('request-promise-native');
const FB = require('fb');
const options = FB.options({version: 'v3.3'});
const fb = new FB.Facebook(options);

/* Obtained from https://www.facebook.com/pg/ZhennovateUWC/about/. */
const FACEBOOK_PAGE_ID = '366767477271199';

const OUTPUT_DIRECTORY = 'Conversations';
const LOCALE = 'en-US';

/* Mountain Time */
const TIME_ZONE = 'America/Denver';

/* The maximum number of elements to pull down per Graph API call; Facebook may
 * send fewer.
 */
const LIMIT = 99999;

/* Returns the name of the participant in the given conversation that isn't our
 * Facebook page.
 */
function getParticipantName(conversation) {
  let participant = conversation.participants.data.find((p) => {
    return p.id != FACEBOOK_PAGE_ID;
  });
  return participant.name;
}

/* Recursively appends the remaining pages of a paginated Graph API
 * call to the nodes array and returns it. This could take a very long time if
 * there are a lot of pages left.
 */
async function getRestOfPages(nodes, currPage) {
  let next = currPage.paging.next;
  if (!next) {
    return nodes;
  }
  /* TODO: Eliminate dependency on request-promise-native by using fb.api()
   * instead.
   */
  let nextPage = await request.get(next, {json: true});
  nodes.push(...nextPage.data);
  return getRestOfPages(nodes, nextPage);
}

/* Appends any additional pages of data to the initial response to a Graph API
 * call. This could take a very long time if there are a lot of pages.
 */
async function pushAllPages(firstPage) {
  return getRestOfPages(firstPage.data, firstPage);
}

/* Returns all of the private conversations with our Facebook page. */
async function getConversations() {
  let conversations = await fb.api(`${FACEBOOK_PAGE_ID}/conversations`,
                                   {limit: LIMIT});
  return pushAllPages(conversations);
}

/* Returns an Array of two-element Arrays, each composed of the name of a user
 * who has messaged our Facebook page and an Array of all messages in their
 * conversation in chronological order. Assumes the given conversations are the
 * result of a call to the conversations Graph API.
 */
async function getMessagesByConversation(conversations) {
  return Promise.all(conversations.map(async (c) => {
    let conversation = await fb.api(c.id, {
      fields: 'messages{from, created_time, message, ' +
              'shares{name, description, link}}, participants',
      limit: LIMIT,
    });
    let participantName = getParticipantName(conversation);
    /* Ignore the fact that shares are paged separately so we don't exceed our
     * Graph API rate limit.
     */
    let messages = await pushAllPages(conversation.messages);
    /* The Graph API returns messages in reverse chronological order. */
    messages.reverse();
    return [participantName, messages];
  }));
}

/* Writes the given conversations, as returned by getMessagesByConversation(),
 * to a .txt file named after the participant.
 */
async function writeConversations(conversations) {
  for (let conversation of conversations) {
    let [participantName, messages] = conversation;
    let conversationArray = await messages.reduce(async (promise, message) => {
      let lines = await promise;
      let date = new Date(message.created_time);
      let dateStr = date.toLocaleString(LOCALE, {timeZone: TIME_ZONE});
      lines.push(`${message.from.name} (${dateStr}): ${message.message}`);
      if (message.shares) {
        for (let share of message.shares.data) {
          let shareArray = [];
          if (share.name) {
            shareArray.push(share.name);
          }
          if (share.description) {
            shareArray.push(` (${share.description})`);
          }
          if (share.name || share.description) {
            shareArray.push(': ');
          }
          shareArray.push(share.link);
          let shareStr = shareArray.join('');
          lines.push(shareStr);
        }
      }
      return lines;
    }, Promise.resolve([]));
    let conversationStr = conversationArray.join('\n');

    let filePath = `${OUTPUT_DIRECTORY}/${participantName}.txt`;
    await fs.writeFile(filePath, conversationStr);
  }
}

/* Downloads all private conversations with our Facebook Page and saves them,
 * one file per user, in OUTPUT_DIRECTORY. This is highly private and
 * confidential information that should be carefully protected.
 */
async function downloadFacebookPageMessages(accessToken) {
  fb.setAccessToken(accessToken);
  await fs.mkdir(OUTPUT_DIRECTORY, {recursive: true});
  try {
    /* extract */
    let conversations = await getConversations();

    /* transform */
    let messagesByConversation = await getMessagesByConversation(conversations);

    /* load */
    return writeConversations(messagesByConversation);
  } catch (error) {
    console.error(error);
    if (error instanceof FB.FacebookApiException) {
      console.error('Verify that a valid Facebook Page API token for ' +
        `https://www.facebook.com/${FACEBOOK_PAGE_ID} was passed as first ` +
        'command line parameter.\nThe token may be obtained from ' +
        'https://developers.facebook.com/tools/explorer/.\nIt requires the ' +
        'pages_messaging permission and must be replaced when expired.');
    }
  }
}

downloadFacebookPageMessages(process.argv[2]);
