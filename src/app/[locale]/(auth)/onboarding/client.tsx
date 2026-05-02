"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  Link as LinkIcon,
  User,
  PartyPopper,
  Bird,
  X,
} from "lucide-react";
import {
  Instagram,
  Facebook,
  Linkedin,
} from "@/components/ui/social-icons";

// Social icons not in lucide-react – inline SVGs

const platforms = [
  { id: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-500" },
  { id: "facebook", label: "Facebook", icon: Facebook, color: "text-blue-600" },
  { id: "twitter", label: "Twitter/X", icon: Bird, color: "text-gray-900 dark:text-white" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "text-blue-700" },
];

const niches = [
  { id: "tech", key: "nicheTech" },
  { id: "lifestyle", key: "nicheLifestyle" },
  { id: "business", key: "nicheBusiness" },
  { id: "education", key: "nicheEducation" },
  { id: "other", key: "nicheOther" },
];

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const tCommon = useTranslations("common");
  const { locale } = useParams();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 state
  const [showForm, setShowForm] = useState(false);
  const [platform, setPlatform] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [connectError, setConnectError] = useState("");

  // Step 2 state
  const [fullName, setFullName] = useState("");
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);

  const nextBtnRef = useRef<HTMLButtonElement>(null);

  // Step 1: Connect account
  const handleConnectAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setConnectError("");

    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, accountName, accessToken }),
      });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error);

      setShowForm(false);
      setPlatform("");
      setAccountName("");
      setAccessToken("");
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : t("errorConnecting"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Complete onboarding
  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName }),
      });
      router.push(`/${locale}`);
    } catch {
      // ignore, let user retry
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleNiche = (id: string) => {
    setSelectedNiches((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
    );
  };

  const goNext = () => setStep((s) => s + 1);
  const goBack = () => setStep((s) => s - 1);

  // Step indicator
  const steps = [
    { icon: LinkIcon, label: t("step1") },
    { icon: User, label: t("step2") },
    { icon: PartyPopper, label: t("step3") },
  ];

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-4">
      {/* Progress steps */}
      <div className="mb-8 flex items-center gap-2 sm:gap-4">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                  isDone
                    ? "border-primary bg-primary text-primary-foreground"
                    : isActive
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`h-0.5 w-6 sm:w-12 ${
                    isDone ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg"
        >
          {/* Step 1: Connect Account */}
          {step === 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold">{t("step1")}</h2>
                <p className="mt-2 text-muted-foreground">{t("step1Subtitle")}</p>
              </div>

              {!showForm ? (
                <>
                  {/* Platform grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {platforms.map((p) => {
                      const Icon = p.icon;
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            setPlatform(p.id);
                            setShowForm(true);
                          }}
                          className="flex flex-col items-center gap-2 rounded-lg border-2 border-border bg-card p-4 transition-colors hover:border-primary hover:bg-accent"
                        >
                          <Icon className={`h-8 w-8 ${p.color}`} />
                          <span className="text-sm font-medium">{p.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={goNext}
                    ref={nextBtnRef}
                  >
                    {t("skipForNow")}
                  </Button>
                </>
              ) : (
                /* Connect form */
                <Card>
                  <CardContent className="space-y-4 pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const P = platforms.find((p) => p.id === platform)?.icon;
                          return P ? <P className="h-5 w-5" /> : null;
                        })()}
                        <span className="font-medium">
                          {platforms.find((p) => p.id === platform)?.label}
                        </span>
                      </div>
                      <button onClick={() => setShowForm(false)}>
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>

                    <form onSubmit={handleConnectAccount} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="accountName">{t("accountName")}</Label>
                        <Input
                          id="accountName"
                          value={accountName}
                          onChange={(e) => setAccountName(e.target.value)}
                          placeholder={t("accountName")}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accessToken">{t("accessToken")}</Label>
                        <Input
                          id="accessToken"
                          value={accessToken}
                          onChange={(e) => setAccessToken(e.target.value)}
                          placeholder={t("accessTokenPlaceholder")}
                          required
                        />
                      </div>
                      {connectError && (
                        <p className="text-sm text-destructive">{connectError}</p>
                      )}
                      <div className="flex gap-2">
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? t("connecting") : t("connectAccount")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowForm(false)}
                        >
                          {tCommon("cancel")}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 2: Profile Setup */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold">{t("step2")}</h2>
                <p className="mt-2 text-muted-foreground">{t("step2Subtitle")}</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t("fullName")}</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t("fullNamePlaceholder")}
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("selectInterests")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {niches.map((n) => {
                      const isSelected = selectedNiches.includes(n.id);
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => toggleNiche(n.id)}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground hover:bg-accent"
                          }`}
                        >
                          {t(n.key)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={goBack}>
                  {tCommon("back")}
                </Button>
                <Button className="flex-1" onClick={goNext}>
                  {t("next")}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 2 && (
            <div className="space-y-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <PartyPopper className="mx-auto h-16 w-16 text-primary" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold">{t("step3")}</h2>
                <p className="mt-2 text-muted-foreground">{t("step3Subtitle")}</p>
                <p className="mt-4 text-sm">{t("step3Message")}</p>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={handleComplete}
                disabled={isSubmitting}
              >
                {isSubmitting ? t("settingUpProfile") : t("startPublishing")}
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
