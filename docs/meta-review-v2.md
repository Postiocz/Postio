# Meta App Review – Demo Video Script v3 (Screencast)

> **Purpose**: Step-by-step technical screencast for the Meta (Facebook) app-review team.
> It demonstrates the **complete end-to-end experience** that the previous submission was
> missing — including live proof on Facebook/Instagram, remote edit/delete, post content in
> the app UI, and real engagement metrics.
>
> **App**: Postio (postio-app.cz) — a web-based social media scheduler.
> **Language of the recording**: English (`en`). The UI also ships in Czech (default) and
> Ukrainian; select English via the switcher in the top-right corner before recording.
> **Any on-screen text annotations below are shown as captions; the narration is in <>.**

---
---

# PŘÍPRAVA PŘED NATÁČENÍM

> Do this **at least 48 hours** before recording. Postio only shows real engagement numbers
> after Meta has aggregated metrics on a live post — publishing 2+ days early is mandatory
> for Scene 8 to show Non-Zero values.

- [ ] **`pages_manage_posts` added to Login Config `891876470597727` on the Meta App
      Dashboard ✅** (done before recording — the consent dialog must show **"Create, edit
      and delete posts on your Pages"**).
- [ ] **Test post with engagement (48h before)**:
  - Publish a real photo post from Postio to the test Facebook Page + Instagram Business
    account, caption e.g. *"Meta review demo – published from Postio 🚀"* (unique string,
    easy to spot).
  - From a *second* account (a friend / your personal), like, comment and share that post.
  - Let it sit ≥ 24–48h so Meta aggregates the metrics Postio reads back in Analytics
    — Facebook Page-post: `post_clicks, post_total_media_view_unique, post_media_view`
    (`period=lifetime`); Instagram media-level: `reach, likes, comments, shares, saved,
    total_interactions`.
- [ ] **Public demo Facebook Page** ready (about/completed, profile photo; admin=test account).
- [ ] **Instagram Business account** linked to that Page (Settings → *Professional account*
    → *Linked accounts*).
- [ ] **Postio test account** (email + password) that the reviewer can log into — the
    Launch Guard unlocks connect for `@postio-app.cz` accounts (or admin). Log in *before*
    recording so Scene 1 can be quick.
- [ ] **Video host / URL ready**: the final video is uploaded to a public host as MP4
    (YouTube/Wetransfer), 1080p, and the URL is pasted into the Submission Notes field.
- [ ] **Browser**: macOS / Windows desktop, English, 2 tabs pre-authenticated (Facebook
      logged in as the Page admin; Instagram logged in).
- [ ] Depending on the route you edit a post in the app: the Postio editor open at
      `/en/posts` and the Edit dialog reachable (see Scene 5).

---
---

# PART A – Facebook (permissions `pages_manage_posts`, `pages_read_engagement`)

## Scene 0 — Overview (15 s)

- Full-screen of the Postio **Dashboard** (desktop, landscape).
- Caption: "Postio — compose, schedule and publish to Facebook and Instagram from one
  dashboard, then see how your posts perform."

---

## Scene 1 — Log in (30 s)

1. Go to `https://postio-app.cz` → the app redirects to **Sign in**.
2. Sign in with e-mail + password (the demo credentials from the submission notes).
3. The **Dashboard** opens. Caption: "This account is pre-authorized for this review
   (BETA reviewer access)."
4. Switch the locale switcher to **English** if needed.

---

## Scene 2 — Connect the Facebook Page + Instagram (45 s)

1. Open **Accounts** in the sidebar (`/en/accounts`).
2. Find the **Facebook** card. Click **Connect**.
3. **Hold the Meta consent dialog on screen for ≥ 5 seconds** with all requested scopes
   visibly ticked:
   - `pages_manage_posts` (*Manage pages – Post on your behalf*)
   - `pages_read_engagement` (*Pull engagement data*)
   - `instagram_content_publish` (*Publish on your behalf*)
   - plus `pages_read_user_content`, `pages_manage_engagement`, `pages_show_list`,
     `public_profile`.
   Caption: "Permissions requested by Postio, reviewed by the admin on Meta's consent screen."
4. Grant and return → the **Facebook** card shows the connected Page (name + avatar), the
   **Instagram** card shows the linked Business account.
   Caption: "OAuth is exchanged server-side; the token is stored encrypted and auto-refreshes."

---

## Scene 3 — Create + Publish (50 s)

1. Go to **Posts → New Post** (`/en/posts/new`).
2. Write a unique caption: **"Meta review demo – published from Postio 🚀"** (same string as
   the 48h pre-post so every scene is unambiguous). Attach **one image**.
3. In the platform picker select the test **Facebook Page**.
4. Click **Publish now** → loading state ("Publishing…") → success toast: **"Your post was
   published successfully"**.
   Caption: "Server-side Graph API – `POST /{page_id}/feed`."

---

## Scene 4 — LIVE PROOF on the Facebook Page (40 s)

> The scene that proved the previous video was not enough — proof the post *really* reached
> the network, not just a toast.

1. In the same browser, open a **second tab** → the test Facebook Page.
2. Scroll to the post with caption "…published from Postio 🚀" and the image. **Zoom the
   cursor on the post** so text + photo are readable.
3. Caption: "This is the live post from Scene 3 on the real Facebook Page."
4. Tab 1 has the **"View on network"** link on the post card — click it to open the same FB
   post from within Postio proof that the link navigates to the live post.

---

## Scene 5 — EDIT caption in Postio → FB shows UPDATED post (35 s)

> Demonstrates remote edit via the Graph API (`POST /{external_id}` → `message`).

> ⚠️ **HARD REQUIREMENT**: this scene (and Scene 6) **must run without any error screen**.
> If the app shows a Meta capability error (#3, "remote editing requires App Review")
> or any other failure toast, **the recording is invalid** — fix the app/config first and
> re-record. Do not submit a video showing an edit/delete error.

1. Tab 1: in `/en/posts`, click the **edit icon** on the just-published post card to open
   the **Edit dialog**. The dialog's platform tabs are locked to published ones — select
   the **Facebook** tab (the embedded preview shows the post).
2. Change the caption: append e.g. "— updated ✅".
3. Click **"Update on networks"** (the highlighted update button / „Aktualizovat na sítích").
4. Back to the **live Facebook tab**, refresh the Page. **Point at the caption now ending
   with "updated ✅".** Caption: "Postio edited the live Facebook post via the Graph API."
5. (Optional) Same edit dialog: FB supports edits; Instagram shows an info banner
   "Editing is not supported by this platform" → caption: "Instagram API doesn't allow
   remote edits; Postio hides the option."

---

## Scene 6 — DELETE → FB page shows it's gone (25 s)

> ⚠️ **HARD REQUIREMENT (same as Scene 5)**: this scene **must run without any error
> screen** — the delete must succeed and the live Page must show the post gone. Any error
> toast invalidates the recording; re-record after fixing.

1. Tab 1: in the same Edit dialog (or post card menu) click **Delete/Remove** and confirm.
2. Caption: "Postio calls the Graph API `DELETE /{external_id}`."
3. Back to the **live Facebook tab** and refresh → the post is **gone**.
4. Caption: "The post is removed from the live Page."

---

## Scene 7 — Post content inside Postio UI (25 s)

> This answers "how the app displays the *content* of the user's Facebook posts" (second
> half of `pages_read_engagement`).

1. Go to **Posts** (`/en/posts`).
2. The earlier published post is a card with: **text content, image thumbnail, the
   **Published** badge (green check) on the Facebook platform icon, the release date, and
   the **View on network** link.
3. Caption: "Here the user sees the content of their Facebook posts rendered inside Postio
   — text, photo, dates, live link."

---

## Scene 8 — Analytics with real engagement data (60 s)

1. Go to **Analytics** in the sidebar (`/en/analytics`).
2. Click **Sync Analytics** (the explicit user trigger ~ and shows a spinner).
3. Caption: "Postio reads engagement via `GET /{external_id}/insights` → impressions,
   engagement, likes, comments, shares."
4. **Move the cursor across the NON-ZERO metric cards**:
   - Reach (impressions) | Engagements | Engagement Rate | Total Likes | Total Comments | Total Shares.
5. Scroll to **Performance Over Time** — the area chart shows a **clearly visible data point
   for the test post** (note the numbers are >0).
6. Scroll to **Top Performing Posts** — the demo post appears with its **real (non-zero)
   impressions / engagements / likes / shares**.
7. Caption: "The user sees exactly how their post performed — that's the value of
   `pages_read_engagement`."
8. Freeze this frame for 3 s.

---

## Scene 8B — (Optional, honest fallback if Scene 8 shows 0s … 10 s)

- If the metrics are still 0 (Meta aggregation lag): show the clean zero metric cards +
  the tasteful empty state (no NaN, no broken charts) and the Sync button. Caption: "With
  no data yet, Postio shows clean zeros and a graceful empty state."

---

# PART B — Instagram (permission `instagram_content_publish`)

## Scene B9 — Connect (if not already), publish a new photo (50 s)

1. If the Instagram Business account is shown on `/en/accounts` — skip (it is). If not:
   connect exactly like Scene 2 and hold the consent ≥ 3 s.
2. **Posts → New Post** — write **another** unique caption, e.g. **"IG demo – from Postio 🚀"**,
   attach **one image** (JPEG; aspect 4:5–1.91:1 so no warning).
3. In the platform picker select the **Instagram Business** account (only IG, so the scene is
   unambiguous).
4. **Publish now** → loading → success toast. Caption: "Instagram Content Publishing API –
   `POST /{ig_user_id}/media` container, then `/media_publish`."

---

## Scene 8/10 — LIVE proof on the **Instagram profile** (30 s)

1. Same browser → new tab → the test **Instagram Business profile**.
2. **Point the cursor on the just-published photo** — the caption from the Postio matches.
3. Caption: "The same photo is live on the Instagram feed." (Refresh if needed.)

---

## Scene 11 — Wrap-up (10 s)

- Freeze-frame of the Analytics page (non-zero metrics) and of the live post on the FB Page.
- Caption: "Thank you for reviewing Postio. Questions: hello@postio-app.cz"

---

## Recording checklist

- [ ] English locale (`/en/…`) selected
- [ ] Blue Meta approval dialog visible ≥5 s **with all checkmarks** (Scene 2)
- [ ] Unique captions; the photo post matches between Postis + the live FB/IG
- [ ] 2 tabs logged in before Scene 4 (Facebook Page + Instagram)
- [ ] Non-zero Analytics picture (post posted ≥48h, liked/commented from 2nd account)
- [ ] No secrets visible (no tokens, no raw SDK logs)
- [ ] 1080p+, 16:9, stable cursor, 100% zoom, crisp highlight on narrated elements
- [ ] After upload the timestamps `[MM:SS]` filled in the Submission Notes table