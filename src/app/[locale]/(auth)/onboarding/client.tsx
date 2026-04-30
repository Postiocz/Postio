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

// Social icons not in lucide-react – inline SVGs
const Instagram = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

const Facebook = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const Linkedin = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

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
