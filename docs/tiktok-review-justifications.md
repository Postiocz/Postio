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

**User Experience**: The user picks a finished video in the editor, sets the title and
privacy, and clicks Publish. Under the hood the app uses `video.upload` to deliver the
file to TikTok. The user never has to switch tabs, re-record, or re-upload anywhere; the
whole flow happens in the same form they already use for their other networks.

**Content Management**: Uploading is only ever triggered by an explicit user action on a
post the user created. Videos uploaded through Postio are not stored, analyzed, or reused
beyond serving TikTok's own upload endpoint, and a post is never re-uploaded once it has
been published (duplicate uploads are blocked server-side).

---

## Scope: `video.publish`

### Justification

`video.publish` finalizes the Content Posting flow: after the upload, the app calls
`status/fetch` until TikTok reports the video is `PUBLISH_COMPLETE`, and the post is then
shown as **Published** on TikTok. Publishing happens solely for videos the current user
uploaded and chose to publish, and the app fully respects the user's privacy choice
(`PUBLIC_TO_EVERYONE`, `MUTUAL_FOLLOW_FRIENDS`, `SELF_ONLY`).

**User Experience**: Immediately after clicking Publish, the user sees live progress and a
clear success confirmation. There are no dead ends or silent failures - if publishing
fails, the app shows the reason and lets the user retry. This removes the friction of
manually switching to the TikTok app to post a video.

**Content Management**: Postio is a post-drafting and scheduling tool. Videos the user
writes and schedules are published to their own account on their schedule, with their
chosen privacy and options (comments, duet, stitch). The app does not publish anything the
user did not explicitly submit for publication.

---

## Supporting details (for the reviewer)

- The app never reads a user's TikTok feed, messages, or private data beyond the three uses
  described above.
- Every publish request is authenticated with the user's own access token (PKCE OAuth,
  server-side exchange, token stored encrypted in the database, automatic refresh).
- Privacy is enforced from the user's explicit selection; in development/sandbox mode the
  app additionally falls back to **Only me** (`SELF_ONLY`) because TikTok restricts
  unaudited apps to private posts.
- Contact for this review: hello@postio-app.cz