"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageCircle, Bug, Lightbulb, HelpCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { submitFeedback } from "@/lib/actions/feedback";

type FeedbackType = "bug" | "feature" | "other";

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const t = useTranslations("feedback");
  const [type, setType] = useState<FeedbackType>("other");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error(t("messageRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitFeedback({ type, message: message.trim() });
      if (result.success) {
        toast.success(t("submitSuccess"));
        setMessage("");
        setType("other");
        onOpenChange(false);
      } else {
        toast.error(result.error || t("submitError"));
      }
    } catch {
      toast.error(t("submitError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] rounded-[20px] border-white/10 bg-[#09090b]/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <MessageCircle className="h-5 w-5 text-purple-400" />
            {t("title")}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Type selector */}
          <div className="space-y-2">
            <Label htmlFor="feedback-type" className="text-sm text-gray-300">
              {t("typeLabel")}
            </Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as FeedbackType)}
              disabled={submitting}
            >
              <SelectTrigger
                id="feedback-type"
                className="bg-white/5 border-white/10 text-white"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#09090b] border-white/10">
                <SelectItem value="bug" className="text-white focus:bg-white/10">
                  <div className="flex items-center gap-2">
                    <Bug className="h-4 w-4 text-red-400" />
                    <span>{t("typeBug")}</span>
                  </div>
                </SelectItem>
                <SelectItem value="feature" className="text-white focus:bg-white/10">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-400" />
                    <span>{t("typeFeature")}</span>
                  </div>
                </SelectItem>
                <SelectItem value="other" className="text-white focus:bg-white/10">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-blue-400" />
                    <span>{t("typeOther")}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message textarea */}
          <div className="space-y-2">
            <Label htmlFor="feedback-message" className="text-sm text-gray-300">
              {t("messageLabel")}
            </Label>
            <Textarea
              id="feedback-message"
              placeholder={t("messagePlaceholder")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={submitting}
              rows={5}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
            className="border-white/10 text-gray-300 hover:bg-white/5"
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !message.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              t("submit")
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
