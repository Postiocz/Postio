"use client";

/**
 * Admin – Správa tarifů (Client Component)
 * Umožňuje editaci aktivních tarifů a reset k master templates
 */

import { useState } from "react";
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
import { Pencil, RefreshCw, Loader2, RotateCcw, Eye, EyeOff } from "lucide-react";
import {
  updatePricingPlan,
  resetSinglePlanToMaster,
  togglePlanVisibility,
} from "@/lib/actions/pricing-plans";
import { toast } from "sonner";
import type { Database } from "@/lib/supabase/types";

type PricingPlan = Database["public"]["Tables"]["pricing_plans"]["Row"];

interface Props {
  plans: PricingPlan[];
  masterTemplates: PricingPlan[];
  translations: {
    resetToMaster: string;
    resetConfirm: string;
    resetSingleConfirm: string;
    resetSuccess: string;
    resetError: string;
    editPlan: string;
    saveChanges: string;
    cancel: string;
    priceCzk: string;
    priceEur: string;
    priceUsd: string;
    aiCredits: string;
    twitterCredits: string;
    maxAccounts: string;
    maxPosts: string;
    unlimited: string;
    free: string;
  };
}

export function PricingPlansClient({ plans, masterTemplates, translations }: Props) {
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [resettingPlanId, setResettingPlanId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state pro editaci
  const [formData, setFormData] = useState({
    price_czk: 0,
    price_eur: 0,
    price_usd: 0,
    ai_credits: 0,
    twitter_credits: 0,
    max_accounts: 1,
    max_posts_per_month: 10,
  });

  const handleEdit = (plan: PricingPlan) => {
    setEditingPlan(plan);
    setFormData({
      price_czk: plan.price_czk,
      price_eur: plan.price_eur,
      price_usd: plan.price_usd,
      ai_credits: plan.ai_credits,
      twitter_credits: plan.twitter_credits,
      max_accounts: plan.max_accounts,
      max_posts_per_month: plan.max_posts_per_month || 0,
    });
  };

  const handleSave = async () => {
    if (!editingPlan) return;

    setIsSaving(true);
    const result = await updatePricingPlan(editingPlan.id, {
      price_czk: formData.price_czk,
      price_eur: formData.price_eur,
      price_usd: formData.price_usd,
      ai_credits: formData.ai_credits,
      twitter_credits: formData.twitter_credits,
      max_accounts: formData.max_accounts,
      max_posts_per_month: formData.max_posts_per_month === 0 ? null : formData.max_posts_per_month,
    });

    setIsSaving(false);

    if (result.success) {
      toast.success("Tarif byl aktualizován");
      setEditingPlan(null);
    } else {
      toast.error(result.error || "Nepodařilo se uložit změny");
    }
  };

  const handleResetSingle = async (planType: "free" | "creator" | "pro", planId: string, planName: string) => {
    const confirmMessage = `${translations.resetSingleConfirm} ${planName}?`;
    if (!confirm(confirmMessage)) return;

    setResettingPlanId(planId);
    const result = await resetSinglePlanToMaster(planType);
    setResettingPlanId(null);

    if (result.success) {
      toast.success(translations.resetSuccess);
    } else {
      toast.error(result.error || translations.resetError);
    }
  };

  const handleToggleVisibility = async (planId: string) => {
    const result = await togglePlanVisibility(planId);

    if (result.success) {
      toast.success("Viditelnost změněna");
    } else {
      toast.error(result.error || "Nepodařilo se změnit viditelnost");
    }
  };

  // Najdi master template pro daný typ tarifu
  const getMasterForType = (type: string) => {
    return masterTemplates.find((m) => m.type === type);
  };

  return (
    <>
      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const master = getMasterForType(plan.type);
          const hasChanges =
            master &&
            (plan.price_czk !== master.price_czk ||
              plan.price_eur !== master.price_eur ||
              plan.price_usd !== master.price_usd ||
              plan.ai_credits !== master.ai_credits ||
              plan.twitter_credits !== master.twitter_credits);
          const isResetting = resettingPlanId === plan.id;

          return (
            <div
              key={plan.id}
              className="rounded-[20px] border border-white/10 bg-[#09090b]/80 backdrop-blur-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <div className="flex items-center gap-2">
                  {hasChanges && (
                    <Badge className="bg-yellow-500/20 text-yellow-400">
                      Upraveno
                    </Badge>
                  )}
                  <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-300">
                    {plan.type}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">{translations.priceCzk}</span>
                  <span className="text-white font-medium">
                    {plan.price_czk === 0
                      ? translations.free
                      : `${plan.price_czk / 100} Kč`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{translations.priceEur}</span>
                  <span className="text-white font-medium">
                    {plan.price_eur === 0
                      ? translations.free
                      : `${plan.price_eur / 100} EUR`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{translations.priceUsd}</span>
                  <span className="text-white font-medium">
                    {plan.price_usd === 0
                      ? translations.free
                      : `$${plan.price_usd / 100}`}
                  </span>
                </div>
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
                    {plan.max_posts_per_month === null
                      ? "∞"
                      : plan.max_posts_per_month}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={() => handleEdit(plan)}
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  {translations.editPlan}
                </Button>
                <Button
                  onClick={() => handleResetSingle(plan.type, plan.id, plan.name)}
                  disabled={isResetting}
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  title={translations.resetToMaster}
                >
                  {isResetting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  onClick={() => handleToggleVisibility(plan.id)}
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  title={plan.is_visible ? "Skrýt" : "Zobrazit"}
                >
                  {plan.is_visible ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-[20px] bg-[#0a0a0f] border-white/10">
          <DialogHeader>
            <DialogTitle>
              {translations.editPlan}: {editingPlan?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 items-center gap-4">
              <label className="text-sm text-gray-400">{translations.priceCzk}</label>
              <Input
                type="number"
                value={formData.price_czk}
                onChange={(e) =>
                  setFormData({ ...formData, price_czk: parseInt(e.target.value) || 0 })
                }
                className="col-span-2"
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <label className="text-sm text-gray-400">{translations.priceEur}</label>
              <Input
                type="number"
                value={formData.price_eur}
                onChange={(e) =>
                  setFormData({ ...formData, price_eur: parseInt(e.target.value) || 0 })
                }
                className="col-span-2"
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <label className="text-sm text-gray-400">{translations.priceUsd}</label>
              <Input
                type="number"
                value={formData.price_usd}
                onChange={(e) =>
                  setFormData({ ...formData, price_usd: parseInt(e.target.value) || 0 })
                }
                className="col-span-2"
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <label className="text-sm text-gray-400">{translations.aiCredits}</label>
              <Input
                type="number"
                value={formData.ai_credits}
                onChange={(e) =>
                  setFormData({ ...formData, ai_credits: parseInt(e.target.value) || 0 })
                }
                className="col-span-2"
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <label className="text-sm text-gray-400">{translations.twitterCredits}</label>
              <Input
                type="number"
                value={formData.twitter_credits}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    twitter_credits: parseInt(e.target.value) || 0,
                  })
                }
                className="col-span-2"
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <label className="text-sm text-gray-400">{translations.maxAccounts}</label>
              <Input
                type="number"
                value={formData.max_accounts}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_accounts: parseInt(e.target.value) || 1,
                  })
                }
                className="col-span-2"
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <label className="text-sm text-gray-400">{translations.maxPosts}</label>
              <Input
                type="number"
                value={formData.max_posts_per_month}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_posts_per_month: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="0 = neomezeno"
                className="col-span-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlan(null)}>
              {translations.cancel}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {translations.saveChanges}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
