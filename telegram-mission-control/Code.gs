/**
 * ATLAS — Telegram → Mission Control Capture Bot
 * =================================================
 * Single-file Google Apps Script Web App.
 *
 * WHAT IT DOES
 *   PART 1 (inbound capture): Jeff sends the bot a message on Telegram. The
 *     bot verifies the sender, turns the message into a clean task line, and
 *     writes a new row to the Notion "Mission Control" database as Queued.
 *     Then it replies "Got it — logged: ...".
 *   PART 2 (outbound report): Jeff sends "where are we" (case-insensitive,
 *     minor variations OK). The bot queries Mission Control and replies with
 *     a plain OPEN / RUNNING + DONE THIS WEEK summary.
 *
 * SECURITY: single user only. Every inbound message's chat_id is checked
 *   against JEFF_CHAT_ID. Anything else is ignored silently — no processing,
 *   no logging of the rejected sender's content.
 *
 * SECRETS: nothing is hardcoded. The bot token and Notion token live in
 *   Script Properties (Project Settings → Script properties). See README.md
 *   for the exact runbook.
 *
 * MISSION CONTROL SCHEMA (verified live — do not assume other fields exist):
 *   Command   (title)        -> the task line. Telegram captures are prefixed
 *                               with "[Telegram] " so the origin is visible.
 *   Status    (select)       -> one of Queued | Running | Done | Failed.
 *                               New captures are written as "Queued".
 *   Result    (text)         -> outcome, written back by Max. We DO NOT touch
 *                               it on capture, so the courier loop owns it.
 *   Timestamp (created_time) -> auto-set by Notion on row creation. This is
 *                               the "Created" timestamp; nothing to set.
 *
 * VOICE: not enabled in this build (text-only). transcribeVoice_() is a
 *   clearly marked stub — drop in Whisper or Google STT later without
 *   touching anything else. See the big comment block on that function.
 */

// ============================================================================
// CONFIG
// ============================================================================

// Mission Control database id (verified live). Can be overridden by a
// Script Property named NOTION_DB_ID if the database ever moves.
var DEFAULT_NOTION_DB_ID = 'dd9dde46-ff20-4d28-894a-1773f40d257f';

// Published Web App /exec URL (Version 3, access "Anyone", execute as owner).
// This is the endpoint Telegram MUST post to. NEVER register the /dev URL —
// it is owner-only and returns 401 to Telegram's anonymous POSTs. A Script
// Property named WEB_APP_URL overrides this if the deployment URL ever changes.
var DEFAULT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxDICzBcYBxkSUNzkxFIknmi8uKsf8alpCuIs9LO8YNAVWPopU2BYkyUvgnkmw6xALWVw/exec';

// Notion REST API version. 2022-06-28 is stable and works with a plain
// database_id parent — same surface the existing courier integration uses.
var NOTION_VERSION = '2022-06-28';

// How far back "DONE THIS WEEK" looks, in days.
var DONE_WINDOW_DAYS = 7;

// Prefix stamped onto the Command text so Telegram-origin rows are obvious
// at a glance in Mission Control (no schema change required).
var ORIGIN_TAG = '[Telegram] ';

// ============================================================================
// PART 0 — WEB APP ENTRY POINTS
// ============================================================================

/**
 * Health check. Visiting the /exec URL in a browser returns "OK" so you can
 * confirm the deployment is live before wiring up Telegram.
 */
function doGet(e) {
  return ContentService
    .createTextOutput('OK — Mission Control capture bot is deployed.')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Telegram webhook receiver. Telegram POSTs every update here as JSON.
 * We ALWAYS return HTTP 200 quickly so Telegram does not retry/queue.
 * All real work is wrapped in try/catch so one bad update never wedges the bot.
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ok_();
    }

    var update = JSON.parse(e.postData.contents);

    // We only care about plain messages. Ignore edited messages, channel
    // posts, callback queries, etc. — they are not part of the capture flow.
    var message = update.message;
    if (!message || !message.chat) {
      return ok_();
    }

    // ---- SINGLE-USER LOCK ----------------------------------------------
    // Reject anyone who is not Jeff. Silent: no reply, no logging of content.
    var chatId = String(message.chat.id);
    var allowed = prop_('JEFF_CHAT_ID');
    if (!allowed || chatId !== String(allowed)) {
      return ok_(); // silently ignore
    }

    // ---- ROUTE ----------------------------------------------------------
    if (message.text && isWhereAreWe_(message.text)) {
      handleWhereAreWe_(chatId);
      return ok_();
    }

    if (message.voice || message.audio) {
      handleVoice_(message, chatId);
      return ok_();
    }

    if (message.text) {
      handleTask_(message.text, chatId);
      return ok_();
    }

    // Any other message type (photo, sticker, document, ...) — not supported
    // for capture. Tell Jeff plainly rather than silently dropping it.
    tgSendMessage_(chatId,
      'I can only capture text right now (voice is coming later). ' +
      'Send the task as a text message.');
    return ok_();

  } catch (err) {
    // Never throw back to Telegram. Log for debugging (Executions view).
    try { console.error('doPost error: ' + (err && err.stack ? err.stack : err)); } catch (_) {}
    return ok_();
  }
}

function ok_() {
  return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
}

// ============================================================================
// PART 1 — INBOUND CAPTURE (Telegram -> Mission Control)
// ============================================================================

/**
 * Handle a text task: clean it, write it to Mission Control as Queued,
 * confirm back to Jeff.
 */
function handleTask_(rawText, chatId) {
  var taskLine = summarizeTask_(rawText);
  if (!taskLine) {
    tgSendMessage_(chatId, "I couldn't read a task in that — try again?");
    return;
  }

  var command = ORIGIN_TAG + taskLine;
  notionCreateTask_(command);

  tgSendMessage_(chatId, 'Got it — logged: ' + taskLine);
}

/**
 * Handle a voice/audio message.
 *
 * Text-only build: transcribeVoice_() returns null, so we tell Jeff voice
 * isn't enabled yet and capture nothing. The MOMENT transcribeVoice_() is
 * implemented to return a transcript string, this function automatically
 * starts capturing voice notes — no other change needed.
 */
function handleVoice_(message, chatId) {
  var voice = message.voice || message.audio;
  var fileId = voice && voice.file_id;

  var transcript = transcribeVoice_(fileId); // null while voice is disabled

  if (!transcript) {
    tgSendMessage_(chatId,
      "Voice capture isn't switched on yet — send the task as text for now.");
    return;
  }

  // ---- This path activates automatically once transcription is wired in ---
  var taskLine = summarizeTask_(transcript);
  if (!taskLine) {
    tgSendMessage_(chatId, "I couldn't make out a task in that voice note — try again?");
    return;
  }

  var command = ORIGIN_TAG + taskLine;
  notionCreateTask_(command);
  tgSendMessage_(chatId, 'Got it — logged: ' + taskLine);
}

/**
 * Turn a raw human sentence into a clean, plain task line.
 *   "I need to remember to pay the DTE bill" -> "Pay DTE bill"
 *
 * Pure string work — NO external service, so it honors "no new paid
 * services". It strips common filler lead-ins, collapses whitespace,
 * trims trailing punctuation, and capitalizes the first letter.
 *
 * This is intentionally conservative: if it doesn't recognize filler it
 * leaves the text alone rather than mangling intent.
 */
function summarizeTask_(raw) {
  var t = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';

  // Strip leading filler phrases, repeatedly (handles stacked filler like
  // "ok so I need to remember to ...").
  var fillers = [
    /^(ok(ay)?|so|um+|uh+|hey|yeah|well|alright)\b[,:\s]*/i,
    /^(i\s+(need|have|want|gotta|got)\s+to\s+)/i,
    /^(i\s+need\s+to\s+remember\s+to\s+)/i,
    /^(remember\s+to\s+)/i,
    /^(remind\s+me\s+to\s+)/i,
    /^(don'?t\s+forget\s+to\s+)/i,
    /^(make\s+sure\s+(to|i|we)\s+)/i,
    /^(can\s+you\s+|could\s+you\s+|please\s+)/i,
    /^(let'?s\s+)/i,
    /^(we\s+(need|have|gotta)\s+to\s+)/i
  ];
  var changed = true;
  while (changed) {
    changed = false;
    for (var i = 0; i < fillers.length; i++) {
      var next = t.replace(fillers[i], '');
      if (next !== t) { t = next.trim(); changed = true; }
    }
  }

  if (!t) return '';

  // Trim a single trailing period (keep ? and ! — they may carry intent),
  // then capitalize the first character.
  t = t.replace(/\s*\.\s*$/, '');
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return t;
}

/**
 * VOICE TRANSCRIPTION HOOK — NOT YET ENABLED (text-only build).
 * ============================================================================
 * Contract: given a Telegram voice file_id, return the transcript as a string,
 * or return null/'' to signal "voice is disabled". While this returns null,
 * the bot is text-only and tells Jeff so.
 *
 * TO ENABLE LATER (clean drop-in — change ONLY this function):
 *   1. Add the provider's API key to Script Properties (e.g. OPENAI_API_KEY).
 *   2. Uncomment one reference block below and return the transcript.
 *   3. Done. handleVoice_() already does getFile->summarize->log->confirm.
 *
 * ---- OPTION A: OpenAI Whisper -----------------------------------------------
 *   var key = prop_('OPENAI_API_KEY');
 *   var blob = tgDownloadFile_(fileId);              // OGG/OPUS bytes
 *   var resp = UrlFetchApp.fetch('https://api.openai.com/v1/audio/transcriptions', {
 *     method: 'post',
 *     headers: { Authorization: 'Bearer ' + key },
 *     payload: { file: blob, model: 'whisper-1' },   // multipart auto-built
 *     muteHttpExceptions: true
 *   });
 *   return JSON.parse(resp.getContentText()).text;
 *
 * ---- OPTION B: Google Cloud Speech-to-Text ----------------------------------
 *   var key = prop_('GOOGLE_STT_API_KEY');
 *   var blob = tgDownloadFile_(fileId);
 *   var b64  = Utilities.base64Encode(blob.getBytes());
 *   var body = {
 *     config: { encoding: 'OGG_OPUS', sampleRateHertz: 48000, languageCode: 'en-US' },
 *     audio:  { content: b64 }
 *   };
 *   var resp = UrlFetchApp.fetch('https://speech.googleapis.com/v1/speech:recognize?key=' + key, {
 *     method: 'post', contentType: 'application/json',
 *     payload: JSON.stringify(body), muteHttpExceptions: true
 *   });
 *   var r = JSON.parse(resp.getContentText());
 *   return (r.results || []).map(function (x) { return x.alternatives[0].transcript; }).join(' ');
 * ============================================================================
 */
function transcribeVoice_(fileId) {
  return null; // voice disabled in this build
}

// ============================================================================
// PART 2 — OUTBOUND REPORT ("where are we")
// ============================================================================

/**
 * Decide whether a message is the "where are we" status command rather than a
 * task to capture. Case-insensitive, tolerant of minor variations:
 *   "where are we", "where are we at", "where r we", "where we at",
 *   "where do we stand", "Where Are We?!" ...
 * Rule: starts with "where" AND mentions "we". Tight enough to not swallow
 * real tasks, loose enough for natural phrasing.
 */
function isWhereAreWe_(text) {
  var t = String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return false;
  return /^where\b/.test(t) && /\bwe\b/.test(t);
}

/**
 * Build and send the status report.
 *   OPEN / RUNNING : Status is Queued or Running (the "not Done" work)
 *   DONE THIS WEEK : Status is Done AND last edited within DONE_WINDOW_DAYS
 *   FAILED         : Status is Failed (only shown if any exist — failures
 *                    should never be silently hidden from a status check)
 *
 * Note on "completed within last 7 days": Mission Control has no explicit
 * completion-time field, so we use Notion's built-in last_edited_time as the
 * proxy — the row is last edited when Max flips it to Done. Closest available
 * signal to "when it finished".
 */
function handleWhereAreWe_(chatId) {
  var openRows = notionQuery_({
    filter: {
      or: [
        { property: 'Status', select: { equals: 'Queued' } },
        { property: 'Status', select: { equals: 'Running' } }
      ]
    },
    sorts: [{ timestamp: 'created_time', direction: 'ascending' }]
  });

  var sinceIso = new Date(Date.now() - DONE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  var doneRows = notionQuery_({
    filter: {
      and: [
        { property: 'Status', select: { equals: 'Done' } },
        { timestamp: 'last_edited_time', last_edited_time: { on_or_after: sinceIso } }
      ]
    },
    sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }]
  });

  var failedRows = notionQuery_({
    filter: { property: 'Status', select: { equals: 'Failed' } },
    sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }]
  });

  tgSendMessage_(chatId, formatReport_(openRows, doneRows, failedRows));
}

/**
 * Assemble the plain-text report. No Notion jargon, no row IDs. Empty
 * sections are omitted entirely; if everything is empty, say so plainly.
 */
function formatReport_(openRows, doneRows, failedRows) {
  var open = openRows.map(rowTitle_).filter(String);
  var done = doneRows.map(rowTitle_).filter(String);
  var failed = failedRows.map(rowTitle_).filter(String);

  if (!open.length && !done.length && !failed.length) {
    return '📍 Where we are\n\nAll clear — nothing open and nothing completed in the last ' +
      DONE_WINDOW_DAYS + ' days.';
  }

  var parts = ['📍 Where we are'];

  if (open.length) {
    parts.push('\nOPEN / RUNNING\n' + open.map(bullet_).join('\n'));
  }
  if (done.length) {
    parts.push('\nDONE THIS WEEK\n' + done.map(bullet_).join('\n'));
  }
  if (failed.length) {
    parts.push('\n⚠️ FAILED\n' + failed.map(bullet_).join('\n'));
  }

  return parts.join('\n');
}

function bullet_(line) { return '• ' + line; }

/** Pull the Command (title) text out of a Notion page object, as plain text. */
function rowTitle_(page) {
  try {
    var title = page.properties.Command.title || [];
    var text = title.map(function (t) { return t.plain_text || (t.text && t.text.content) || ''; }).join('').trim();
    return text;
  } catch (e) {
    return '';
  }
}

// ============================================================================
// NOTION API
// ============================================================================

/** Create a Queued task row in Mission Control. */
function notionCreateTask_(commandText) {
  var body = {
    parent: { database_id: notionDbId_() },
    properties: {
      Command: { title: [{ text: { content: commandText } }] },
      Status: { select: { name: 'Queued' } }
      // Result: left untouched — Max owns it.
      // Timestamp: created_time, auto-set by Notion.
    }
  };

  var resp = UrlFetchApp.fetch('https://api.notion.com/v1/pages', {
    method: 'post',
    contentType: 'application/json',
    headers: notionHeaders_(),
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });

  var code = resp.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Notion create failed (' + code + '): ' + resp.getContentText());
  }
  return JSON.parse(resp.getContentText());
}

/**
 * Query Mission Control. Accepts a filter/sorts object (Notion query body).
 * Returns the array of page objects (handles pagination up to a sane cap).
 */
function notionQuery_(queryBody) {
  var url = 'https://api.notion.com/v1/databases/' + notionDbId_() + '/query';
  var results = [];
  var cursor = null;
  var guard = 0;

  do {
    var body = {};
    for (var k in queryBody) body[k] = queryBody[k];
    body.page_size = 100;
    if (cursor) body.start_cursor = cursor;

    var resp = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: notionHeaders_(),
      payload: JSON.stringify(body),
      muteHttpExceptions: true
    });

    var code = resp.getResponseCode();
    if (code < 200 || code >= 300) {
      throw new Error('Notion query failed (' + code + '): ' + resp.getContentText());
    }

    var data = JSON.parse(resp.getContentText());
    results = results.concat(data.results || []);
    cursor = data.has_more ? data.next_cursor : null;
    guard++;
  } while (cursor && guard < 20);

  return results;
}

function notionHeaders_() {
  var token = prop_('NOTION_TOKEN');
  if (!token) throw new Error('NOTION_TOKEN is not set in Script Properties.');
  return {
    Authorization: 'Bearer ' + token,
    'Notion-Version': NOTION_VERSION
  };
}

function notionDbId_() {
  return prop_('NOTION_DB_ID') || DEFAULT_NOTION_DB_ID;
}

// ============================================================================
// TELEGRAM API
// ============================================================================

function tgSendMessage_(chatId, text) {
  var token = prop_('TELEGRAM_BOT_TOKEN');
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set in Script Properties.');
  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text: text, disable_web_page_preview: true }),
    muteHttpExceptions: true
  });
}

/**
 * Download a Telegram file (by file_id) as a Blob. Used by the voice path
 * once transcription is enabled. Two-step: getFile -> download file_path.
 */
function tgDownloadFile_(fileId) {
  var token = prop_('TELEGRAM_BOT_TOKEN');
  var info = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getFile?file_id=' +
    encodeURIComponent(fileId), { muteHttpExceptions: true });
  var path = JSON.parse(info.getContentText()).result.file_path;
  var file = UrlFetchApp.fetch('https://api.telegram.org/file/bot' + token + '/' + path,
    { muteHttpExceptions: true });
  return file.getBlob();
}

// ============================================================================
// SETUP HELPERS — run these by hand from the Apps Script editor (see README)
// ============================================================================

/**
 * STEP A — capture your chat_id.
 * Message the bot from Telegram FIRST, then run this. It prints the chat id
 * and name of whoever has messaged the bot recently. Copy your numeric id
 * into Script Properties as JEFF_CHAT_ID.
 *
 * NOTE: getUpdates does not work while a webhook is registered. Run this
 * BEFORE setup_registerWebhook (or run setup_deleteWebhook first).
 */
function setup_showChatIds() {
  var token = prop_('TELEGRAM_BOT_TOKEN');
  if (!token) { Logger.log('Set TELEGRAM_BOT_TOKEN in Script Properties first.'); return; }
  var resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getUpdates',
    { muteHttpExceptions: true });
  var data = JSON.parse(resp.getContentText());
  if (!data.ok) { Logger.log('Telegram error: ' + resp.getContentText()); return; }
  if (!data.result.length) {
    Logger.log('No recent messages. Open Telegram, send the bot any message, then run this again.');
    return;
  }
  var seen = {};
  data.result.forEach(function (u) {
    var m = u.message || u.edited_message;
    if (m && m.chat && !seen[m.chat.id]) {
      seen[m.chat.id] = true;
      var who = (m.chat.first_name || '') + ' ' + (m.chat.last_name || '') +
        (m.chat.username ? ' (@' + m.chat.username + ')' : '');
      Logger.log('chat_id = ' + m.chat.id + '   from: ' + who.trim());
    }
  });
  Logger.log('--> Copy YOUR chat_id above into Script Properties as JEFF_CHAT_ID.');
}

/**
 * STEP B — register the Telegram webhook to THIS deployment.
 *
 * CRITICAL: register the PUBLISHED /exec URL, never the /dev URL.
 *   - /exec = the deployed web app. Honors "Anyone / anonymous". What Telegram needs.
 *   - /dev  = the head/test URL. OWNER-ONLY. Anonymous POSTs (Telegram) get 401,
 *             so doPost never runs and pending_update_count climbs.
 *
 * We do NOT trust ScriptApp.getService().getUrl() here: when this function is
 * run from the editor (the normal way), getUrl() returns the /dev URL — which
 * is exactly the 401 trap. Instead, paste the /exec URL from
 * Deploy -> Manage deployments into a Script Property named WEB_APP_URL, then
 * run this. The function refuses to register anything that isn't an /exec URL.
 */
function setup_registerWebhook() {
  var token = prop_('TELEGRAM_BOT_TOKEN');
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set in Script Properties.');

  // Resolve the /exec URL from the WEB_APP_URL property, falling back to the
  // baked-in default. We deliberately DO NOT use ScriptApp.getService().getUrl()
  // — from the editor it returns the owner-only /dev URL, which is the exact
  // 401 trap this whole helper exists to prevent.
  var url = webAppUrl_();

  // Hard guard: refuse to ever register a non-/exec (e.g. /dev) URL. Throwing
  // makes the failure loud in the execution log instead of silently "ok".
  if (url.slice(-5) !== '/exec' || url.indexOf('/dev') !== -1) {
    throw new Error('REFUSING to register a non-/exec URL: "' + url + '". ' +
      'The /dev URL is owner-only and returns 401 to Telegram. Set WEB_APP_URL ' +
      'to the /exec URL from Deploy -> Manage deployments.');
  }

  var resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/setWebhook', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      url: url,
      allowed_updates: ['message'],
      drop_pending_updates: true
    }),
    muteHttpExceptions: true
  });
  Logger.log('Registered webhook URL: ' + url);
  Logger.log('setWebhook response: ' + resp.getContentText());
}

/** The published /exec URL Telegram must post to. Property overrides default. */
function webAppUrl_() {
  return prop_('WEB_APP_URL') || DEFAULT_WEB_APP_URL;
}

/**
 * DIAGNOSTIC — run this to confirm the /dev-vs-/exec root cause of a 401.
 * Prints what getUrl() returns, what you've set in WEB_APP_URL, and — most
 * importantly — the URL Telegram is CURRENTLY posting to. If that ends in
 * /dev, that is your 401.
 */
function setup_diagnoseWebhook() {
  Logger.log('getService().getUrl() = ' + ScriptApp.getService().getUrl() +
    '   (from the editor this is usually the /dev URL — do not register it)');
  Logger.log('WEB_APP_URL property  = ' + (prop_('WEB_APP_URL') || '(not set — using baked-in default)'));
  Logger.log('URL that will be registered = ' + webAppUrl_());

  var token = prop_('TELEGRAM_BOT_TOKEN');
  if (!token) { Logger.log('TELEGRAM_BOT_TOKEN not set.'); return; }
  var resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getWebhookInfo',
    { muteHttpExceptions: true });
  var info = JSON.parse(resp.getContentText());
  var registered = info.result && info.result.url;
  Logger.log('Telegram is posting to: ' + registered);
  if (registered && registered.indexOf('/dev') !== -1) {
    Logger.log('>>> ROOT CAUSE CONFIRMED: registered URL ends in /dev (owner-only -> 401).');
    Logger.log('>>> Set WEB_APP_URL to the /exec URL and run setup_registerWebhook.');
  } else if (registered && registered.slice(-5) === '/exec') {
    Logger.log('Registered URL ends in /exec (correct). If still 401, re-check');
    Logger.log('"Who has access = Anyone" on the deployment that owns THIS /exec URL.');
  }
  Logger.log('last_error_message: ' + (info.result && info.result.last_error_message || '(none)'));
  Logger.log('pending_update_count: ' + (info.result && info.result.pending_update_count));
}

/** Check current webhook status (handy for debugging). */
function setup_getWebhookInfo() {
  var token = prop_('TELEGRAM_BOT_TOKEN');
  var resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getWebhookInfo',
    { muteHttpExceptions: true });
  Logger.log(resp.getContentText());
}

/** Remove the webhook (e.g. to re-run setup_showChatIds). */
function setup_deleteWebhook() {
  var token = prop_('TELEGRAM_BOT_TOKEN');
  var resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/deleteWebhook',
    { muteHttpExceptions: true });
  Logger.log(resp.getContentText());
}

/** Print the bot's identity (username) — useful for the report-back. */
function setup_whoAmI() {
  var token = prop_('TELEGRAM_BOT_TOKEN');
  var resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getMe',
    { muteHttpExceptions: true });
  Logger.log(resp.getContentText());
}

/**
 * OPTIONAL end-to-end self-test (no Telegram needed): writes a throwaway
 * Queued row to Mission Control, then reads back the open list. Use only if
 * you want to confirm the Notion wiring before going live. WARNING: this
 * creates a real Queued row that the courier loop may pick up — the command
 * text says TEST and asks for no action.
 */
function setup_testNotionWrite() {
  var page = notionCreateTask_(ORIGIN_TAG + 'TEST capture — no action needed');
  Logger.log('Created test row: ' + page.id);
  var open = notionQuery_({
    filter: { or: [
      { property: 'Status', select: { equals: 'Queued' } },
      { property: 'Status', select: { equals: 'Running' } }
    ] }
  });
  Logger.log('Open/running rows now: ' + open.length);
}

// ============================================================================
// UTIL
// ============================================================================

function prop_(name) {
  return PropertiesService.getScriptProperties().getProperty(name);
}
