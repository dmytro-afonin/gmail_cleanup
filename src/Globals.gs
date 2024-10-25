// define how old emails shoulb be in search results
const DEFAULT_OLDER_THAN_UNIT = 'y';
const DEFAULT_OLDER_THAN_VALUE = '4';

const DEFAULT_REMOVE_IMPORTANT = 'false';
const DEFAULT_REMOVE_STARRED = 'false';
const DEFAULT_REMOVE_UNREAD = 'false';

// define how to handle threads which are still active
const RESOLVE_STRATEGY_SKIP = 'skip';
const RESOLVE_STRATEGY_REMOVE_MESSAGES = 'remove_messages';
const DEFAULT_ACTIVE_THREAD_RESOLVE_STRATEGY = RESOLVE_STRATEGY_SKIP;

// extra flags for search
const DEFAULT_EXCLUDE_FOLDERS = ['trash'];

// advanced settings, impact script chunk search behaviour
const DEFAULT_MAX_SEARCH_COUNT = 500;
const DEFAULT_MAX_DELETE_COUNT = 100;

// keys for user properties access. Avoiding using hard-coded values
const OLDER_THAN_UNIT_KEY = 'OLDER_THAN_UNIT';
const OLDER_THAN_VALUE_KEY = 'OLDER_THAN_VALUE';
const ACTIVE_THREAD_RESOLVE_STRATEGY_KEY = 'ACTIVE_THREAD_RESOLVE_STRATEGY';
const REMOVE_IMPORTANT_KEY = 'REMOVE_IMPORTANT';
const REMOVE_STARRED_KEY = 'REMOVE_STARRED';
const REMOVE_UNREAD_KEY = 'REMOVE_UNREAD';

function getDefaults() {
  return {
    [OLDER_THAN_UNIT_KEY]: DEFAULT_OLDER_THAN_UNIT,
    [OLDER_THAN_VALUE_KEY]: DEFAULT_OLDER_THAN_VALUE,
    [ACTIVE_THREAD_RESOLVE_STRATEGY_KEY]: DEFAULT_ACTIVE_THREAD_RESOLVE_STRATEGY,
    [REMOVE_IMPORTANT_KEY]: DEFAULT_REMOVE_IMPORTANT,
    [REMOVE_STARRED_KEY]: DEFAULT_REMOVE_STARRED,
    [REMOVE_UNREAD_KEY]: DEFAULT_REMOVE_UNREAD
  }
}

function initUser(userProps) {
  userProps.setProperties({
    ...getDefaults(),
    'RUN_STATUS': 'NEW',
    'RUN_MESSAGES_DELETED_TOTAL': '0',
    'RUN_THREADS_DELETED_TOTAL': '0',
    'RUN_THREADS_REVIWED_TOTAL': '0'
  });
}

function getOldMessagesFromThread(thread, pastTime) {
  Logger.log(`encouter long-living thread with fresh messages: ${thread.getId()}`);
  const messages = thread.getMessages();
  return messages.filter(m => m.getDate().getTime() <= pastTime);
}

function removeMessages(messagesToDelete, totalRemoved, userProps) {
  GmailApp.moveMessagesToTrash(messagesToDelete);
  totalRemoved += messagesToDelete.length;
  Logger.log(`messages removed: ${totalRemoved}`);
  userProps.setProperty('RUN_MESSAGES_DELETED', `${totalRemoved}`);
  return totalRemoved;
}

function removeThreads(threadsToDelete, totalRemoved, userProps) {
  GmailApp.moveThreadsToTrash(threadsToDelete);
  totalRemoved += threadsToDelete.length;
  Logger.log(`threads removed: ${totalRemoved}`);
  userProps.setProperty('RUN_THREADS_DELETED', `${totalRemoved}`);
  return totalRemoved;
}

function getThreads(query, start, maxCount) {
  Logger.log(`quering threads query: ${query}, start: ${start}, max: ${maxCount}`);
  const threads = GmailApp.search(query, start, maxCount);
  Logger.log(`${threads.length} threads found. Handling batch removal...`);
  return threads;
}

function getPastDateTime(unit, value) {
  const date = new Date();
  switch(unit) {
    case 'd': {
      date.setDate(date.getDate() - value);
      break;
    }
    case 'm': {
      date.setMonth(date.getMonth() - value);
      break;
    }
    case 'y':
    default: {
      date.setFullYear(date.getFullYear() - value);
      break;
    }
  }
  return date.getTime();
}

function createSearchAttrs(props) {
  console.log({props});
    const PAST_TIME = getPastDateTime(props[OLDER_THAN_UNIT_KEY], props[OLDER_THAN_VALUE_KEY]);
    const LABEL_NAME = `hasNewMessages${PAST_TIME}`;
    let QUERY = `older_than:${props[OLDER_THAN_VALUE_KEY]}${props[OLDER_THAN_UNIT_KEY]} -in:trash -label:${LABEL_NAME}`;

    if (props[REMOVE_IMPORTANT_KEY] !== 'true') {
      QUERY += ' -is:important';
    }

    if (props[REMOVE_STARRED_KEY] !== 'true') {
      QUERY += ' -is:starred';
    }

    if (props[REMOVE_UNREAD_KEY] !== 'true') {
      QUERY += ' -is:unread';
    }

    return {
      PAST_TIME,
      LABEL_NAME,
      QUERY
    }
}

// run emails deletion
function deleteOldEmails(config, userProps) {
  try {
    const MAX_SEARCH_COUNT = DEFAULT_MAX_SEARCH_COUNT; // google restricted search by 500 at max
    const MAX_DELETE_COUNT = DEFAULT_MAX_DELETE_COUNT; // google restricted delete by 100 at max
    const START_FROM = 0;
    const {PAST_TIME, LABEL_NAME, QUERY} = createSearchAttrs(config, userProps);

    userProps.setProperties({
      'RUN_STATUS': 'STARTED',
      'RUN_QUERY': QUERY,
      'RUN_MAX_SEARCH_COUNT': `${MAX_SEARCH_COUNT}`,
      'RUN_MAX_DELETE_COUNT': `${MAX_DELETE_COUNT}`,
      'RUN_MESSAGES_DELETED': '0',
      'RUN_THREADS_DELETED': '0',
      'RUN_THREADS_REVIWED': '0'
    });

    let oldMessages = [];
    let threadsToDelete = [];
    let threadsReviewed = 0;
    let threadsRemoved = 0;
    let messagesRemoved = 0;
    let lastSearchHadThreads = true;
    let label;

    do {
      const threads = getThreads(QUERY, START_FROM, MAX_SEARCH_COUNT);
      lastSearchHadThreads = threads.length === MAX_SEARCH_COUNT;

      for (const i in threads) {
        const t = threads[i];
        const date = t.getLastMessageDate();

        if (date.getTime() > PAST_TIME) {
          const oldThreadMessages = getOldMessagesFromThread(t, PAST_TIME);
          oldMessages.push(...oldThreadMessages);

          while (oldMessages.length >= MAX_DELETE_COUNT) {
            const messagesToDelete = oldMessages.splice(0, MAX_DELETE_COUNT);
            messagesRemoved = removeMessages(messagesToDelete, messagesRemoved, userProps);
          }

          if (!label && lastSearchHadThreads) { // only create label if we are expect to continue searching
            label = GmailApp.createLabel(LABEL_NAME);
          }
          if (label) {
            t.addLabel(label);
          }
        } else {
          threadsToDelete.push(t);
          if (threadsToDelete.length === MAX_DELETE_COUNT) {
            threadsRemoved = removeThreads(threadsToDelete, threadsRemoved, userProps);
            threadsToDelete = [];
          }
        }
      }

      threadsReviewed += threads.length;

    } while (lastSearchHadThreads);

    if (oldMessages.length) {
      removeMessages(oldMessages, messagesRemoved, userProps);
    }

    if (threadsToDelete.length) {
      removeThreads(threadsToDelete, threadsRemoved, userProps);
    }

    if (label) {
      GmailApp.deleteLabel(label);
    }

    Logger.log(`threads reviewed: ${threadsReviewed}`);

    const props = userProps.getProperties();

    userProps.setProperties({
      'RUN_STATUS': 'FINISHED',
      'RUN_THREADS_REVIWED': `${threadsReviewed}`,
      'RUN_MESSAGES_DELETED_TOTAL': `${+props.RUN_MESSAGES_DELETED + +props.RUN_MESSAGES_DELETED_TOTAL}`,
      'RUN_THREADS_DELETED_TOTAL': `${+props.RUN_THREADS_DELETED + +props.RUN_THREADS_DELETED_TOTAL}`,
      'RUN_THREADS_REVIWED_TOTAL': `${threadsReviewed + +props.RUN_THREADS_REVIWED_TOTAL}`
    });
  } catch (e) {
    userProps.setProperty('RUN_STATUS', 'ERROR');
    throw e;
  }
}
