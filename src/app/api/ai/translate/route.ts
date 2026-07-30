import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, targetLocale } = body as {
      name?: string;
      targetLocale?: "en" | "uk";
    };

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Missing 'name' in request body" },
        { status: 400 }
      );
    }

    if (!targetLocale || !["en", "uk"].includes(targetLocale)) {
      return NextResponse.json(
        { error: "Missing or invalid 'targetLocale'. Must be 'en' or 'uk'." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey || apiKey === "" || apiKey === "undefined" || apiKey === "null") {
      // Demo fallback
      const demoTranslations: Record<string, Record<string, string>> = {
        en: {
          "Free": "Free",
          "Creator": "Creator",
          "Pro": "Pro",
          "Creator - Zima": "Creator - Winter",
        },
        uk: {
          "Free": "Безкоштовний",
          "Creator": "Створювач",
          "Pro": "Про",
          "Creator - Zima": "Створювач - Зима",
        },
      };

      const fallback = demoTranslations[targetLocale]?.[name] || name;
      return NextResponse.json({
        success: true,
        translatedName: fallback,
        isDemo: true,
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview",
    });

    const targetLang = targetLocale === "en" ? "English" : "Ukrainian";
    const prompt = `Translate this plan name to ${targetLang}. Return ONLY the translated name, nothing else. No quotes, no explanation.

Name: "${name}"`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const translated = response.text().trim();

    return NextResponse.json({
      success: true,
      translatedName: translated,
    });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 }
    );
  }
}