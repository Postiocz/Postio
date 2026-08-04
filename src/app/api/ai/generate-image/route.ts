import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// gpt-image-1 returns `b64_json` (base64). We decode it and store it in Supabase
// Storage ourselves – that needs Node's Buffer, so this route is NOT edge.
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { prompt } = body as { prompt?: string };

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: "Missing 'prompt' in request body" }, { status: 400 });
    }

    // Check ai_credits
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("ai_credits")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    if (userData.ai_credits <= 0) {
      return NextResponse.json(
        { error: "no_credits", message: "No AI credits remaining. Please upgrade your plan." },
        { status: 402 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
    }

    // Call OpenAI gpt-image-1 (dall-e-3 was retired in 2026).
    // The model always returns `b64_json` (base64) – `response_format` is not
    // accepted. `output_format: "png"` keeps the payload small.
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "medium",
        output_format: "png",
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("OpenAI API error:", err);
      const errPayload = err as { error?: { message?: string } };
      return NextResponse.json(
        { error: "Failed to generate image", details: errPayload?.error?.message ?? "Unknown error" },
        { status: response.status }
      );
    }

    const result = await response.json();
    const image = result.data?.[0] as { url?: string; b64_json?: string } | undefined;
    const base64 = image?.b64_json ?? null;
    let imageUrl = image?.url ?? null;

    // gpt-image-1 returns base64. Store it in Supabase Storage and hand back a
    // public URL so the rest of the app (preview, publish) sees a normal URL.
    if (!imageUrl && base64) {
      const png = Buffer.from(base64, "base64");
      const fileName = `ai-${user.id}-${Date.now()}.png`;
      const admin = await createAdminClient();
      const up = await admin.storage.from("post-media").upload(fileName, png, {
        contentType: "image/png",
        upsert: false,
      });
      if (up.error) {
        console.error("Storage upload error:", up.error);
        throw new Error("Failed to store generated image");
      }
      const pub = admin.storage.from("post-media").getPublicUrl(fileName).data;
      imageUrl = pub?.publicUrl ?? null;
    }

    if (!imageUrl) {
      return NextResponse.json({ error: "No image returned from AI" }, { status: 500 });
    }

    // KROK 3 (Prompt 057): atomic credit deduction. `.gte("ai_credits", 1)` makes
    // the UPDATE conditional server-side – it only decrements if the user still
    // has credits, closing the read-then-update race where two requests could
    // both read the same balance and overdraw.
    const { error: deductError } = await supabase
      .from("users")
      .update({ ai_credits: userData.ai_credits - 1 })
      .eq("id", user.id)
      .gte("ai_credits", 1);

    if (deductError) {
      console.error("Failed to deduct ai_credit:", deductError);
      // Still return the image — don't penalize users for backend bookkeeping failure
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      remainingCredits: userData.ai_credits - 1,
    });
  } catch (error) {
    console.error("AI generate-image error:", error);
    return NextResponse.json(
      { error: "Failed to generate image. Please try again." },
      { status: 500 }
    );
  }
}
