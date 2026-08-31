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
2. Sign in with passwordless e-mail or Google OAuth.
3. The **Dashboard** opens. On-screen text:
   "This account is pre-authorized for the TikTok sandbox (BETA reviewer access)."

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
4. On TikTok's screen, pick a TikTok account, review the requested permissions,
   grant access, and return. The app lands you back on **Accounts**.
5. The TikTok card now shows the connected account: name, avatar, and
   "connected" confirmation toast.
   On-screen text: "The OAuth exchange (PKCE + code) is handled by
   `/api/accounts/tiktok` server-side; the access token is stored securely in the
   database and auto-refreshes."

---

## Scene 3 — Create a post and select a video (45 s)

1. Go to **Posts → New Post** (`/en/posts/new`).
2. Title the post, e.g. "TikTok review demo".
3. Open the **media picker** and append a short **.mp4** video file
   (supported: mp4 / mov / m4v / webm / mkv).
   - While the file uploads, the media tile shows a progress state.
4. In the platform/account picker, select the connected **TikTok** account.
   - The UI requires a video whenever TikTok is selected; the publish button is
     disabled until a finished video upload is present.
   On-screen text: "Video is uploaded to Postio storage first; TikTok receives it
   via the Content Posting API at publish time."

---

## Scene 4 — Set privacy and video options (40 s)

1. The editor reveals the **Privacy settings** panel for TikTok:
   - **Public** — `PUBLIC_TO_EVERYONE`
   - **Friends** — `MUTUAL_FOLLOW_FRIENDS`
   - **Only me** — `SELF_ONLY`
2. Pick **"Public"** (the app's default).
3. Below it, the panel shows the connected creator's capability summary
   (Comments / Duet / Stitch are set from TikTok's `creator_info/query`).
   On-screen text: "The app reads the creator's live options from the TikTok API and
   respects them when publishing."

> Sandbox reality check: while the app is **unaudited** (sandbox), TikTok only
> accepts posts to **private accounts**. The app therefore force-falls back to
> `SELF_ONLY` in this mode and shows a friendly notice:
> "TikTok in this mode only allows private posts. The video will be published as
> 'Only me'." This is expected and will not appear anymore once the app is
> formally reviewed.

---

## Scene 5 — Publish (50 s)

1. Click **Publish now**.
2. The button enters a loading/spinning state ("Publishing…").
3. The server runs the full Content Posting sequence:
   - `POST /v2/post/publish/creator_info/query/`
   - `POST /v2/post/publish/video/init/` → obtains `publish_id` + `upload_url`
   - binary upload of the video file (`PUT` to `upload_url`)
   - `POST /v2/post/publish/status/fetch/` → polls until `PUBLISH_COMPLETE`
     (up to 3 minutes).
4. The app shows a success toast: **"Your post was published successfully"**,
   and the post's card reflects **Published** status on TikTok.
   On-screen text: "End-to-end posting to TikTok; no manual steps beyond the form."

---

## Scene 6 — Verification (30 s)

1. Open the published post from **Posts** → edit dialog → TikTok tab.
   - It shows the embedded mobile-like TikTok preview (video + caption + actions).
   - A lock banner explains: "TikTok does not support editing or deleting after
     publishing" (per TikTok's API contract; the app prevents any attempt).
2. Optional (if reviewers want): open TikTok.com/your-TikTok-app in the same
   browser and point at the just-published video to show it reached the account.

---

## Scene 7 — Wrap-up (10 s)

- Freeze-frame of the TikTok card in Accounts with the connected account
  and of the post marked **Published**.
- On-screen text: "Thank you for reviewing Postio. Any questions:
  hello@postio-app.cz"

---

## Checklist for the recording

- [ ] English locale (`/en/...`) selected
- [ ] Test TikTok account in the browser logged in and ready to authorize on the
      TikTok consent screen
- [ ] Short `.mp4` clip prepared (a few seconds; landscape not required)
- [ ] `@postio-app.cz` reviewer account used (Launch Guard unlock)
- [ ] No secrets visible on screen (no access tokens, no console logs)
- [ ] 1080p or higher, 16:9, stable mouse pointer, readable cursor, zoom at 100% default
- [ ] Captions or on-screen notes follow the "UI note" / "Sandbox reality check" lines above