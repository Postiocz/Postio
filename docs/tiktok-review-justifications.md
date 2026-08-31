# TikTok App Review – Scope Justifications

> **Purpose**: Professional, copy-paste ready explanations for the TikTok app-review
> portal (Scopes section). Each scope explains *why* Postio requests it and frames
> the need from a **User Experience** and **Content Management** perspective.
>
> **App**: Postio — a productivity tool that lets content creators schedule and
> publish posts across multiple social networks from a single dashboard. The user
> stays in full control of every submission: nothing is ever posted automatically
> without an explicit action, and each publish can be reviewed, scheduled, or
> cancelled by the creator before it goes live.

---

## Scope: `user.info.basic`

### Why we need it

Postio is a publishing cockpit for creators who manage several accounts. To show
the correct connected identity and let the user choose which TikTok account they
are publishing from, we need basic profile information. `user.info.basic` grants a
read-only look at the public profile data of the account the user has authorized
on TikTok's consent screen — the display name and avatar are used to render the
connected account inside Postio and to confirm to the user "you are publishing
from this account".

**User Experience**: The account is displayed with its real name and avatar, so the
user can instantly recognize and verify which TikTok profile is connected and will
be used for publishing. This removes ambiguity ("did I connect the right account?")
and reduces the risk of posting to the wrong identity.

**Content Management**: By identifying the connected account, Postio can associate
every scheduled or published video with the correct social profile, keep the
Accounts overview accurate, and store the connection so the same account can be
used again without re-authorizing every time.

---

## Scope: `video.upload`

### Why we need it

Postio's core workflow lets a creator attach a video file to a post and deliver it
to TikTok. To transfer that file to TikTok's servers, the Content Posting API
requires the `video.upload` permission. Without it, TikTok would not accept the
video content the user explicitly selected in the editor. The upload is initiated
only after the user clicks **Publish** (or schedules and the publish time arrives
— an action the user set up beforehand).

**User Experience**: The user selects a video and clicks one button. Postio then
uploads that exact video to TikTok's infrastructure and reports progress, so the
creator does not need to download and re-upload manually on each network. The
video content is never read or used for anything other than what the user sends.

**Content Management**: The permission supports the "post once, publish to many"
model — the same media the user prepared in Postio is delivered intact to TikTok
with correct file transfers and reliable error handling. Content remains fully
owned and controlled by the creator; Postio is only the carrier the user
explicitly points at TikTok.

---

## Scope: `video.publish`

### Why we need it

This is the action that actually publishes the uploaded video to the creator's
TikTok account under the settings the user chose (privacy level, comments, duet and
stitch settings). `video.publish` is required for the Content Posting API to move a
video from "uploaded" to "live on the profile".

**User Experience**: The user retains full editorial control. In Postio's editor
they set a title and, if desired, the privacy level ("Public", "Friends", or "Only
me") and the video is published exactly as configured. Every submission is an
explicit, user-triggered action — **nothing is posted automatically without the
user's intent**, and unpublished/scheduled drafts that the creator cancels are
never sent.

**Content Management**: Postio is a scheduling and content-management tool: creators
prepare content in advance, review it, and release it when they choose. `video.publish`
lets those prepared videos reach the profile at the scheduled moment while keeping a
log of what was published — so creative teams and solo creators can manage a steady,
on-brand publishing rhythm across all their networks from one place.

---

## Summary (optional short paragraph for the portal)

> Postio is a productivity and content-management application. The requested scopes
> enable creators to connect their TikTok account, upload a video they selected, and
> publish it under settings they control — all initiated by an explicit user action.
> Postio never posts without the user's intent, never reads private content, and
> stores each connected account so creators can manage all their networks from a
> single dashboard.