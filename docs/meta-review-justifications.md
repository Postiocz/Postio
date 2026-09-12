# Meta App Review – Scope Justifications (v2.1)

> **Purpose**: Ready-to-paste justification paragraphs for the **Permissions & Features**
> section of the Meta App Review (Facebook Login → Advanced Access). These cover the three
> permissions that were previously rejected because the screencast did not demonstrate the
> end-to-end experience:
>
> - `pages_manage_posts`
> - `pages_read_engagement`
> - `instagram_content_publish`
>
> **App**: Postio (postio-app.cz) — a web-based social media scheduler that lets creators
> compose, schedule, and publish posts across their social networks from one dashboard.
> Facebook and Instagram are two of the supported platforms alongside LinkedIn, YouTube,
> TikTok, and X. Each user connects their **own** Facebook Page and Instagram Business
> account and publishes content they created themselves; the app never posts on behalf of
> accounts the user does not own.
>
> **What changed in v2.1**: previous submissions were rejected because the demo video did
> not show the full end-to-end loop. The justifications below now anchor every claim in the
> concrete code paths and UI screens, and each one carries an `[MM:SS]` timestamp pointing to
> the scene in `docs/meta-review-v2.md` where the reviewer can watch the behavior live.
> The video now demonstrates, end-to-end: **connect → create → publish → open the live
> Facebook Page → edit the live post → delete the live post → see the post content in the
> Postio UI → see real engagement metrics rendered in Analytics** — and the separate
> **Instagram block** (create → publish photo → live Instagram feed).

---

## Permission: `pages_manage_posts`

### Use case (anchored in code)

Postio's Facebook publishing lives in `src/lib/actions/publish.ts`. When a user composes a
post in the editor (`/posts/new`) and selects their connected Facebook Page, the action
`publishPost` calls the Graph API **v20.0** server-side with the user's own access token:

- Text/JSON posts → `POST /{page_id}/feed` with the user's message and any link.
- Single photo → `POST /{page_id}/photos` with `caption`.
- Video → `POST /{page_id}/videos`.

The publish can be immediate ("Publish now") or on the schedule the user chose in the app
(queue / scheduled time). The response (Facebook post ID) is stored in the `posts` table,
so the Posts list shows the post as **Published** with a green check and the "Open on
network" link (built in `src/lib/live-url.ts`, `https://www.facebook.com/{post_id}`).

Postio also supports **remote editing and deletion** of already-published Facebook posts —
Meta is the only platform in the app whose API allows this:

- **Edit**: `updateOnPlatformAction` sends `POST /{external_id}` with the new `message`.
  This is wired into the post edit dialog ("Update on networks" button).
- **Delete**: `deleteFromMeta` sends `DELETE /{external_id}`. Integrity testers can see the
  post disappear from the live Page after deleting it in the app.

**User Experience**: The user writes their post once in Postio, picks their Facebook Page,
and clicks **Publish**. The post appears on their Page exactly as written. Later they can
edit the caption or remove the post without ever leaving Postio.

**Data accessed**: Only the user's own Page and the posts the user explicitly creates,
edits, or deletes through the app. No follower data, no other Pages, no reading of the
feed beyond reconciling the status of the user's own published posts.

**Timestamp**: The reviewer can see **create + publish** at `[MM:SS]` (Scene 3), the **live
proof on the Facebook Page** at `[MM:SS]` (Scene 4), the **remote edit** at `[MM:SS]`
(Scene 5), and the **remote delete** at `[MM:SS]` (Scene 6).

---

## Permission: `pages_read_engagement`

### Justification (anchored in code)

This permission powers the user's ability to see **both what their posts are and how they
performed** — the two sides of a social scheduler that Meta asked us to demonstrate.

**(1) The app shows the user the content of their published Facebook posts.** The
**Posts** screen (`/posts`) renders each published post with its text (`post.content`),
attached media thumbnails (`post.media_urls`), the platform badges with green **Published**
check, the actual publish date, and the "Open on network" link (`src/lib/live-url.ts`).
To keep this list truthful, Postio also reconciles status against Facebook with
`syncPostStatus` / `syncPublishedPosts` (`GET /{external_id}?fields=id`), so a post that was
deleted on the Page side is flagged in the UI rather than shown as live.

**(2) The app reads and renders engagement metrics per post.** On the **Analytics** page
(`/analytics`) the user explicitly presses **Sync Analytics**, and `syncAnalyticsInsights`
(`src/app/[locale]/(dashboard)/analytics/actions.ts`) calls the Graph API **v26.0**
insights endpoint per published post. Facebook Page-post metrics (verified in the Graph API
Explorer for v26.0, requires the explicit `period=lifetime`):

```
GET /{external_id}/insights?metric=post_clicks,post_total_media_view_unique,post_media_view&period=lifetime
```

Instagram media-level insights (per published IG media node — the app extracts the
`media_id` from the stored `"shortcode|media_id"` external id):

```
GET /{media_id}/insights?metric=reach,likes,comments,shares,saved,total_interactions
```

The returned values are rendered in `analytics-dashboard.tsx` as:

- **Metric cards** — Reach (impressions), Engagements, Engagement Rate, Total Likes,
  Total Comments, Total Shares, Clicks, and Saves (each guarded with `?? 0`, clean zeros =
  no broken charts).
- **Performance Over Time** — area chart over 7 / 30 / 90 days.
- **Top Performing Posts** — the user's best posts with their impressions, engagements,
  likes and shares.
- **Posts by Tag** — how the user's internally labelled posts perform.

The sync is always triggered by the explicit **Sync** button; there is no background polling.

**User Experience**: This is the core value of the app. The creator opens Analytics and
sees exactly which posts resonated and compares periods, instead of publishing into a vacuum.
Without this permission Postio would be a write-only tool with no feedback loop.

**Data accessed**: Read-only. Only engagement metrics of the user's own Page posts plus the
status/content reconciliation of those same posts. The app never reads follower lists,
individual profiles, messages, or other Pages.

**Timestamp**: demonstrable at `[MM:SS]` (Scene 8 – Analytics real data) and at `[MM:SS]`
(Scene 7 – post content in the app UI).

---

## Permission: `instagram_content_publish`

### Justification (anchored in code)

Postio publishes to the user's own **Instagram Business account** using the Instagram
Content Publishing API (via Graph API v20.0) in `src/lib/actions/publish.ts`:

1. Create a media container → `POST /{ig_user_id}/media` (image or video, single-photo mode).
2. Publish it → `POST /{ig_user_id}/media_publish`.

The flow is server-side, with the user's own token, and surfaces in the editor (`/posts/new`)
where the user picks their connected Instagram Business account alongside other networks and
clicks **Publish**. After publishing, Postio stores the returned media ID and permalink so
the post shows as **Published** and the "Open on network" link jumps to the live post on
`instagram.com/p/{shortcode}/` (from `src/lib/live-url.ts`).

**Live proof is included in the video**: after publishing, the reviewer opens the live
Instagram Business profile in the same browser and sees the photo post with the attached
image (Scene 10, `[MM:SS]`).

**User Experience**: One post, one click, published to Instagram right from the scheduling
dashboard — no re-uploading, no switching tabs.

**Data**: Only the user's own Business Account and the media the user explicitly selects.
Postio never posts to accounts the user does not own and never reads private content.
(For transparency: Instagram's API does not support remote edits/deletes, so the scenario
demonstrates create + publish + live proof for Instagram, and edits/deletes for Facebook.)

---

## Supporting details for the reviewer

- The app is a sandbox that has a genuine account flow: OAuth exchange is server-side, the
  access token is stored encrypted and auto-refreshed, every API call is authenticated with
  the user's own token.
- No background or bulk processing. Publishing, editing, deleting and analytics reads all
  happen only on explicit, single user action.
- End-to-end flow demonstrated in `docs/meta-review-v2.md`: connect → create → publish →
  open live FB/IG → edit → delete → post content in UI → real engagement metrics.
- Contact for this review: hello@postio-app.cz

---

# Submission notes — App Verification (paste into Meta App Review)

> This block is meant for the **App Review → Submission notes** / **App verification details**
> field. Replace the bracketed placeholders with your demo values.

**Demo account**

- Email: `[DEMO_EMAIL]`
  Password: `[DEMO_PASSWORD]`
- The review account is on the `postio-app.cz` domain (BETA reviewer access unlocked).

**How to practise the product**

1. Go to `https://postio-app.cz`, sign in with the demo credentials above.
2. On the **Accounts** page (`/accounts`) click **Connect** under the Facebook card and
   complete the Meta consent dialog (**Facebook Login for Business**). In the "Review
   Postio's access request" screen the user sees and grants **all 6 requested
   permissions**, including **"Create, edit and delete posts on your Pages"**
   (`pages_manage_posts`). This authorizes the test Facebook Page and its linked
   Instagram Business account.
3. Create a post via **Posts → New Post** (`/posts/new`): choose both platforms (the FB
   Page and the IG Business account), click **Publish now**.
4. Open the live Page and IG profile in a second tab and watch the post appear.
5. Edit the caption in the edit dialog and, from **Posts** (`/posts`), refresh with the
   "**Aktualizovat na sítích**" action; then delete it. Observe the live FB page.
6. Open **Analytics** (`/analytics`) and press **Sync Insights** to render the engagement
   metrics (Reach, Engagements, Likes, Comments, Shares) of the published posts.

**Consent dialog (Facebook Login for Business) — permissions the reviewer sees and grants**

In the "Review Postio's access request" screen the user is shown exactly these 6
permissions (Login Config `891876470597727`):

| Permission | What is shown in the consent dialog |
|---|---|
| `business_management` | Manage your Business |
| `instagram_basic` | Read content on your Instagram account |
| `instagram_content_publish` | Publish posts on your behalf (Instagram) |
| `pages_show_list` | Show your Pages |
| `pages_read_engagement` | Pull engagement data for your Pages |
| `pages_manage_posts` | **Create, edit and delete posts on your Pages** |

(Public profile and email are additional always-on basics; Meta does not list them as a
separate review row.)

**Verification status**

- Business Verification: **COMPLETED**. (Verified business on file; DNS + ownership
  confirmed.)
- Domain used by the app: `postio-app.cz` (also the App domain in Meta settings).

**Video – permission ↔ timestamp mapping (to fill after recording)**

| Permission | Scene | Timestamp |
|---|---|---|
| `pages_manage_posts` (publish) | Scene 3 – create & publish | `[0:00]` |
| `pages_manage_posts` (edit on page) | Scene 5 – live edit | `[0:00]` |
| `pages_manage_posts` (delete on page) | Scene 6 – live delete | `[0:00]` |
| `pages_read_engagement` (post content UI) | Scene 7 – Posts list | `[0:00]` |
| `pages_read_engagement` (metrics) | Scene 8 – Analytics real data | `[0:00]` |
| `instagram_content_publish` | Part B – IG publish + live proof | `[0:00]` |

**Demo video URL** (to paste in the submission): `https://youtube.com/...` (replace
after upload; must be publicly viewable, 1080p, MP4, with the narrated flow above).