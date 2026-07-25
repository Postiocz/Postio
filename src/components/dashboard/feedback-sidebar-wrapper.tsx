"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { FeedbackModal } from "@/components/feedback-modal";

interface FeedbackSidebarWrapperProps {
  navItems: Array<{
    href: string;
    label: string;
    icon: string;
    badge?: string;
  }>;
  user: {
    email: string;
    name?: string;
  } | null;
  locale: string;
  isAdmin?: boolean;
  adminLabel?: string;
  authT: {
    logout: string;
    upgrade: string;
  };
  settingsLabels: {
    templates: string;
    analytics: string;
    inbox: string;
    profile: string;
    preferences: string;
    notifications: string;
    general: string;
    billing: string;
    labels: string;
    referrals: string;
    accountLabel: string;
    organizationLabel: string;
    featuresLabel: string;
  };
  feedbackLabel?: string;
  feedbackTooltip?: string;
  className?: string;
}

export function FeedbackSidebarWrapper(props: FeedbackSidebarWrapperProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <Sidebar
        {...props}
        onFeedbackClick={() => setFeedbackOpen(true)}
      />
      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}
