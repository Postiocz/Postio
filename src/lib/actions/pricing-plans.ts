"use server";

/**
 * Pricing Plans – Server Actions
 * Správa dynamických tarifů s ochranou master templates
 */

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/types";
import { stripe } from "@/lib/stripe";

type PricingPlan = Database["public"]["Tables"]["pricing_plans"]["Row"];
type PricingPlanInsert = Database["public"]["Tables"]["pricing_plans"]["Insert"];
type PricingPlanUpdate = Database["public"]["Tables"]["pricing_plans"]["Update"];

/**
 * Načte všechny tarify (master templates + aktivní verze)
 */
export async function getAllPricingPlans(): Promise<PricingPlan[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("pricing_plans")
    .select("*")
    .order("type", { ascending: true })
    .order("is_master_template", { ascending: false });

  if (error) {
    console.error("Error fetching pricing plans:", error);
    return [];
  }

  return data || [];
}

/**
 * Načte pouze aktivní tarify (pro zobrazení uživatelům)
 */
export async function getActivePricingPlans(): Promise<PricingPlan[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("pricing_plans")
    .select("*")
    .eq("is_active", true)
    .order("type", { ascending: true });

  if (error) {
    console.error("Error fetching active pricing plans:", error);
    return [];
  }

  return data || [];
}

/**
 * Načte master templates (nedotknutelné originály)
 */
export async function getMasterTemplates(): Promise<PricingPlan[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("pricing_plans")
    .select("*")
    .eq("is_master_template", true)
    .order("type", { ascending: true });

  if (error) {
    console.error("Error fetching master templates:", error);
    return [];
  }

  return data || [];
}

/**
 * Aktualizuje aktivní tarif
 * POZOR: Neumožňuje upravovat master templates
 */
export async function updatePricingPlan(
  id: string,
  updates: PricingPlanUpdate
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Povol úpravu jakéhokoliv tarifu (master i non-master)
  // Master template je chráněn pouze proti smazání, ne proti úpravě

  const { error } = await supabase
    .from("pricing_plans")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Error updating pricing plan:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/billing/plans");
  revalidatePath("/settings/billing");
  revalidatePath("/");
  revalidatePath("/", "layout");
  
  // Stripe sync – vytvoř/aktualizuj ceny ve Stripe
  const { data: updatedPlan } = await supabase
    .from("pricing_plans")
    .select("*")
    .eq("id", id)
    .single();
  if (updatedPlan && updatedPlan.price_czk > 0) {
    const syncResult = await syncStripePrices(updatedPlan);
    if (!syncResult.success) {
      console.error("Stripe sync failed:", syncResult.error);
    }
  }
  
  return { success: true };
}

/**
 * Vytvoří novou verzi tarifu (z master template)
 */
export async function createPricingPlan(
  plan: PricingPlanInsert
): Promise<{ success: boolean; error?: string; data?: PricingPlan }> {
  const supabase = createAdminClient();

  // Nové tarify nejsou master templates
  const newPlan = { ...plan, is_master_template: false };

  const { data, error } = await supabase
    .from("pricing_plans")
    .insert(newPlan)
    .select()
    .single();

  if (error) {
    console.error("Error creating pricing plan:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/billing/plans");
  revalidatePath("/");
  revalidatePath("/", "layout");
  
  // Stripe sync – vytvoř ceny ve Stripe pro nový plán
  if (data && data.price_czk > 0) {
    const syncResult = await syncStripePrices(data);
    if (!syncResult.success) {
      console.error("Stripe sync failed:", syncResult.error);
    }
  }
  
  return { success: true, data };
}

/**
 * Smaže tarif (pouze non-master)
 */
export async function deletePricingPlan(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Ověř, že nejde o master template
  const { data: existing } = await supabase
    .from("pricing_plans")
    .select("is_master_template")
    .eq("id", id)
    .single();

  if (existing?.is_master_template) {
    return { success: false, error: "Cannot delete master template" };
  }

  const { error } = await supabase
    .from("pricing_plans")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting pricing plan:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/billing/plans");
  revalidatePath("/");
  return { success: true };
}

/**
 * Reset aktivních tarifů k původním hodnotám (z hardcoded backup)
 * Používá data přímo z original-plans.ts – nezávisle na DB master templates
 * To zajišťuje, že i při poškození DB máme funkční fallback
 */
export async function resetPricingPlansToMaster(): Promise<{
  success: boolean;
  error?: string;
  updatedCount?: number;
}> {
  const supabase = createAdminClient();

  // Načti původní hodnoty z hardcoded backup souboru
  const { ORIGINAL_PLANS } = await import("@/lib/constants/original-plans");

  let updatedCount = 0;

  // Pro každý původní tarif aktualizuj odpovídající aktivní tarif
  for (const original of ORIGINAL_PLANS) {
    // Najdi aktivní tarif stejného typu (non-master)
    const { data: activePlan } = await supabase
      .from("pricing_plans")
      .select("id")
      .eq("type", original.id)
      .eq("is_active", true)
      .eq("is_master_template", false)
      .single();

    if (activePlan) {
      // Aktualizuj existující aktivní tarif původními hodnotami
      const { error: updateError } = await supabase
        .from("pricing_plans")
        .update({
          price_czk: original.priceCzk,
          price_eur: original.priceEur,
          price_usd: original.priceUsd,
          ai_credits: original.aiCredits,
          twitter_credits: original.twitterCredits,
          max_accounts: original.maxAccounts,
          max_posts_per_month: original.maxPostsPerMonth === -1 ? null : original.maxPostsPerMonth,
        })
        .eq("id", activePlan.id);

      if (!updateError) updatedCount++;
    }
  }

  revalidatePath("/admin/billing/plans");
  revalidatePath("/settings/billing");
  revalidatePath("/"); // Landing page pricing section
  revalidatePath("/", "layout");
  return { success: true, updatedCount };
}

/**
 * Reset jednoho konkrétního tarifu k původním hodnotám
 */
export async function resetSinglePlanToMaster(
  planType: "free" | "creator" | "pro"
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Načti původní hodnoty z hardcoded backup
  const { ORIGINAL_PLANS } = await import("@/lib/constants/original-plans");
  const original = ORIGINAL_PLANS.find((p) => p.id === planType);

  if (!original) {
    return { success: false, error: "Original plan not found" };
  }

  // Najdi aktivní tarif tohoto typu
  const { data: activePlan } = await supabase
    .from("pricing_plans")
    .select("id, is_master_template")
    .eq("type", planType)
    .eq("is_active", true)
    .or("is_master_template.eq.false,is_master_template.eq.true")
    .limit(1)
    .single();

  if (!activePlan) {
    return { success: false, error: "Active plan not found" };
  }

  // Aktualizuj tarif na původní hodnoty (i pokud je to master template)
  const { error } = await supabase
    .from("pricing_plans")
    .update({
      price_czk: original.priceCzk,
      price_eur: original.priceEur,
      price_usd: original.priceUsd,
      ai_credits: original.aiCredits,
      twitter_credits: original.twitterCredits,
      max_accounts: original.maxAccounts,
      max_posts_per_month: original.maxPostsPerMonth === -1 ? null : original.maxPostsPerMonth,
    })
    .eq("id", activePlan.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/billing/plans");
  revalidatePath("/settings/billing");
  revalidatePath("/");
  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Přepne viditelnost tarifu (zobrazit/skrýt)
 */
export async function togglePlanVisibility(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { data: plan } = await supabase
    .from("pricing_plans")
    .select("is_visible")
    .eq("id", id)
    .single();

  if (!plan) {
    return { success: false, error: "Plan not found" };
  }

  const { error } = await supabase
    .from("pricing_plans")
    .update({ is_visible: !plan.is_visible })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/billing/plans");
  revalidatePath("/");
  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Přeloží název plánu pomocí Google AI (Gemini)
 * Target: "en" nebo "uk"
 */
export async function translatePlanName(
  name: string,
  targetLocale: "en" | "uk"
): Promise<{ success: boolean; error?: string; translatedName?: string }> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

  if (!apiKey || apiKey === "" || apiKey === "undefined" || apiKey === "null") {
    return {
      success: false,
      error: "Gemini API key not configured",
    };
  }

  const genAI = new (await import("@google/generative-ai")).GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

  const targetLang = targetLocale === "en" ? "English" : "Ukrainian";
  const prompt = `Translate this plan name to ${targetLang}. Return ONLY the translated name, nothing else.

Name: "${name}"`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const translated = response.text().trim();

    return { success: true, translatedName: translated };
  } catch (error) {
    console.error("Translation error:", error);
    return {
      success: false,
      error: "Translation failed",
    };
  }
}

/**
 * Stripe Sync – Vytvoří/aktualizuje Stripe ceny pro daný plán
 * Volá se automaticky při uložení ceny v Adminu.
 * Lookup key formats:
 *   Master templates: postio_{type}_monthly_{currency}
 *   Custom plans:     plan_{id}_{currency}
 */
async function syncStripePrices(
  plan: PricingPlan
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const currencies = [
    { field: "stripe_price_id_czk" as const, code: "czk" as const, amount: plan.price_czk },
    { field: "stripe_price_id_eur" as const, code: "eur" as const, amount: plan.price_eur },
    { field: "stripe_price_id_usd" as const, code: "usd" as const, amount: plan.price_usd },
  ];

  for (const { field, code, amount } of currencies) {
    // Skip free plans (price = 0)
    if (!amount || amount <= 0) continue;

    const lookupKey = plan.is_master_template
      ? `postio_${plan.type}_monthly_${code}`
      : `plan_${plan.id}_${code}`;

    try {
      // 1. Deactivate old price if it exists (from our DB record)
      const oldPriceId = plan[field as keyof PricingPlan] as string | null;
      if (oldPriceId) {
        try {
          await stripe.prices.update(oldPriceId, { active: false });
        } catch {
          // Old price might not exist anymore in Stripe – ignore
        }
      }

      // 2. For master templates: deactivate any other active prices sharing
      //    the same lookup_key (ensures only one active price per type+currency).
      //    For custom plans: skip this – each custom plan has a unique lookup_key
      //    (plan_{id}_{currency}), so no collision is possible with other plans.
      if (plan.is_master_template) {
        const existingPrices = await stripe.prices.list({
          lookup_keys: [lookupKey],
          active: true,
          limit: 10,
        });
        for (const ep of existingPrices.data) {
          if (ep.id !== oldPriceId) {
            await stripe.prices.update(ep.id, { active: false });
          }
        }
      }

      // 3. Create the new price
      const newPrice = await stripe.prices.create({
        unit_amount: amount,
        currency: code,
        product_data: {
          name: `Postio ${plan.type.charAt(0).toUpperCase() + plan.type.slice(1)}`,

        },
        recurring: { interval: "month" },
        lookup_key: lookupKey,
        metadata: {
          plan_type: plan.type,
          plan_name: plan.name,
        },
      });

      // 4. Update DB with new Stripe Price ID
      await supabase
        .from("pricing_plans")
        .update({ [field]: newPrice.id })
        .eq("id", plan.id);

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Stripe sync error for ${lookupKey}:`, msg);
      return { success: false, error: msg };
    }
  }

  return { success: true };
}
