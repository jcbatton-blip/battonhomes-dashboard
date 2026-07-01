# ⏳ DEPLOY PENDING — 5-minute task (not urgent)

The bot is **live and working** on Version 3 right now. Nothing is broken.
This is just to push tonight's *hardening* fix (commit `95a6f31`) into the live
Apps Script project so the webhook can never be misregistered to the `/dev` URL
again. Do it whenever convenient.

## Why it can't be auto-deployed
Deploying Apps Script needs your Google account (interactive OAuth). The cloud
sandbox has no `clasp`, no `gcloud`, and no access to your Google login, so this
last step has to be done by you at script.google.com.

## Do this (≈5 min)

1. Open the **Nigel Capture Bot** project at https://script.google.com
2. Open **`Code.gs`**, select all (`Ctrl/Cmd+A`), delete, and paste in the
   latest `Code.gs` from this folder
   (branch `claude/telegram-mission-control-bot-hgm9mx`). Save (`Ctrl/Cmd+S`).
3. *(Optional, tidy)* **⚙ Project Settings → Script Properties → Add**:
   - `WEB_APP_URL` = `https://script.google.com/macros/s/AKfycbxDICzBcYBxkSUNzkxFIknmi8uKsf8alpCuIs9LO8YNAVWPopU2BYkyUvgnkmw6xALWVw/exec`
   (The correct `/exec` URL is also baked into the code as the default, so this
   is belt-and-suspenders.)
4. **Deploy ▾ → Manage deployments → ✏ edit → Version: New version → Deploy.**
   The `/exec` URL stays the same, so **no need to re-register the webhook.**
5. *(Optional sanity check)* Run **`setup_diagnoseWebhook`** and confirm the log
   shows Telegram posting to the `/exec` URL with `pending_update_count: 0`.

That's it. Nothing else changes; the bot keeps working throughout.

## What this fix changes
`setup_registerWebhook()` no longer trusts `ScriptApp.getService().getUrl()`
(which returns the owner-only `/dev` URL from the editor — the cause of the 401).
It resolves the `/exec` URL from `WEB_APP_URL` (or the baked-in default) and
**throws** if the URL doesn't end in `/exec`. Registering `/dev` is now impossible.

## Also waiting on you (separate, not urgent)
Delete the 5 leftover `[Telegram] Is this true?…` junk rows (all `Queued`) in
Mission Control — links are in Atlas's last report. The connected Notion tools
can't delete, so this is a manual click. Do it before the next `where are we`
test so they don't show up in the report.
