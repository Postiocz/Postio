# TikTok App Review - Scope Justifications

> **Purpose**: Ready-to-paste justification paragraphs for the **Scopes** section of the
> TikTok Developer Portal, required for production access (leaving sandbox mode).
>
> **App**: Postio (postio-app.cz) - a web-based social media scheduler that lets creators
> compose, schedule, and publish posts across their social networks from one dashboard.
> TikTok is one of the supported platforms alongside Facebook, Instagram, LinkedIn,
> YouTube, and X. Each user connects their **own** TikTok account and posts videos they
> created themselves - the app never posts on behalf of accounts the user does not own.

---

## Scope: `user.info.basic`

### Justification

Postio needs `user.info.basic` to identify the connected TikTok account so users can
manage multiple platforms in one dashboard and always know exactly which account they are
posting to. When a user connects TikTok through our OAuth flow, the app calls the
`user/info` endpoint **once** to read the account's `open_id`, `display_name`, and
`avatar_url`. This data is used solely to (1) confirm that the intended account was
authorized, (2) render the account with its real name and avatar in the "Connected
accounts" list, and (3) store a stable `open_id` so reconnects are recognized and no
duplicate account entries are ever created.

**User Experience**: Without this scope, Postio would be unable to show which TikTok
account is connected, which makes it easy for users to mix up accounts or lose track of
their connections. Showing the verified account name and picture makes the link
transparent and gives the user confidence that they will publish under the correct
identity.

**Content Management**: The `open_id` is the durable key Postio uses to associate a TikTok
account with the user's publishing history, plan limits, and credential refreshes. It also
lets the app detect when the same account is reconnected and keeps the account list clean
and predictable over time.

---

## Scope: `video.upload`

### Justification

The core value of Postio is letting creators publish their videos to TikTok without
leaving the app. `video.upload` enables the upload leg of the TikTok Content Posting API:
the app initializes a video publish (`video/init`), receives a `publish_id` and an
`upload_url`, and transfers the video file binary to that TikTok-owned URL. The video is
always the user's own file - selected by them in the post editor from their own media
library - never third-party content.

**User Experience**: The user picks a finished video in the editor, **explicitly selects
the visibility** from a dropdown that has no pre-selected value (options come from the
creator's `privacy_level_options`), optionally toggles interactions (Allow comments/duet/
stitch), consents to TikTok's Music Usage Confirmation, and clicks Publish. The
**Commercial content** disclosure is **off by default** — a video published without it
carries **no promotional label** on TikTok; when the user enables it and picks
**"Promoting myself/my business"** (Brand Organic), TikTok marks the video as
**"Promotional content"**. Under the hood the app
uses `video.upload` to deliver the file to TikTok. The user never has to switch tabs,
re-record, or re-upload anywhere; the whole flow happens in the same form they already use
for their other networks.

**Content Management**: Uploading is only ever triggered by an explicit user action on a
post the user created, and only after the user has consented to TikTok's terms. The
selected video is stored in Postio's storage under a per-user path and is removed from
storage when the user removes it from the post. A post is never re-uploaded once it has
been published (duplicate uploads are blocked server-side).

---

## Scope: `video.publish`

### Justification

`video.publish` finalizes the Content Posting flow: after the upload, the app calls
`status/fetch` until TikTok reports the video is `PUBLISH_COMPLETE` (polling every 2.5 s,
up to 3 minutes), and only **then** is the post shown as **Published** in Postio.
Publishing happens solely for videos the current user uploaded and chose to publish, and
the app fully respects the user's explicit privacy choice (`PUBLIC_TO_EVERYONE`,
`MUTUAL_FOLLOW_FRIENDS`, `FOLLOWER_OF_CREATOR`, `SELF_ONLY` — the dropdown has no default
value). Interaction settings are sent from the user's Allow toggles, and a creator-level
"disabled" flag is always honoured. Branded-content disclosure (`brand_content_toggle` /
`brand_organic_toggle`) is sent when the user enables it; branded content is never sent
as private, and on private-only accounts the option is not offered.

**User Experience**: Immediately after clicking Publish, the user sees live progress and a
clear success confirmation — the app redirects to Posts and shows "Your post was published
successfully". There are no dead ends or silent failures - if publishing fails, the app
shows the reason and lets the user retry, and the Published badge never appears before
TikTok reports `PUBLISH_COMPLETE`. On `tiktok.com` the uploaded video is verifiable under
**Profile → Videos** (Private videos show a lock icon, and the account carries a lock next
to its name; the video recorded in the demo is published with Brand Organic and shows
"Private" and "Promotional content"). This removes the friction of manually switching
to the TikTok app to post a video.

**Content Management**: Postio is a post-drafting and scheduling tool. Videos the user
writes and schedules are published to their own account on their schedule, with their
chosen privacy and options (comments, duet, stitch). The app does not publish anything the
user did not explicitly submit for publication.

---

## Supporting details (for the reviewer)

- The app never reads a user's TikTok feed, messages, or private data beyond the three uses
  described above.
- Every publish request is authenticated with the user's own access token (PKCE OAuth,
  server-side exchange, and the token is kept server-side in our database and refreshed automatically).
- The Direct Post UX is honoured: the visibility dropdown has **no default value** and its
  options follow `privacy_level_options`; Comments/Duet/Stitch are user "Allow" toggles
  (none checked by default; a creator-level disabled flag always wins); the
  **Music Usage Confirmation** declaration is shown before the publish button (with the
  Branded Content Policy wording when branded content is selected); and users are told
  that processing may take a few minutes.
- The visibility is chosen by the user in the editor (the dropdown has **no default
  value**). In a non-production environment (localhost or Vercel preview, or when
  `TIKTOK_FORCE_PRIVATE_POSTS` is set) — or when the creator's account only supports
  private posting — the publish is resolved to **Only me** (`SELF_ONLY`). When TikTok
  rejects a non-private choice with the sandbox error (`unaudited_client_can_only_post_to_private_accounts`),
  the app automatically retries the publish with **SELF_ONLY** and shows an info notice.
- Contact for this review: hello@postio-app.cz