import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

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

    // Call OpenAI DALL-E 3
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        response_format: "url",
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("OpenAI API error:", err);
      return NextResponse.json(
        { error: "Failed to generate image", details: (err as Record<string, string>)?.error?.message || "Unknown error" },
        { status: response.status }
      );
    }

    const result = await response.json();
    const imageUrl = result.data?.[0]?.url;

    if (!imageUrl) {
      return NextResponse.json({ error: "No image URL returned from AI" }, { status: 500 });
    }

    // Deduct credit on success
    const { error: deductError } = await supabase
      .from("users")
      .update({ ai_credits: userData.ai_credits - 1 })
      .eq("id", user.id);

    if (deductError) {
      console.error("Failed to deduct ai_credit:", deductError);
      // Still return the image — don't penalize user for backend bookkeeping failure
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
