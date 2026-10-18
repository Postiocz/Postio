# TikTok App Review – Demo Video Script (Screencast)

> **Purpose**: Step-by-step technical screencast scenario for TikTok's app-review team.
> It demonstrates the complete "Log in → Connect account → Select video → Set privacy → Publish"
> flow the way a real Postio user would experience it.
>
> **App**: Postio (postio-app.cz) — web-based social media scheduler.
> **Locale used in the recording**: English (`en`). The UI also ships in Czech (default) and
> Ukrainian; select the language via the switcher in the top-right corner before recording.

---

## Scene 0 — Overview (10 s)

- Full-screen show of the Postio dashboard (browser, desktop view, landscape).
- On-screen text: "Postio — schedule and publish videos to TikTok together with other networks."

---

## Scene 1 — Log in (30 s)

1. Go to `https://postio-app.cz` → the app redirects to the **Sign in** page
   (split layout: form on the left, visual panel on the right).
2. Sign in with **e-mail and password** (demo credentials from the submission notes)
   or **Google OAuth**.
3. The **Dashboard** opens. On-screen text:
   "This account is pre-authorized for the TikTok sandbox (BETA reviewer access)."
4. Switch the locale switcher to **English**, if it is not already selected.

> UI note: TikTok/Facebook/Instagram are sandbox platforms behind a **Launch Guard**.
> They are unlocked for admin accounts or accounts on the `@postio-app.cz` domain,
> which is exactly what the reviewer account is. Regular (unprivileged) users see a
> "BETA" badge and a disabled connect button instead.

---

## Scene 2 — Connect the TikTok account (40 s)

1. Open **Accounts** in the sidebar (`/en/accounts`).
2. Find the **TikTok** card. It shows no BETA lock (Launch Guard passed).
3. Click **Connect** → the app opens TikTok's official consent screen
   (`www.tiktok.com/v2/auth/authorize`) with scopes:
   - `user.info.basic` (profile)
   - `video.upload` (upload video)
   - `video.publish` (publish video)
   - **Hold the consent screen for at least 5 s** so the ticked scopes are visible.
4. On TikTok's screen, pick a TikTok account, review the requested permissions,
   grant access, and return. The app lands you back on **Accounts**.
5. The TikTok card now shows the connected account: name, avatar, and
   "connected" confirmation toast.
   On-screen text: "The OAuth exchange (PKCE + code) is handled by
   `/api/accounts/tiktok` server-side; the access token is kept server-side and
   refreshed automatically."

---

## Scene 3 — Create a post and select a video (45 s)

1. Go to **Posts → New Post** (`/en/posts/new`).
2. Title the post, e.g. "TikTok review demo".
3. Open the **media picker** and append a short **.mp4** video file
   (supported: mp4 / mov / m4v / webm / mkv).
   - While the file uploads, the media tile shows a progress state.
4. In the platform/account picker, select the connected **TikTok** account.
   - The UI requires a video whenever TikTok is selected; the **Publish Now**
     button is disabled until a finished video upload is present.
   On-screen text: "Video is uploaded to Postio storage first; TikTok receives it
   via the Content Posting API at publish time."

---

## Scene 4 — Set privacy and video options (40 s)

1. The editor reveals the TikTok **Direct Post** panel for the selected account:
   - **Video visibility** (select "Select visibility…"): offers **Followers**,
     **Friends** and **Only me**. **Public is not offered for this account**
     (creator_info does not return `PUBLIC_TO_EVERYONE`). **Nothing is pre-selected** –
     the select shows the placeholder.
2. The user **actively picks Only me** (a choice that works in the sandbox too).
   On-screen text: "The visibility dropdown follows the creator's
   `privacy_level_options` from the TikTok API; nothing is pre-selected."
3. Below it:
   - **Interactions**: Allow comments unticked; **Allow duet and Allow stitch are
     greyed out** ("unavailable for this account" – disabled in `creator_info`).
   - **Maximum video length** (value from `max_video_post_duration_sec`, read it from
     the screen; do not put the number in captions, it varies by account).
4. The **Commercial content** toggle starts **off** (shown as is). On camera: turn the
   toggle **on** – two choices appear: **Brand Organic** ("Promoting myself/my business" –
   'Promotional content') and **Branded Content** ("Promoting another brand" –
   'Paid partnership'). Tick **only** "Promoting myself/my business" (Brand Organic).
   **Do not tick Branded Content** (it would cancel the **Only me** visibility choice)
   and **do not turn the toggle off** before publishing. **Branded Content** requires
   non-private visibility – on an account offering **Followers/Friends** it stays
   checkable and only **Only me** is disabled, with the hint "Branded content visibility
   cannot be set to private."; the whole option is disabled only on an account whose sole
   visibility option is **Only me**.
   On-screen text: "Commercial content disclosure is off by default; the user turns it
   on and selects "Promoting myself/my business" (Brand Organic)."
5. **Music Usage Confirmation** checkbox right before publish – tick it (links to
   TikTok's official terms). For Brand Organic the label stays **Music Usage
   Confirmation** (the Branded Content Policy checkbox is added only for Branded
   Content).
6. Below the form: a note that processing may take a **few minutes** before the
   video appears on the profile.
   On-screen text: "All Direct Post requirements are exposed: explicit visibility
   choice, interaction toggles, disclosure and consent."

---

## Scene 5 — Publish (50 s)

1. **Publish Now** sits in the **Time and publish** section (bottom right, next to
   **Schedule** and **Add to Queue**). Click it (enabled once all requirements are met).
2. The button shows **"Saving…"**.
3. The server runs the full Content Posting sequence:
   - `POST /v2/post/publish/creator_info/query/`
   - `POST /v2/post/publish/video/init/` → obtains `publish_id` + `upload_url`
   - binary upload of the video file (`PUT` to `upload_url`)
   - `POST /v2/post/publish/status/fetch/` → polls every 2.5 s until
     `PUBLISH_COMPLETE` (up to 3 minutes).
4. The app **redirects to Posts**, shows the toast **"Your post was published
   successfully"**, and the post card carries the **Published** badge.
   On-screen text: "End-to-end posting to TikTok; no manual steps beyond the form."

> **When Published is set** (from the code): `post_platforms.status = "published"`
> is written by `handlePublishSuccess` in `publish.ts`, which runs **only after**
> `publishToTikTokAction` returns success – and that only happens **after
> `PUBLISH_COMPLETE`** from TikTok's `status/fetch` (`waitForTikTokPublishComplete` in
> `publish-tiktok.ts`). So the Published badge never appears before TikTok confirms.

> **Sandbox note**: with **Only me** (SELF_ONLY) the
> `unaudited_client_can_only_post_to_private_accounts` banner did **not** appear –
> TikTok accepted the publish directly. **Friends and Followers were not tested** on
> this account; verify manually if you want to be sure.
>
> **Submission note**: the publish in this recording uses **Brand Organic** (promoting
> the user's own business). **Branded Content (paid partnership) is not demonstrated**:
> per TikTok's Content Sharing Guidelines an unaudited client can only post with
> SELF_ONLY visibility and Branded Content cannot be private.

---

## Scene 6 — Verification (40 s)

> Starts on the **Posts** list with the published post. The video must already be visible
> on the TikTok profile (record after processing finished).

1. On the post card click the **pencil** icon (Edit) → **Edit Post** opens.
   On-screen text: "Open the published post in the edit dialog."
2. A yellow banner with a lock is pinned at the bottom: "TikTok does not support editing
   or deleting posts after publishing." Hold it ~4 s, then click **Cancel**. (Do not scroll
   down in Edit Post: the "Lokace" label is still Czech.)
   On-screen text: "The edit dialog states: TikTok does not support editing or deleting
   posts after publishing."
3. On the card click the **eye** icon (Preview) → a window with the TikTok preview (video +
   nickname + avatar + caption). Click **View on network** → a new `tiktok.com` tab opens
   on the account profile.
   On-screen text: "Preview → View on network opens the connected account on tiktok.com."
4. **Live proof** on TikTok (EN UI): profile → **Videos** tab (there is no separate
   "private" tab).
   - The private video shows a **lock icon** on its thumbnail; the account has a **lock next
     to its name**.
   - Opening the video shows **"Private"** with a lock, the **"Promotional content"** label
     (published as Brand Organic) and **"Comments are turned off"** (comments were not
     allowed). Hold for at least 5 s. Do not click anything: TikTok itself offers
     "View Analytics" and sharing; Postio does not use them.
   - **TODO – verify manually**: **after how long** the video appears on tiktok.com (the UI
     says processing may take a few minutes; don't invent a duration until verified).
   On-screen text: "On tiktok.com: Profile → Videos. The video shows a lock icon, the
   "Private" label and "Promotional content" (Brand Organic)."

> ⚠️ **Fix before recording:** the preview window (eye icon) currently shows made-up numbers
> (12.4K, 134, 456, 12) and, under View on network, a text about a "private section".
> Both must be fixed and deployed.

> ⚠️ **Critical**: the TikTok account is **private** – the video will not be found in the
> public feed. Do not record a scene implying public visibility.

---

## Scene 6B — Delete after publishing (archive) (25 s)

> A dedicated scene because **TikTok's documentation provides no video-deletion endpoint**
> (Content Posting API / Content Sharing Guidelines have no delete for videos). Postio
> therefore does not call an API DELETE: the delete dialog explains that the video must be
> removed manually on TikTok after it is removed from Postio, and **archives** the post by
> default (keeps the publish date and network data; the card stays in the Posts list with an
> **Archived** badge, a "deleted <date>" note and a **greyed-out TikTok icon**).

1. On the **Posts** list click the red **trash** icon on the post card.
2. The **Delete Post** dialog opens: intro text (on platforms without API deletion, LinkedIn
   and TikTok, the post must be removed manually), a yellow box "TikTok doesn't allow
   deleting videos through its API. After you delete or archive this post in Postio, please
   remove the video manually in the TikTok app.", the red **unticked** "Permanently delete
   from the Postio app" and a note that the post is saved as archived. Keep the dialog
   readable for ~6 s.
   On-screen text: "The delete dialog notes that TikTok doesn't allow deleting videos through
   its API, so the video must be removed manually."
3. Click **Confirm deletion** (do **not** tick permanent deletion). The card stays in the
   Posts list, now with the **Archived** badge and a "deleted <date>" note. A toast appears
   (verified).
   On-screen text: "Confirming archives the post in Postio; the user then removes the video
   manually on TikTok."
4. Show the card in the Posts list (**Status: All**) with the **Archived** badge, the
   "deleted <date>" note and the **greyed-out TikTok icon**.
   On-screen text: "The post stays in Postio history, marked Archived, with a greyed-out
   TikTok icon."

> ⚠️ **Critical**: this scene **must run without any error screen** – only the dialog, the
> friendly toast and the archived post. After recording, delete the video manually on TikTok.

---

## Scene 7 — Wrap-up (10 s)

- Freeze-frame of the TikTok card in Accounts with the connected account.
- On-screen text: "Thank you for reviewing Postio. Any questions:
  hello@postio-app.cz"

---

## Checklist for the recording

- [ ] Recording on **`https://postio-app.cz`** (domain matches the review URL), not localhost
- [ ] Sandbox `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` set in Vercel
- [ ] English locale (`/en/...`) selected; **Location and tags empty**
- [ ] Test TikTok account **private**, **switched to English**, and logged in;
      (the `tiktok.com` tab opens via **View on network** in Scene 6)
- [ ] TikTok consent screen visible ≥ 5 s with the scopes shown (Scene 2)
- [ ] Commercial content: toggle on, tick only Brand Organic ("Promoting myself/my
      business"), never tick Branded Content, keep the toggle on until publish
- [ ] Short **neutral** `.mp4` clip (a few seconds, no music/watermark, **not an AI
      scene with a character**)
- [ ] `@postio-app.cz` reviewer account used (Launch Guard unlock)
- [ ] Scene 5 and 6B without any error screen
- [ ] Preview window (eye icon) **without made-up numbers** and the delete dialog **restored**
      (both fixed and deployed before recording)
- [ ] **Hidden browser bookmark bar**; **taskbar cropped**; no secrets visible (no
      tokens, no console logs)
- [ ] 1080p or higher, 16:9, stable mouse pointer, readable cursor, zoom at 100% default
- [ ] After the recording, fill the `[MM:SS]` timestamps into the Submission Notes table