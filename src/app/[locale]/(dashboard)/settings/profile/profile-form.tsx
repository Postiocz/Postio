"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import {
  updateFullName,
  updateLanguage,
  updateBackupEmail,
  updatePassword,
  disable2FA,
  deleteAccount,
} from "./actions";
import Setup2FADialog from "./setup-2fa-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertCircle,
  Check,
  Camera,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ProfileFormLabels {
  email: string;
  emailVerified: string;
  emailNotVerifiedBadge: string;
  fullName: string;
  language: string;
  saved: string;
  photo: string;
  uploadPhoto: string;
  photoDescription: string;
  uploading: string;
  backupEmail: string;
  backupEmailPlaceholder: string;
  backupEmailDescription: string;
  password: string;
  changePassword: string;
  newPassword: string;
  confirmPassword: string;
  twoFactorAuth: string;
  twoFactorAuthDescription: string;
  twoFactorEnabled: string;
  twoFactorDisabled: string;
  enable2FA: string;
  disable2FA: string;
  twoFASuccess: string;
  dangerZone: string;
  dangerZoneDesc: string;
  deleteAccount: string;
  confirmPasswordDelete: string;
  deleteAccountConfirm: string;
  deletingAccount: string;
  switch: string;
  loading: string;
  save: string;
}

interface ProfileFormProps {
  fullName: string;
  email: string;
  emailVerified: boolean;
  language: string;
  avatarUrl: string | null;
  backupEmail: string;
  twoFactorEnabled: boolean;
  locale: string;
  labels: ProfileFormLabels;
}

export default function ProfileForm({
  fullName: initialFullName,
  email,
  emailVerified,
  language: initialLanguage,
  avatarUrl: initialAvatarUrl,
  backupEmail: initialBackupEmail,
  twoFactorEnabled: initial2FA,
  locale,
  labels,
}: ProfileFormProps) {
  const commonT = useTranslations("common");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current;

  const [fullName, setFullName] = useState(initialFullName);
  const [language, setLanguage] = useState(initialLanguage);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [backupEmail, setBackupEmail] = useState(initialBackupEmail);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(initial2FA);
  const [isUploading, setIsUploading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const [nameState, nameAction] = useActionState(updateFullName, {
    error: null,
    success: false,
  });
  const [langState, langAction] = useActionState(updateLanguage, {
    error: null,
    success: false,
  });
  const [backupState, backupAction] = useActionState(updateBackupEmail, {
    error: null,
    success: false,
  });
  const [passwordState, passwordAction] = useActionState(updatePassword, {
    error: null,
    success: false,
  });
  const [disable2FAState, disable2FAAction] = useActionState(disable2FA, {
    error: null,
    success: false,
  });
  const [deleteState, deleteAction] = useActionState(deleteAccount, {
    error: null,
    success: false,
  });

  const [nameSaved, setNameSaved] = useState(false);
  const [langSaved, setLangSaved] = useState(false);
  const [backupSaved, setBackupSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [twoFASaved, setTwoFASaved] = useState(false);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    setNameSaved(false);
    startTransition(() => {
      nameAction(new FormData(e.currentTarget as HTMLFormElement));
    });
    setTimeout(() => setNameSaved(true), 500);
  };

  const handleSaveLanguage = (e: React.FormEvent) => {
    e.preventDefault();
    setLangSaved(false);
    startTransition(() => {
      langAction(new FormData(e.currentTarget as HTMLFormElement));
    });
    setTimeout(() => setLangSaved(true), 500);
  };

  const handleSaveBackup = (e: React.FormEvent) => {
    e.preventDefault();
    setBackupSaved(false);
    startTransition(() => {
      backupAction(new FormData(e.currentTarget as HTMLFormElement));
    });
    setTimeout(() => setBackupSaved(true), 500);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaved(false);
    startTransition(() => {
      passwordAction(new FormData(e.currentTarget as HTMLFormElement));
    });
    setTimeout(() => {
      setPasswordSaved(true);
      setNewPassword("");
    }, 500);
  };

  const handle2FASuccess = () => {
    setTwoFactorEnabled(true);
    setTwoFASaved(true);
    setTimeout(() => setTwoFASaved(false), 3000);
  };

  const handleDisable2FA = (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFASaved(false);
    startTransition(() => {
      disable2FAAction(new FormData(e.currentTarget as HTMLFormElement));
    });
    setTimeout(() => {
      setTwoFactorEnabled(false);
      setTwoFASaved(true);
    }, 500);
  };

  const handleDeleteAccount = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      deleteAction(new FormData(e.currentTarget as HTMLFormElement));
    });
  };

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
        const fileExt = file.name.split(".").pop();
        const userId = (await supabase.auth.getUser()).data.user?.id;
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        const { error: dbError } = await supabase
          .from("users")
          .update({ avatar_url: urlData.publicUrl })
          .eq("id", userId);

        if (dbError) throw dbError;

        setAvatarUrl(urlData.publicUrl);
      } catch {
        // Handle error
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [supabase]
  );

  const switchLocale = (newLocale: string) => {
    const currentLocale = pathname.split("/")[1];
    const nextPath = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
    const query = searchParams.toString();
    window.location.href = query ? `${nextPath}?${query}` : nextPath;
  };

  const cardClass =
    "rounded-[20px] border border-black/[0.08] dark:border-white/[0.06] bg-white/70 dark:bg-card/40 backdrop-blur-md p-4 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-none";

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Photo Section */}
      <div className={cardClass}>
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground/40 mb-4">
          {labels.photo}
        </h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Camera className="h-8 w-8 text-primary" />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <div className="h-3 w-3 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {labels.photoDescription}
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-sm text-primary hover:underline mt-1 disabled:opacity-50"
            >
              {isUploading ? labels.uploading : labels.uploadPhoto}
            </button>
          </div>
        </div>
      </div>

      {/* Email Section */}
      <div className={cardClass}>
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground/40 mb-3">
          {labels.email}
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 sm:px-4 py-2.5 text-sm text-muted-foreground/70 truncate">
            {email}
          </div>
          {emailVerified ? (
            <Badge
              variant="default"
              className="rounded-full gap-1 bg-green-500/20 text-green-400 border border-green-500/20 hover:bg-green-500/30 flex-shrink-0"
            >
              <CheckCircle2 className="size-3" />
              {labels.emailVerified}
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="rounded-full gap-1 bg-amber-500/20 text-amber-400 border border-amber-500/20 hover:bg-amber-500/30 flex-shrink-0"
            >
              <AlertCircle className="size-3" />
              {labels.emailNotVerifiedBadge}
            </Badge>
          )}
        </div>
      </div>

      {/* Full Name Section */}
      <div className={cardClass}>
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground/40 mb-3">
          {labels.fullName}
        </h2>
        <form onSubmit={handleSaveName} className="space-y-4">
          <div className="space-y-2">
            <Input
              id="fullName"
              name="full_name"
              defaultValue={fullName}
              onBlur={(e) => setFullName(e.target.value)}
              className="rounded-xl"
            />
          </div>
          {nameState.error && (
            <p className="text-sm text-red-500">{nameState.error}</p>
          )}
          {nameSaved && (
            <div className="flex items-center gap-1.5 text-sm text-green-500">
              <Check className="h-4 w-4" />
              {labels.saved}
            </div>
          )}
          <Button type="submit" disabled={isPending} className="rounded-xl">
            {isPending ? labels.loading : labels.save}
          </Button>
        </form>
      </div>

      {/* Backup Email Section */}
      <div className={cardClass}>
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground/40 mb-3">
          {labels.backupEmail}
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          {labels.backupEmailDescription}
        </p>
        <form onSubmit={handleSaveBackup} className="space-y-4">
          <div className="space-y-2">
            <Input
              id="backupEmail"
              name="backup_email"
              type="email"
              defaultValue={backupEmail}
              onBlur={(e) => setBackupEmail(e.target.value)}
              placeholder={labels.backupEmailPlaceholder}
              className="rounded-xl"
            />
          </div>
          {backupState.error && (
            <p className="text-sm text-red-500">{backupState.error}</p>
          )}
          {backupSaved && (
            <div className="flex items-center gap-1.5 text-sm text-green-500">
              <Check className="h-4 w-4" />
              {labels.saved}
            </div>
          )}
          <Button type="submit" disabled={isPending} className="rounded-xl">
            {isPending ? labels.loading : labels.save}
          </Button>
        </form>
      </div>

      {/* Password Section */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground/40">
            {labels.password}
          </h2>
          {!showPasswordForm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPasswordForm(true)}
              className="text-sm"
            >
              {labels.changePassword}
            </Button>
          )}
        </div>
        {showPasswordForm && (
          <form onSubmit={handleSavePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">{labels.newPassword}</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  name="new_password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            {passwordState.error && (
              <p className="text-sm text-red-500">{passwordState.error}</p>
            )}
            {passwordSaved && (
              <div className="flex items-center gap-1.5 text-sm text-green-500">
                <Check className="h-4 w-4" />
                {labels.saved}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={isPending} className="rounded-xl">
                {isPending ? labels.loading : labels.save}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowPasswordForm(false);
                  setNewPassword("");
                }}
              >
                {commonT("cancel")}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Two Factor Authentication Section */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground/40">
              {labels.twoFactorAuth}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {labels.twoFactorAuthDescription}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {twoFactorEnabled ? (
              <Badge
                variant="default"
                className="rounded-full gap-1 bg-green-500/20 text-green-400 border border-green-500/20"
              >
                <ShieldCheck className="size-3" />
                {labels.twoFactorEnabled}
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="rounded-full gap-1 bg-muted/50 text-muted-foreground border border-muted/50"
              >
                <ShieldOff className="size-3" />
                {labels.twoFactorDisabled}
              </Badge>
            )}
          </div>
        </div>
        {twoFactorEnabled ? (
          <form onSubmit={handleDisable2FA} className="space-y-4">
            {disable2FAState.error && (
              <p className="text-sm text-red-500">{disable2FAState.error}</p>
            )}
            {twoFASaved && (
              <div className="flex items-center gap-1.5 text-sm text-green-500">
                <Check className="h-4 w-4" />
                {labels.twoFASuccess}
              </div>
            )}
            <Button
              type="submit"
              variant="destructive"
              disabled={isPending}
              className="rounded-xl"
            >
              {isPending ? labels.loading : labels.disable2FA}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            {twoFASaved && (
              <div className="flex items-center gap-1.5 text-sm text-green-500">
                <Check className="h-4 w-4" />
                {labels.twoFASuccess}
              </div>
            )}
            <Button
              type="button"
              onClick={() => setShow2FADialog(true)}
              className="rounded-xl"
            >
              {labels.enable2FA}
            </Button>
          </div>
        )}
      </div>

      {/* 2FA Setup Dialog */}
      <Setup2FADialog
        open={show2FADialog}
        onOpenChange={setShow2FADialog}
        onSuccess={handle2FASuccess}
      />

      {/* Language Section */}
      <div className={cardClass}>
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground/40 mb-3">
          {labels.language}
        </h2>
        <form onSubmit={handleSaveLanguage} className="space-y-4">
          <div className="space-y-2">
            <select
              id="language"
              name="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="cs">Čeština</option>
              <option value="en">English</option>
              <option value="uk">Українська</option>
            </select>
          </div>
          {langState.error && (
            <p className="text-sm text-red-500">{langState.error}</p>
          )}
          {langSaved && (
            <div className="flex items-center gap-1.5 text-sm text-green-500">
              <Check className="h-4 w-4" />
              {labels.saved}
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <Button type="submit" disabled={isPending} className="rounded-xl">
              {isPending ? labels.loading : labels.save}
            </Button>
            {language !== locale && (
              <Button
                type="button"
                variant="outline"
                onClick={() => switchLocale(language)}
                className="rounded-xl"
              >
                {labels.switch}
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="rounded-[20px] border border-red-500/20 dark:border-red-500/30 bg-red-500/5 dark:bg-red-500/5 backdrop-blur-md p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <Trash2 className="h-4 w-4 text-red-500" />
          <h2 className="text-sm font-medium uppercase tracking-widest text-red-500/80">
            {labels.dangerZone}
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          {labels.dangerZoneDesc}
        </p>
        {!showDeleteForm ? (
          <Button
            variant="destructive"
            onClick={() => setShowDeleteForm(true)}
            className="rounded-xl"
          >
            {labels.deleteAccount}
          </Button>
        ) : (
          <form onSubmit={handleDeleteAccount} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deleteConfirm">{labels.confirmPasswordDelete}</Label>
              <Input
                id="deleteConfirm"
                name="confirmation"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={labels.deleteAccountConfirm}
                className="rounded-xl border-red-500/30"
              />
            </div>
            {deleteState.error && (
              <p className="text-sm text-red-500">{deleteState.error}</p>
            )}
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                variant="destructive"
                disabled={isPending || deleteConfirm !== "DELETE"}
                className="rounded-xl"
              >
                {isPending ? labels.deletingAccount : labels.deleteAccount}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowDeleteForm(false);
                  setDeleteConfirm("");
                }}
              >
                {commonT("cancel")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
