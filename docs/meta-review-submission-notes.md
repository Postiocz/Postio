# Meta App Review – Submission Notes (copy-paste)

> This is the clean English text to paste into the Meta App Dashboard → **App Review →
> Submission notes / App verification details**. Replace the `[PLACEHOLDERS]` before
> submitting. Sections are split so you can paste "Use case description" and "App
> Verification Details" separately.

---

## Use case description

Postio (https://postio-app.cz) is a web-based social media scheduler. A creator connects
their **own Facebook Page and Instagram Business account** to Postio and composes posts in
one dashboard, mixed with other platforms (LinkedIn, YouTube, TikTok, X). Postio then
publishes for them and shows them how their posts performed. The requested permissions are
used strictly for the user's own accounts:

- **`pages_manage_posts`** — publish to the user's own Facebook Page (Graph API v20.0:
  `POST /{page_id}/feed` for text, `POST /{page_id}/photos` for photos,
  `POST /{page_id}/videos` for videos), and — only for Facebook — remote **edit**
  (`POST /{external_id}`) and **delete** (`DELETE /{external_id}`) of already-published
  posts. Everything happens server-side with the user's own access token, triggered by an
  explicit action in the app.
- **`pages_read_engagement`** — (1) show the user the **content** of their published
  Facebook posts in the app UI (text, media, dates, live link on the Posts screen), and
  (2) read per-post engagement metrics via the Graph API **v26.0** insights endpoint:
  Facebook `GET /{external_id}/insights?metric=post_clicks,post_total_media_view_unique,post_media_view&period=lifetime`,
  Instagram `GET /{media_id}/insights?metric=impressions,reach,likes,comments,shares,saved,follows,total_interactions,profile_visits,link_clicks`.
  Postio renders the returned values on the user's **Analytics** page. Reads happen only
  when the user presses "Sync Analytics"; there is no background polling.
- **`instagram_content_publish`** — publish to the user's own Instagram Business account
  via the Instagram Content Publishing API (media container `POST /{ig_user_id}/media`,
  then `POST /{ig_user_id}/media_publish`).

In the consent dialog (Facebook Login for Business) the user is shown **all 6 requested
permissions**: `business_management`, `instagram_basic`, `instagram_content_publish`,
`pages_show_list`, `pages_read_engagement`, and `pages_manage_posts` ("Create, edit and
delete posts on your Pages").

The screencast demonstrates the complete flow end-to-end: [VIDEO_URL] — login → connect →
create + publish → live proof on the Facebook Page and Instagram feed → edit the live post
(`[MM:SS]`) → delete the live post (`[MM:SS]`) → post content rendered in the app UI
(`[MM:SS]`) → real engagement metrics in Analytics (`[MM:SS]`).

The app is a genuine product with a real account flow: OAuth exchange is server-side, the
access token is stored encrypted and auto-refreshed, and all API calls are authenticated
with the user's own token. No bulk, background, or third-party data processing.

---

## App Verification Details

**App**: Postio — postio-app.cz

**Business Verification**: COMPLETED (verified business on file; domain confirmed in Meta
settings).

**Demo account**

- Email: `[DEMO_EMAIL]`
- Password: `[DEMO_PASSWORD]`
- The review account is on the `postio-app.cz` domain and is pre-authorized for the
  Facebook/Instagram review (BETA reviewer access unlocked).

**How to practise the product**

1. Go to `https://postio-app.cz` and sign in with the demo credentials above.
2. Open **Accounts** (`/accounts`), click **Connect** under the Facebook card, and complete
   the Meta consent dialog. In the "Review Postio's access request" screen all 6
   permissions are listed — including **"Create, edit and delete posts on your Pages"**.
   Grant access. This connects the test Facebook Page and its linked Instagram Business
   account.
3. Create a post via **Posts → New Post** (`/posts/new`): write a caption, attach one
   image, select the Facebook Page (and optionally the Instagram Business account), click
   **Publish now**.
4. Open the live Facebook Page and Instagram profile in a second tab — the post appears
   there (text + photo match what was written in Postio).
5. In **Posts** (`/posts`), open the post's edit dialog and change the caption, then click
   **Update on networks** — the live Facebook post updates. Then delete the post from the
   same dialog — the live Facebook post is removed.
6. Open **Analytics** (`/analytics`) and press **Sync Analytics** — the app renders the
   real engagement metrics (Reach, Engagements, Likes, Comments, Shares) of the published
   posts.

**Consent dialog — the 6 permissions the reviewer will see and grant**

| Permission | Shown in the dialog as |
|---|---|
| `business_management` | Manage your Business |
| `instagram_basic` | Read content on your Instagram account |
| `instagram_content_publish` | Publish posts on your behalf (Instagram) |
| `pages_show_list` | Show your Pages |
| `pages_read_engagement` | Pull engagement data for your Pages |
| `pages_manage_posts` | **Create, edit and delete posts on your Pages** |

**Demo video**

- URL: `[VIDEO_URL]`
- Format: MP4, 1080p, 16:9, publicly viewable, ≤ 5 min.
- Permission ↔ timestamp mapping:

| Permission | Demonstrated in | Timestamp |
|---|---|---|
| `pages_manage_posts` – publish | Scene 3 – create & publish now | `[MM:SS]` |
| `pages_manage_posts` – live proof | Scene 4 – post on the Facebook Page | `[MM:SS]` |
| `pages_manage_posts` – edit | Scene 5 – live edit | `[MM:SS]` |
| `pages_manage_posts` – delete | Scene 6 – live delete | `[MM:SS]` |
| `pages_read_engagement` – post content | Scene 7 – Posts list in the UI | `[MM:SS]` |
| `pages_read_engagement` – metrics | Scene 8 – Analytics with real data | `[MM:SS]` |
| `instagram_content_publish` | Part B – IG publish + live IG proof | `[MM:SS]` |

**Contact for this review**: hello@postio-app.cz