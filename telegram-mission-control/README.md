# Telegram → Mission Control Capture Bot

Capture tasks into Notion **Mission Control** by texting a Telegram bot from
anywhere. Ask **"where are we"** to get a live status report back. Runs 100% on
Google Apps Script — no Make, no third-party automation platform, no servers.

- **This build is text-only.** Voice is stubbed behind one function
  (`transcribeVoice_`) so Whisper or Google STT drops in later with no rebuild.
- **Single user.** Every inbound message is checked against your chat_id;
  anything else is ignored silently.
- **Secrets live in Script Properties**, never in the code.

You will do the deploy yourself at [script.google.com](https://script.google.com).
The steps below assume **zero** prior Apps Script experience. Follow them in
order; it takes about 10 minutes.

---

## What gets written to Mission Control

Verified against the live database schema — no fields were added.

| Mission Control field | What the bot does |
|---|---|
| **Command** (title) | The cleaned task line, prefixed with `[Telegram] ` so you see the origin at a glance. e.g. `[Telegram] Pay DTE bill` |
| **Status** (select)  | Set to **Queued** on capture. |
| **Result** (text)    | **Left untouched** — Max writes the outcome here. |
| **Timestamp** (created-time) | Auto-set by Notion. This is your "Created" stamp. |

The "where are we" report reads:
- **OPEN / RUNNING** — rows with Status `Queued` or `Running`.
- **DONE THIS WEEK** — rows with Status `Done`, last updated within 7 days.
- **⚠️ FAILED** — rows with Status `Failed` (only shown if any exist).

> Note: Mission Control has no "completed at" field, so "done this week" uses
> Notion's built-in *last edited time* — the row is last edited when Max flips
> it to Done, which is the closest available signal to "when it finished."

---

## Before you start — have these two tokens ready

1. **Telegram bot token** — from your local file
   `~/.batton/secrets/telegram-bot-token`. Open it and copy the whole string
   (looks like `123456789:AAignored-letters-and-numbers`).
2. **Notion integration token** — the **"Max Dispatch Courier"** integration
   token already driving the 5-minute courier loop. (Notion → Settings →
   Connections, or wherever that token is stored.) It starts with `secret_`
   or `ntn_`.

You will paste both into Script Properties in Step 3. They never go in the code.

---

## Step 1 — Create the Apps Script project

1. Go to **https://script.google.com** and sign in as the Google account that
   should own this bot.
2. Click **＋ New project** (top left). A code editor opens with a file called
   `Code.gs` containing a stub `myFunction`.
3. In the left sidebar, the **Editor** icon (`< >`) should be selected.

## Step 2 — Paste in the code

1. In the editor, select **all** the existing text in `Code.gs`
   (click in the editor, `Ctrl/Cmd + A`) and delete it.
2. Open **`Code.gs`** from this folder, copy its entire contents, and paste it
   into the editor.
3. Click the **floppy-disk Save** icon (or `Ctrl/Cmd + S`).
4. Rename the project: click **"Untitled project"** at the top, name it
   `Mission Control Capture Bot`, click **Rename**.

*(Optional but recommended — set the manifest so the web app permissions match
this repo's `appsscript.json`:)*

5. Click the **gear ⚙ (Project Settings)** in the left sidebar.
6. Tick **"Show 'appsscript.json' manifest file in editor"**.
7. Back in the **Editor**, open the now-visible `appsscript.json`, select all,
   delete, and paste in the contents of `appsscript.json` from this folder.
   Save.

## Step 3 — Add your secrets (Script Properties)

1. Click the **gear ⚙ (Project Settings)** in the left sidebar.
2. Scroll to **Script Properties** → click **Add script property**.
3. Add these properties (click **Add script property** again for each row):

   | Property name | Value |
   |---|---|
   | `TELEGRAM_BOT_TOKEN` | *(paste the Telegram token from Step "Before you start")* |
   | `NOTION_TOKEN` | *(paste the Max Dispatch Courier integration token)* |

   You will add `JEFF_CHAT_ID` in Step 5.

   *(The Mission Control database id is already baked into the code. Only add a
   `NOTION_DB_ID` property if the database ever moves.)*

4. Click **Save script properties**.

> **Make sure the Notion integration can see Mission Control.** In Notion, open
> the Mission Control database → top-right **•••** → **Connections** → confirm
> **Max Dispatch Courier** is connected. If it already drives the courier loop,
> it is. If not, add it.

## Step 4 — Deploy as a Web App

1. Top right, click **Deploy ▾** → **New deployment**.
2. Click the **gear ⚙** next to "Select type" → choose **Web app**.
3. Fill in:
   - **Description:** `v1`
   - **Execute as:** **Me (your@email)**
   - **Who has access:** **Anyone**  ← must be "Anyone" so Telegram can reach it.
4. Click **Deploy**.
5. **Authorize:** a popup asks for permissions. Click **Authorize access**,
   pick your Google account, and on the "Google hasn't verified this app"
   screen click **Advanced → Go to Mission Control Capture Bot (unsafe)** →
   **Allow**. (It's your own script; this warning is normal for personal
   scripts.)
6. Copy the **Web app URL** it shows (ends in `/exec`). Keep it handy — this is
   your **webhook URL**.
7. Sanity check: paste that `/exec` URL into a browser. You should see
   `OK — Mission Control capture bot is deployed.`

> Re-deploying later: **Deploy ▾ → Manage deployments → ✏ edit → Version: New
> version → Deploy.** Keep the SAME deployment so the URL never changes. (If
> you ever create a brand-new deployment, re-run Step 6 below to re-point the
> webhook.)

## Step 5 — Capture your chat_id (the single-user lock)

1. Open **Telegram** and send your bot **any** message (e.g. `hi`).
2. Back in the Apps Script editor, open the **function dropdown** in the toolbar
   (says a function name next to the ▶ Run button) and choose
   **`setup_showChatIds`**.
3. Click **▶ Run**. (If asked to authorize again, do it as in Step 4.5.)
4. Click **Execution log** at the bottom. You'll see a line like:
   `chat_id = 123456789   from: Jeff Batton (@...)`.
5. Copy that **numeric** `chat_id`.
6. Go to **gear ⚙ Project Settings → Script Properties → Add script property**:

   | Property name | Value |
   |---|---|
   | `JEFF_CHAT_ID` | *(paste your numeric chat_id)* |

   **Save script properties.**

## Step 6 — Register the webhook (use the `/exec` URL!)

> ⚠️ **The #1 cause of a 401 / "messages never reach the bot" is registering
> the wrong URL.** Apps Script gives you two URLs: `/exec` (published, works for
> Telegram) and `/dev` (owner-only — anonymous callers like Telegram get
> **401**). You MUST register the `/exec` URL. Do not trust auto-detection: run
> from the editor, `ScriptApp.getService().getUrl()` returns the `/dev` URL.

1. **Deploy ▾ → Manage deployments.** Copy the **Web app URL** — it ends in
   **`/exec`**. (This is the same URL from Step 4.6.)
2. **gear ⚙ Project Settings → Script Properties → Add script property:**

   | Property name | Value |
   |---|---|
   | `WEB_APP_URL` | *(paste the `/exec` URL from Manage deployments)* |

   **Save script properties.**
3. In the editor toolbar function dropdown, choose **`setup_registerWebhook`**
   and click **▶ Run**.
4. Open **Execution log**. You should see:
   `Registered webhook URL: https://…/exec`
   `setWebhook response: {"ok":true,"result":true,"description":"Webhook was set"}`

   If it says **"REFUSING to register"**, your `WEB_APP_URL` doesn't end in
   `/exec` — re-copy it from Manage deployments.
5. Confirm it's live: run **`setup_diagnoseWebhook`** and read the log. It
   prints the URL Telegram is actually posting to and flags `/dev` if wrong.

## Step 7 — Test it end-to-end

From Telegram, send your bot:

1. **A text task:** `I need to remember to pay the DTE bill`
   → bot replies **`Got it — logged: Pay DTE bill`**
   → a new **Queued** row `[Telegram] Pay DTE bill` appears in Mission Control.
2. **A status check:** `where are we`
   → bot replies with **OPEN / RUNNING** and **DONE THIS WEEK** sections.
3. **A voice note:** (text-only build)
   → bot replies **"Voice capture isn't switched on yet — send the task as
   text for now."** (Expected — voice is the next phase.)

Get the **bot username** for your records by running **`setup_whoAmI`** and
reading the `username` in the log.

---

## Enabling voice later (no rebuild)

Everything for voice is already wired — `handleVoice_` does
getFile → transcribe → clean → log → confirm. The only missing piece is the
transcription call. To turn it on:

1. Add the provider key to Script Properties (e.g. `OPENAI_API_KEY`).
2. In `Code.gs`, open **`transcribeVoice_`** and uncomment **one** of the two
   reference blocks (OpenAI Whisper or Google Cloud STT) so it returns a
   transcript string instead of `null`.
3. **Deploy ▾ → Manage deployments → edit → New version → Deploy.**

That's the entire change. Send a voice note and it will be captured.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| **401 Unauthorized / `pending_update_count` climbing / zero `doPost` executions** | The webhook is registered against the owner-only **`/dev`** URL. Run `setup_diagnoseWebhook`: if the registered URL ends in `/dev`, set `WEB_APP_URL` to the **`/exec`** URL from Manage deployments and re-run `setup_registerWebhook`. A 401 with *no* `doPost` executions always means the request is bounced before your code runs — it's the URL, not the code. |
| Bot doesn't reply at all | Run `setup_getWebhookInfo`. If `url` is blank or wrong, re-run `setup_registerWebhook`. Confirm "Who has access" = **Anyone**. |
| `setup_showChatIds` says "No recent messages" | Send the bot a message in Telegram first; getUpdates only shows the last ~24h. If a webhook is already set, run `setup_deleteWebhook`, capture the id, then re-run `setup_registerWebhook`. |
| Replies but nothing in Notion | Check `NOTION_TOKEN` is correct and the **Max Dispatch Courier** connection is added to the Mission Control database. The Executions view shows the Notion error. |
| Someone else messaged the bot and got no reply | Working as intended — single-user lock. Only `JEFF_CHAT_ID` is served. |
| Changed the code but behavior is the same | You must redeploy a **New version**: Deploy ▾ → Manage deployments → edit → Version: New version → Deploy. |

## Files

- **`Code.gs`** — the entire bot (paste into the Apps Script editor).
- **`appsscript.json`** — project manifest (web app access + timezone).
- **`README.md`** — this runbook.
