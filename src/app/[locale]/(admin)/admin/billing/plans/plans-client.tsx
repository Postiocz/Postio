"use client";

/**
 * Admin – Správa tarifů (Client Component)
 * Umožňuje editaci, vytváření, mazání a archivaci tarifů
 * Lokalizované názvy dle systémového jazyka (locale)
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Pencil, Loader2, RotateCcw, Eye, EyeOff, Plus, Trash2, Archive,
  Languages,
} from "lucide-react";
import {
  updatePricingPlan,
  createPricingPlan,
  deletePricingPlan,
  resetSinglePlanToMaster,
  togglePlanVisibility,
  translatePlanName,
} from "@/lib/actions/pricing-plans";
import { toast } from "sonner";
import type { Database } from "@/lib/supabase/types";

type PricingPlan = Database["public"]["Tables"]["pricing_plans"]["Row"];

interface Props {
  activePlans: PricingPlan[];
  customPlans: PricingPlan[];
  archivedPlans: PricingPlan[];
  masterTemplates: PricingPlan[];
  locale: string;
  translations: Record<string, string>;
}

export function PricingPlansClient({
  activePlans,
  customPlans,
  archivedPlans,
  masterTemplates,
  locale,
  translations,
}: Props) {
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [resettingPlanId, setResettingPlanId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [translating, setTranslating] = useState<{ target: string; name: string } | null>(null);
  const [aiTranslations, setAiTranslations] = useState<{ en?: string; uk?: string }>({
    en: "",
    uk: "",
  });
  const [descTranslations, setDescTranslations] = useState<{ en?: string; uk?: string }>({
    en: "",
    uk: "",
  });
  const [translatingDesc, setTranslatingDesc] = useState<{ target: string; name: string } | null>(null);
  const [badgeTranslations, setBadgeTranslations] = useState<{ en?: string; uk?: string }>({
    en: "",
    uk: "",
  });
  const [translatingBadge, setTranslatingBadge] = useState<{ target: string; name: string } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "custom" as string,
    description: "",
    badge_text: "",
    is_recommended: false,
    badge_color: "#6366F1",
    price_czk: 0,
    price_eur: 0,
    price_usd: 0,
    ai_credits: 0,
    twitter_credits: 0,
    max_accounts: 1,
    max_posts_per_month: 10,
    max_subscriptions: 0,
  });

  // Vrací lokalizovaný název plánu dle systémového jazyka
  const localizedName = (plan: PricingPlan): string => {
    if (locale === "en" && plan.name_en) return plan.name_en;
    if (locale === "uk" && plan.name_uk) return plan.name_uk;
    return plan.name;
  };

  const openEdit = (plan: PricingPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      type: plan.type,
      description: plan.description || "",
      badge_text: plan.badge_text || "",
      is_recommended: plan.is_recommended || false,
      badge_color: plan.badge_color || "#6366F1",
      price_czk: plan.price_czk,
      price_eur: plan.price_eur,
      price_usd: plan.price_usd,
      ai_credits: plan.ai_credits,
      twitter_credits: plan.twitter_credits,
      max_accounts: plan.max_accounts,
      max_posts_per_month: plan.max_posts_per_month || 0,
      max_subscriptions: plan.max_subscriptions || 0,
    });
    setAiTranslations({ en: plan.name_en || "", uk: plan.name_uk || "" });
    setDescTranslations({ en: plan.description_en || "", uk: plan.description_uk || "" });
    setBadgeTranslations({ en: plan.badge_text_en || "", uk: plan.badge_text_uk || "" });
  };

  const openCreate = () => {
    setIsCreating(true);
    setAiTranslations({ en: "", uk: "" });
    setDescTranslations({ en: "", uk: "" });
    setBadgeTranslations({ en: "", uk: "" });
    setFormData({
      name: "",
      type: "custom",
      description: "",
      badge_text: "",
      is_recommended: false,
      badge_color: "#6366F1",
      price_czk: 0,
      price_eur: 0,
      price_usd: 0,
      ai_credits: 0,
      twitter_credits: 0,
      max_accounts: 1,
      max_posts_per_month: 10,
      max_subscriptions: 0,
    });
  };

  const handleSave = async () => {
    if (!editingPlan) return;
    setIsSaving(true);

    const updates: Database["public"]["Tables"]["pricing_plans"]["Update"] = {
      name: formData.name,
      description: formData.description,
      badge_text: formData.badge_text,
      is_recommended: formData.is_recommended,
      badge_color: formData.badge_color,
      price_czk: formData.price_czk,
      price_eur: formData.price_eur,
      price_usd: formData.price_usd,
      ai_credits: formData.ai_credits,
      twitter_credits: formData.twitter_credits,
      max_accounts: formData.max_accounts,
      max_posts_per_month: formData.max_posts_per_month === 0 ? null : formData.max_posts_per_month,
      max_subscriptions: formData.max_subscriptions === 0 ? null : formData.max_subscriptions,
    };

    if (aiTranslations.en) updates.name_en = aiTranslations.en;
    if (aiTranslations.uk) updates.name_uk = aiTranslations.uk;
    if (descTranslations.en) updates.description_en = descTranslations.en;
    if (descTranslations.uk) updates.description_uk = descTranslations.uk;
    if (badgeTranslations.en) updates.badge_text_en = badgeTranslations.en;
    if (badgeTranslations.uk) updates.badge_text_uk = badgeTranslations.uk;

    const result = await updatePricingPlan(editingPlan.id, updates);
    setIsSaving(false);
    if (result.success) {
      toast.success("Tarif byl aktualizován");
      setEditingPlan(null);
      setAiTranslations({ en: "", uk: "" });
      setDescTranslations({ en: "", uk: "" });
      setBadgeTranslations({ en: "", uk: "" });
    } else {
      toast.error(result.error || "Nepodařilo se uložit změny");
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Zadejte název plánu");
      return;
    }
    setIsSaving(true);

    const planData: Database["public"]["Tables"]["pricing_plans"]["Insert"] = {
      name: formData.name.trim(),
      type: "free",
      is_custom: true,
      is_visible: true,
      description: formData.description,
      badge_text: formData.badge_text,
      is_recommended: formData.is_recommended,
      badge_color: formData.badge_color,
      price_czk: formData.price_czk,
      price_eur: formData.price_eur,
      price_usd: formData.price_usd,
      ai_credits: formData.ai_credits,
      twitter_credits: formData.twitter_credits,
      max_accounts: formData.max_accounts,
      max_posts_per_month: formData.max_posts_per_month === 0 ? null : formData.max_posts_per_month,
      max_subscriptions: formData.max_subscriptions === 0 ? null : formData.max_subscriptions,
    };

    if (aiTranslations.en) planData.name_en = aiTranslations.en;
    if (aiTranslations.uk) planData.name_uk = aiTranslations.uk;
    if (descTranslations.en) planData.description_en = descTranslations.en;
    if (descTranslations.uk) planData.description_uk = descTranslations.uk;
    if (badgeTranslations.en) planData.badge_text_en = badgeTranslations.en;
    if (badgeTranslations.uk) planData.badge_text_uk = badgeTranslations.uk;

    const result = await createPricingPlan(planData);
    setIsSaving(false);
    if (result.success) {
      toast.success("Vlastní plán vytvořen");
      setIsCreating(false);
    } else {
      toast.error(result.error || "Nepodařilo se vytvořit plán");
    }
  };

  const handleDelete = async (planId: string, planName: string) => {
    if (!confirm(`${translations.deleteConfirm} "${planName}"?`)) return;
    const result = await deletePricingPlan(planId);
    if (result.success) toast.success(`Plán "${planName}" smazán`);
    else toast.error(result.error || "Nepodařilo se smazat plán");
  };

  const handleResetSingle = async (planType: string, planId: string, planName: string) => {
    const confirmMsg = `${translations.resetSingleConfirm} ${planName}?`;
    if (!confirm(confirmMsg)) return;
    setResettingPlanId(planId);
    const result = await resetSinglePlanToMaster(planType as "free" | "creator" | "pro");
    setResettingPlanId(null);
    if (result.success) toast.success(translations.resetSuccess);
    else toast.error(result.error || translations.resetError);
  };

  const handleToggleVisibility = async (planId: string) => {
    const result = await togglePlanVisibility(planId);
    if (result.success) toast.success("Viditelnost změněna");
    else toast.error(result.error || "Nepodařilo se změnit viditelnost");
  };

  const handleTranslateBadge = useCallback(
    async (targetLocale: "en" | "uk") => {
      const text = formData.badge_text;
      if (!text.trim()) {
        toast.error("Nejprve zadejte text odznaku");
        return;
      }
      setTranslatingBadge({ target: targetLocale, name: text });
      const result = await translatePlanName(text, targetLocale);
      setTranslatingBadge(null);
      if (result.success && result.translatedName) {
        setBadgeTranslations((prev) => ({ ...prev, [targetLocale]: result.translatedName! }));
        toast.success("Odznak přeložen do " + (targetLocale === "en" ? "angličtiny" : "ukrajinštiny"));
      } else {
        toast.error(result.error || "Překlad selhal");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData.badge_text]
  );

  const handleTranslateDesc = useCallback(
    async (targetLocale: "en" | "uk") => {
      const text = formData.description;
      if (!text.trim()) {
        toast.error("Nejprve zadejte popisek plánu");
        return;
      }
      setTranslatingDesc({ target: targetLocale, name: text });
      const result = await translatePlanName(text, targetLocale);
      setTranslatingDesc(null);
      if (result.success && result.translatedName) {
        setDescTranslations((prev) => ({ ...prev, [targetLocale]: result.translatedName! }));
        toast.success("Popisek přeložen do " + (targetLocale === "en" ? "angličtiny" : "ukrajinštiny"));
      } else {
        toast.error(result.error || "Překlad selhal");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData.description]
  );

  const handleTranslate = useCallback(
    async (targetLocale: "en" | "uk") => {
      const name = formData.name || editingPlan?.name || "";
      if (!name.trim()) {
        toast.error("Nejprve zadejte název plánu");
        return;
      }
      setTranslating({ target: targetLocale, name });
      const result = await translatePlanName(name, targetLocale);
      setTranslating(null);
      if (result.success && result.translatedName) {
        setAiTranslations((prev) => ({ ...prev, [targetLocale]: result.translatedName! }));
        toast.success(`Překlad do ${targetLocale === "en" ? "angličtiny" : "ukrajinštiny"} hotov`);
      } else {
        toast.error(result.error || "Překlad selhal");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData.name, editingPlan]
  );

  const renderPlanCard = (plan: PricingPlan, showType = false, showActions = true) => {
    const isResetting = resettingPlanId === plan.id;
    const isCustom = plan.is_custom;
    const isArchived = !plan.is_visible;
    const displayName = localizedName(plan);

    return (
      <div
        key={plan.id}
        className={`rounded-[20px] border p-6 backdrop-blur-xl flex flex-col ${
          isArchived
            ? "border-gray-800 bg-gray-900/40 opacity-60"
            : isCustom
            ? "border-purple-500/20 bg-purple-500/5"
            : "border-white/10 bg-[#09090b]/80"
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-lg font-semibold text-white truncate">{displayName}</h3>
            {isCustom && (
              <Badge className="bg-purple-500/20 text-purple-300 text-[10px] px-1.5 py-0 shrink-0">
                Vlastní
              </Badge>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
            {(plan.name_en || plan.name_uk) && (
              <div className="flex gap-1.5">
                {plan.name_en && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300">
                    EN: {plan.name_en}
                  </span>
                )}
                {plan.name_uk && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-300">
                    UK: {plan.name_uk}
                  </span>
                )}
              </div>
            )}
            {showType && (
              <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-300">
                {plan.type}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2 text-sm flex-1">
          {[
            [translations.priceCzk, plan.price_czk === 0 ? translations.free : `${plan.price_czk / 100} Kč`],
            [translations.priceEur, plan.price_eur === 0 ? translations.free : `${plan.price_eur / 100} EUR`],
            [translations.priceUsd, plan.price_usd === 0 ? translations.free : `$${plan.price_usd / 100}`],
          ].map(([label, value]) => (
            <div key={label as string} className="flex justify-between">
              <span className="text-gray-400">{label as string}</span>
              <span className="text-white font-medium">{value as string}</span>
            </div>
          ))}
          <div className="border-t border-white/10 my-3" />
          <div className="flex justify-between">
            <span className="text-gray-400">{translations.aiCredits}</span>
            <span className="text-white">{plan.ai_credits}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">{translations.twitterCredits}</span>
            <span className="text-white">{plan.twitter_credits}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">{translations.maxAccounts}</span>
            <span className="text-white">
              {plan.max_accounts === -1 ? "∞" : plan.max_accounts}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">{translations.maxPosts}</span>
            <span className="text-white">
              {plan.max_posts_per_month === null ? "∞" : plan.max_posts_per_month}
            </span>
          </div>
          {plan.max_subscriptions !== null && plan.max_subscriptions > 0 && (
            <div className="flex justify-between border-t border-white/5 pt-2">
              <span className="text-gray-400">{translations.subscribersCount}</span>
              <span className="text-white">
                {plan.current_subscriptions} / {plan.max_subscriptions}
              </span>
            </div>
          )}
        </div>

        {showActions && (
          <div className="flex gap-2 mt-4">
            <Button onClick={() => openEdit(plan)} variant="outline" size="sm" className="flex-1 gap-2">
              <Pencil className="h-4 w-4" />
              {translations.editPlan}
            </Button>
            {!isCustom && !isArchived && (
              <Button
                onClick={() => handleResetSingle(plan.type, plan.id, displayName)}
                disabled={isResetting}
                variant="ghost" size="sm"
                title={translations.resetToMaster}
              >
                {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              </Button>
            )}
            <Button
              onClick={() => handleToggleVisibility(plan.id)}
              variant="ghost" size="sm"
              title={plan.is_visible ? translations.hidePlan : translations.showPlan}
            >
              {plan.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            {isCustom && (
              <Button
                onClick={() => handleDelete(plan.id, displayName)}
                variant="ghost" size="sm"
                title={translations.deletePlan}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Active Plans – responzivní grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {activePlans.map((plan) => renderPlanCard(plan, true))}
      </div>

      {/* Custom Plans Section */}
      {customPlans.length > 0 && (
        <section className="space-y-4 mt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">{translations.customPlans}</h2>
            </div>
            <Button onClick={openCreate} variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              {translations.createPlan}
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {customPlans.map((plan) => renderPlanCard(plan, false))}
          </div>
        </section>
      )}

      {customPlans.length === 0 && (
        <div className="mt-8 flex justify-center">
          <Button onClick={openCreate} variant="outline" size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            {translations.createPlan}
          </Button>
        </div>
      )}

      {archivedPlans.length > 0 && (
        <section className="space-y-4 mt-8">
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-400">{translations.archivedPlans}</h2>
            <span className="text-xs text-gray-500">({archivedPlans.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedPlans.map((plan) => renderPlanCard(plan, false))}
          </div>
        </section>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
        <DialogContent className="sm:max-w-[480px] lg:max-w-[540px] rounded-[20px] bg-[#0a0a0f] border-white/10">
          <DialogHeader>
            <DialogTitle>
              {translations.editPlan}: {editingPlan?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {editingPlan?.is_custom && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-400">{translations.planName}</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full"
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">{translations.description}</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-[12px] border border-white/10 bg-transparent px-3 py-2 text-sm text-white placeholder-gray-500 resize-none"
                rows={2}
                placeholder="Popisek plánu"
              />
                <div className="flex gap-3">
                  <TranslateFieldButtons targetLocale="en" onTranslate={handleTranslateDesc} translating={!!(translatingDesc?.target === "en")} result={descTranslations.en} />
                  <TranslateFieldButtons targetLocale="uk" onTranslate={handleTranslateDesc} translating={!!(translatingDesc?.target === "uk")} result={descTranslations.uk} />
                </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">{translations.badgeText}</label>
              <Input
                value={formData.badge_text}
                onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                className="w-full"
                placeholder="Např. Doporučujeme"
              />
                <div className="flex gap-3">
                  <TranslateFieldButtons targetLocale="en" onTranslate={handleTranslateBadge} translating={!!(translatingBadge?.target === "en")} result={badgeTranslations.en} />
                  <TranslateFieldButtons targetLocale="uk" onTranslate={handleTranslateBadge} translating={!!(translatingBadge?.target === "uk")} result={badgeTranslations.uk} />
                </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-400">{translations.isRecommended}</label>
              <Switch
                checked={formData.is_recommended}
                onCheckedChange={(checked) => setFormData({ ...formData, is_recommended: checked })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">{translations.badgeColor}</label>
              <div className="flex gap-2 items-center flex-wrap">
                {["#6366F1", "#8B5CF6", "#EC4899", "#EF4444", "#F59E0B", "#10B981", "#06B6D4", "#FFFFFF", "#000000"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, badge_color: color })}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      formData.badge_color === color ? "border-white scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <PlanInputs formData={formData} setFormData={setFormData} translations={translations} />
          </div>
          <DialogFooter className="flex flex-col gap-2 overflow-y-auto max-h-[300px]">
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={() => setEditingPlan(null)} className="flex-1">{translations.cancel}</Button>
              <Button onClick={handleSave} disabled={isSaving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {translations.saveChanges}
              </Button>
            </div>

          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={isCreating} onOpenChange={() => setIsCreating(false)}>
        <DialogContent className="sm:max-w-[480px] lg:max-w-[540px] rounded-[20px] bg-[#0a0a0f] border-white/10">
          <DialogHeader>
            <DialogTitle>{translations.createPlan}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">{translations.planName}</label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full" placeholder="Např. Creator - Zima" />
                <div className="flex gap-3">
                  <TranslateFieldButtons targetLocale="en" onTranslate={handleTranslate} translating={!!(translating?.target === "en")} result={aiTranslations.en} />
                  <TranslateFieldButtons targetLocale="uk" onTranslate={handleTranslate} translating={!!(translating?.target === "uk")} result={aiTranslations.uk} />
                </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">{translations.description}</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-[12px] border border-white/10 bg-transparent px-3 py-2 text-sm text-white placeholder-gray-500 resize-none"
                rows={2}
                placeholder="Popisek plánu"
              />
                <div className="flex gap-3">
                  <TranslateFieldButtons targetLocale="en" onTranslate={handleTranslateDesc} translating={!!(translatingDesc?.target === "en")} result={descTranslations.en} />
                  <TranslateFieldButtons targetLocale="uk" onTranslate={handleTranslateDesc} translating={!!(translatingDesc?.target === "uk")} result={descTranslations.uk} />
                </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">{translations.badgeText}</label>
              <Input
                value={formData.badge_text}
                onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                className="w-full"
                placeholder="Např. Doporučujeme"
              />
                <div className="flex gap-3">
                  <TranslateFieldButtons targetLocale="en" onTranslate={handleTranslateBadge} translating={!!(translatingBadge?.target === "en")} result={badgeTranslations.en} />
                  <TranslateFieldButtons targetLocale="uk" onTranslate={handleTranslateBadge} translating={!!(translatingBadge?.target === "uk")} result={badgeTranslations.uk} />
                </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-400">{translations.isRecommended}</label>
              <Switch
                checked={formData.is_recommended}
                onCheckedChange={(checked) => setFormData({ ...formData, is_recommended: checked })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">{translations.badgeColor}</label>
              <div className="flex gap-2 items-center flex-wrap">
                {["#6366F1", "#8B5CF6", "#EC4899", "#EF4444", "#F59E0B", "#10B981", "#06B6D4", "#FFFFFF", "#000000"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, badge_color: color })}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      formData.badge_color === color ? "border-white scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <PlanInputs formData={formData} setFormData={setFormData} translations={translations} />
          </div>
          <DialogFooter className="flex flex-col gap-2 overflow-y-auto max-h-[300px]">
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={() => setIsCreating(false)} className="flex-1">{translations.cancel}</Button>
              <Button onClick={handleCreate} disabled={isSaving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {translations.saveChanges}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TranslateFieldButtons({
  targetLocale,
  onTranslate,
  translating,
  result,
}: {
  targetLocale: "en" | "uk";
  onTranslate: (locale: "en" | "uk") => void;
  translating: boolean;
  result: string | undefined;
}) {
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <button
        type="button"
        onClick={() => onTranslate(targetLocale)}
        disabled={translating}
        className="text-[10px] text-indigo-400 hover:text-indigo-300 disabled:opacity-50 flex items-center gap-0.5"
      >
        {translating ? (
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
        ) : (
          <Languages className="h-2.5 w-2.5" />
        )}
        {targetLocale === "en" ? "EN" : "UK"}
      </button>
      {result && <span className="text-[10px] text-gray-500 truncate max-w-[100px]">{result}</span>}
    </div>
  );
}

function PlanInputs({
  formData,
  setFormData,
  translations,
}: {
  formData: typeof defaultFormData;
  setFormData: (d: typeof defaultFormData) => void;
  translations: Record<string, string>;
}) {
  const fields = [
    { key: "price_czk", label: translations.priceCzk },
    { key: "price_eur", label: translations.priceEur },
    { key: "price_usd", label: translations.priceUsd },
    { key: "ai_credits", label: translations.aiCredits },
    { key: "twitter_credits", label: translations.twitterCredits },
    { key: "max_accounts", label: translations.maxAccounts },
    { key: "max_posts_per_month", label: translations.maxPosts },
    { key: "max_subscriptions", label: translations.maxSubscriptions },
  ] as const;

  return (
    <>
      {fields.map(({ key, label }) => (
        <div key={key} className="flex flex-col sm:grid sm:grid-cols-3 items-start sm:items-center gap-1 sm:gap-4">
          <label className="text-sm text-gray-400">{label}</label>
          <Input
            type="number"
            value={String(formData[key as keyof typeof formData])}
            onChange={(e) => setFormData({ ...formData, [key]: parseInt(e.target.value) || 0 })}
            className="w-full"
          />
        </div>
      ))}
    </>
  );
}

const defaultFormData = {
  name: "",
  type: "custom",
  description: "",
  badge_text: "",
  is_recommended: false,
  badge_color: "#6366F1",
  price_czk: 0,
  price_eur: 0,
  price_usd: 0,
  ai_credits: 0,
  twitter_credits: 0,
  max_accounts: 1,
  max_posts_per_month: 10,
  max_subscriptions: 0,
};
