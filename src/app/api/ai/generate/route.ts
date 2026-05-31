import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const DEMO_RESPONSES: Record<string, string> = {
  improve: "🚀 This is a demo-improved version of your text. AI content has been enhanced with better engagement, clearer messaging, and more impactful language. Connect a valid Gemini API key for real AI improvements!",
  shorten: "⚡ Demo-shortened text: Your core message here, optimized for Twitter/X limits. Connect a valid Gemini API key for real AI shortening!",
  hashtags: "#demo #AI #socialmedia #contentcreator #Postio #marketing #trending #viral #demo_mode",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, text } = body as { action: string; text: string };

    console.log("🤖 AI REQUEST RECEIVED, ACTION:", action);

    if (!text || !action) {
      return NextResponse.json(
        { error: "Missing 'action' or 'text' in request body" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    console.log("🤖 API KEY PRESENT:", !!apiKey);

    if (!apiKey || apiKey === "" || apiKey === "undefined" || apiKey === "null") {
      console.warn("⚠️ GOOGLE_GEMINI_API_KEY is not set or empty. Returning demo response.");
      return NextResponse.json({
        success: true,
        action,
        result: DEMO_RESPONSES[action] || "Demo AI response.",
        isDemo: true,
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

    let prompt: string;

    switch (action) {
      case "improve":
        prompt = `Vylepši text příspěvku pro sociální sítě. Zachovej tón, oprav chyby, buď úderný. Vrať pouze čistý text bez uvozovek.

Text:
${text}`;
        break;

      case "shorten":
        prompt = `Zkrať tento text na maximum pro Twitter/X při zachování smyslu.

Text:
${text}`;
        break;

      case "hashtags":
        prompt = `Na základě textu vygeneruj 5-10 relevantních hashtagů. Vrať je jako řetězec oddělený mezerami, bez čárek.

Text:
${text}`;
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: improve, shorten, hashtags` },
          { status: 400 }
        );
    }

    console.log("🤖 Sending prompt to Gemini...");
    const result = await model.generateContent(prompt);
    const response = result.response;
    const generatedText = response.text().trim();
    console.log("🤖 Gemini response received, length:", generatedText.length);

    return NextResponse.json({
      success: true,
      action,
      result: generatedText,
    });
  } catch (error) {
    console.error("🤖 AI GENERATION ERROR:", error);
    if (error instanceof Error) {
      const msg = error.message;
      console.error("🤖 Error message:", msg);
      console.error("🤖 Error name:", error.name);

      if (msg.includes("401") || msg.includes("403")) {
        console.error(
          "AI AUTH ERROR: Prověř vazbu klíče na Service Account."
        );
      }
      if (msg.includes("429")) {
        console.error(
          "AI RATE LIMIT: Kredity vyčerpány. Přidej billing v AI Studio: https://aistudio.google.com/projects"
        );
      }
    }
    return NextResponse.json(
      { error: "Failed to generate AI content. Please try again." },
      { status: 500 }
    );
  }
}
