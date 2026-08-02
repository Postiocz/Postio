/**
 * Admin System Check – přehled stavu připojení k externím API
 * URL: /cs/admin/system-check
 * i18n: namespace adminSystemCheckPage
 */

import { getTranslations } from "next-intl/server";
import { getSystemStatus, type ServiceStatus } from "@/modules/admin-core/actions";
import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";

export const dynamic = "force-dynamic";

function StatusIcon({ connected }: { connected: boolean }) {
  if (connected) {
    return <CheckCircle2 className="h-5 w-5 text-green-400" />;
  }
  return <XCircle className="h-5 w-5 text-red-400" />;
}

function StatusBadge({ connected, t }: { connected: boolean; t: (key: string) => string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        connected
          ? "bg-green-500/10 text-green-400"
          : "bg-red-500/10 text-red-400"
      }`}
    >
      <StatusIcon connected={connected} />
      {connected ? t("connected") : t("notConnected")}
    </span>
  );
}

function ServiceRow({
  service,
  t,
}: {
  service: ServiceStatus;
  t: (key: string) => string;
}) {
  const labelKey = service.key;
  const translatedLabel =
    t(labelKey) !== labelKey ? t(labelKey) : service.label;

  return (
    <div className="flex items-center justify-between rounded-[20px] border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#09090b]/80 px-5 py-4 backdrop-blur-xl transition-all duration-200 hover:border-slate-300 dark:border-white/20">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-[12px] ${
            service.connected
              ? "bg-green-100 dark:bg-green-500/20 text-green-400"
              : "bg-red-100 dark:bg-red-500/20 text-red-400"
          }`}
        >
          {service.connected ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">{translatedLabel}</p>
          {service.connected && (
            <p className="text-xs text-slate-400 dark:text-gray-500">{t("connected")}</p>
          )}
          {!service.connected && (
            <p className="text-xs text-red-400/80">{t("notConnected")}</p>
          )}
        </div>
      </div>
      <StatusBadge connected={service.connected} t={t} />
    </div>
  );
}

export default async function AdminSystemCheckPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminSystemCheckPage" });
  const services = await getSystemStatus();

  const connectedCount = services.filter((s) => s.connected).length;
  const totalCount = services.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">{t("subtitle")}</p>
      </div>

      {/* Summary card */}
      <div className="rounded-[20px] border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#09090b]/80 p-5 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-indigo-100 dark:bg-indigo-500/20">
            <HelpCircle className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {t("connectionStatus")}
            </p>
            <p className="text-sm text-slate-500 dark:text-gray-400">
              {connectedCount} / {totalCount} {t("service").toLowerCase()} —{" "}
              {connectedCount === totalCount
                ? "✅"
                : connectedCount > totalCount / 2
                  ? "⚠️"
                  : "❌"}
            </p>
          </div>
        </div>
      </div>

      {/* Service list */}
      <div className="space-y-2">
        {services.map((service) => (
          <ServiceRow key={service.key} service={service} t={t} />
        ))}
      </div>
    </div>
  );
}
