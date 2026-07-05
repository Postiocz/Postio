"use server";

import { createClient } from "@/lib/supabase/server";
import type { PostingSchedule } from "@/lib/supabase/types";

/**
 * Find the next available time slot in the user's posting schedule.
 *
 * Algorithm:
 * 1. Load user's timezone, posting_schedule, default_posting_time
 * 2. If no schedule or disabled → fallback to tomorrow at default_posting_time
 * 3. Iterate up to 30 days ahead, check each scheduled slot per day
 * 4. Skip slots that collide with existing scheduled posts (±15 min tolerance)
 * 5. Return the first free slot as ISO string
 * 6. If nothing found in 30 days → fallback 31 days at default_posting_time
 */
export async function getNextAvailableQueueSlot(): Promise<{
  success: boolean;
  scheduledAt?: string;
  error?: string;
}> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "You must be logged in." };
  }

  // Load user preferences
  const { data: userProfile, error: profileError } = await supabase
    .from("users")
    .select("timezone, posting_schedule, default_posting_time")
    .eq("id", user.id)
    .single();

  if (profileError || !userProfile) {
    return { success: false, error: profileError?.message ?? "User profile not found." };
  }

  const timezone = userProfile.timezone || "Europe/Prague";
  const defaultTime = userProfile.default_posting_time || "09:00";
  const schedule = userProfile.posting_schedule as PostingSchedule | null;

  // Fallback: no schedule or disabled → tomorrow at default time
  if (!schedule || !schedule.enabled) {
    return {
      success: true,
      scheduledAt: toUserTimezone(new Date(Date.now() + 86400000), defaultTime, timezone),
    };
  }

  // Load existing scheduled posts to detect collisions
  const { data: scheduledPlatforms } = await supabase
    .from("post_platforms")
    .select("scheduled_at")
    .eq("status", "scheduled")
    .not("scheduled_at", "is", null);

  const existingSlots = (scheduledPlatforms ?? [])
    .map((p) => p.scheduled_at)
    .filter(Boolean) as string[];

  const toleranceMs = 15 * 60 * 1000; // ±15 minutes
  const maxDays = 30;

  function isSlotFree(isoTime: string): boolean {
    const target = new Date(isoTime).getTime();
    return !existingSlots.some((s) => Math.abs(new Date(s).getTime() - target) <= toleranceMs);
  }

  // Iterate day by day for up to 30 days
  const today = new Date();
  for (let d = 0; d < maxDays; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() + d);

    // Use UTC day of week to match JSONB keys (0=Sunday … 6=Saturday)
    const dayKey = String(date.getUTCDay()) as keyof Omit<PostingSchedule, "enabled">;
    const slots = schedule[dayKey] ?? [];

    if (slots.length === 0) continue; // day is disabled in schedule

    for (const time of slots) {
      const candidate = toUserTimezone(date, time, timezone);
      if (isSlotFree(candidate)) {
        return { success: true, scheduledAt: candidate };
      }
    }
  }

  // Ultimate fallback: 31 days from now at default time
  return {
    success: true,
    scheduledAt: toUserTimezone(new Date(Date.now() + 31 * 86400000), defaultTime, timezone),
  };
}

/**
 * Create an ISO datetime for a given date and HH:MM time in the user's timezone.
 *
 * Strategy: build a UTC midnight date, then add the timezone offset so that
 * the resulting ISO string represents the intended local time.
 */
function toUserTimezone(date: Date, timeStr: string, tz: string): string {
  const [hours, minutes] = timeStr.split(":").map(Number);

  // Get the timezone offset at the target date/time using Intl
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Build a UTC date at the intended local time by using the formatter to detect offset
  const utc = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    hours,
    minutes,
    0,
    0
  ));

  // Format the UTC date in the target timezone to get the "wall clock" representation
  const parts = formatter.formatToParts(utc);
  const partMap = new Map(parts.map((p) => [p.type, p.value]));

  // Also get offset by comparing formatted time vs UTC time
  const utcFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const localHour = parseInt(partMap.get("hour") ?? "0", 10);
  const utcHour = parseInt(utcFormatter.format(utc), 10);
  const offsetHours = localHour - utcHour;

  // Adjust UTC time by the negative of the offset to get the correct instant
  const corrected = new Date(utc.getTime() - offsetHours * 3600000);

  return corrected.toISOString();
}
