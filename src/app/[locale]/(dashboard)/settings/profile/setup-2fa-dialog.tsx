"use client";

import { useState, useRef, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { confirm2FASetup, generate2FASetup } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Shield,
  QrCode,
  Check,
  Copy,
  Key,
  AlertTriangle,
  X,
} from "lucide-react";

interface Setup2FADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function Setup2FADialog({
  open,
  onOpenChange,
  onSuccess,
}: Setup2FADialogProps) {
  const t = useTranslations("settings");
  const [step, setStep] = useState<"setup" | "recovery">("setup");
  const [secret, setSecret] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [codesCopied, setCodesCopied] = useState(false);
  const [codesConfirmed, setCodesConfirmed] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleClose = () => {
    setStep("setup");
    setSecret("");
    setQrCode("");
    setTotpCode("");
    setError("");
    setRecoveryCodes([]);
    setCodesCopied(false);
    setCodesConfirmed(false);
    onOpenChange(false);
  };

  const handleInit = async () => {
    setLoading(true);
    setError("");
    const result = await generate2FASetup();
    setLoading(false);
    if (result.success && result.qrCode && result.secret) {
      setSecret(result.secret);
      setQrCode(result.qrCode);
    } else {
      setError(result.error || "Failed to generate 2FA setup");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setConfirming(true);

    const formData = new FormData();
    formData.append("totp_code", totpCode);
    formData.append("secret", secret);

    const result = await confirm2FASetup(
      { error: null, success: false },
      formData
    );

    setConfirming(false);

    if (result.success && result.recoveryCodes) {
      setRecoveryCodes(result.recoveryCodes);
      setStep("recovery");
    } else if (result.error === "invalid_code") {
      setError(t("invalidCode"));
    } else {
      setError(result.error || "An error occurred");
    }
  };

  const handleCopyCodes = () => {
    const text = recoveryCodes.join("\n");
    navigator.clipboard.writeText(text);
    setCodesCopied(true);
    setTimeout(() => setCodesCopied(false), 2000);
  };

  const handleComplete = () => {
    handleClose();
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg rounded-[20px] bg-background/95 backdrop-blur-xl border border-white/10 text-foreground p-0 overflow-hidden">
        {step === "setup" ? (
          <>
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle className="flex items-center gap-3 text-lg sm:text-xl">
                <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-indigo-400" />
                </div>
                {t("setup2FATitle")}
              </DialogTitle>
            </DialogHeader>

            <div className="px-6 pb-6">
              {!qrCode ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                  <div className="h-16 w-16 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <QrCode className="h-8 w-8 text-indigo-400" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center max-w-xs">
                    {t("qrCodeInstructions")}
                  </p>
                  <Button
                    onClick={handleInit}
                    disabled={loading}
                    className="rounded-xl"
                  >
                    {loading ? t("loading") : t("enable2FA")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Steps */}
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>{t("setup2FAStep1")}</p>
                    <p>{t("setup2FAStep2")}</p>
                    <p>{t("setup2FAStep3")}</p>
                  </div>

                  {/* QR Code */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-white/10">
                      <img
                        src={qrCode}
                        alt="QR Code"
                        className="w-48 h-48 object-contain"
                      />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-widest">
                        {t("secretCode")}
                      </p>
                      <p className="text-sm font-mono bg-muted/50 rounded-lg px-3 py-1.5 tracking-wider select-all">
                        {secret}
                      </p>
                    </div>
                  </div>

                  {/* Verification Input */}
                  <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="totpCode">{t("verificationCodeLabel")}</Label>
                      <Input
                        id="totpCode"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={totpCode}
                        onChange={(e) =>
                          setTotpCode(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder={t("verificationCodePlaceholder")}
                        className="rounded-xl text-center text-lg tracking-[0.5em] font-mono"
                      />
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 text-sm text-red-500">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        {error}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        type="submit"
                        disabled={confirming || totpCode.length !== 6}
                        className="rounded-xl flex-1"
                      >
                        {confirming ? (
                          <>
                            <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin mr-2" />
                            {t("loading")}
                          </>
                        ) : (
                          t("confirmAndEnable")
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleClose}
                        className="rounded-xl"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle className="flex items-center gap-3 text-lg sm:text-xl">
                <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Key className="h-5 w-5 text-amber-400" />
                </div>
                {t("recoveryCodesTitle")}
              </DialogTitle>
            </DialogHeader>

            <div className="px-6 pb-6 space-y-4">
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm text-amber-300 font-medium">
                    {t("recoveryCodesWarning")}
                  </p>
                  <p className="text-xs text-amber-400/70">
                    {t("recoveryCodesDescription")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {recoveryCodes.map((code, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2 border border-white/5"
                  >
                    <span className="text-sm font-mono tracking-wider select-all">
                      {code}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={handleCopyCodes}
                className="rounded-xl w-full"
              >
                {codesCopied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    {t("recoveryCodesCopied")}
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    {t("copyRecoveryCodes")}
                  </>
                )}
              </Button>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={handleComplete}
                  className="rounded-xl flex-1"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {t("done")}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
