/**
 * Admin – Globální billing přehled
 * Zobrazuje statistiky předplatných a faktury ze Stripe
 * i18n: namespace adminBillingPage
 */

import { getTranslations } from "next-intl/server";
import { getAllSubscriptions, getAllInvoices, getBillingStats } from "@/modules/admin-core/actions";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { CreditCard, Users, Zap, Crown, ArrowUpRight } from "lucide-react";
import { MetricCard } from "@/modules/admin-core/components/metric-card";
import Link from "next/link";

export const dynamic = "force-dynamic";

const statusColors: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  canceled: "bg-gray-500/20 text-gray-400",
  incomplete: "bg-yellow-500/20 text-yellow-400",
  past_due: "bg-red-500/20 text-red-400",
  trialing: "bg-blue-500/20 text-blue-400",
};

export default async function AdminBillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const t = await getTranslations({ locale: localeParam, namespace: "adminBillingPage" });
  const stats = await getBillingStats();
  const subscriptions = await getAllSubscriptions();
  const invoices = await getAllInvoices();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white md:text-3xl">{t("title")}</h1>
        <p className="text-sm text-gray-400">{t("subtitle")}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t("totalUsers")}
          value={stats.totalUsers.toString()}
          icon={Users}
        />
        <MetricCard
          title={t("free")}
          value={stats.freeUsers.toString()}
          icon={Users}
        />
        <MetricCard
          title={t("creator")}
          value={stats.creatorUsers.toString()}
          icon={Zap}
        />
        <MetricCard
          title={t("pro")}
          value={stats.proUsers.toString()}
          icon={Crown}
        />
      </div>

      {/* Subscriptions table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{t("subscriptions")}</h2>
          <Link
            href="https://dashboard.stripe.com/subscriptions"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {t("openInStripe")} <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="overflow-x-auto rounded-[20px] border border-white/10 bg-[#09090b]/80 backdrop-blur-xl">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t("customer")}
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t("plan")}
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t("status")}
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t("created")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    {t("noSubscriptions")}
                  </td>
                </tr>
              ) : (
                subscriptions.map((subscription) => {
                  const customer = subscription.customer;
                  const customerEmail =
                    typeof customer === "object" && customer !== null
                      ? "email" in customer
                        ? customer.email
                        : null
                      : null;
                  const customerName =
                    typeof customer === "object" && customer !== null
                      ? "name" in customer
                        ? customer.name
                        : null
                      : null;
                  const firstItem = subscription.items.data[0];
                  const planName =
                    firstItem?.price?.nickname ||
                    firstItem?.price?.id ||
                    "Creator/Pro";

                  return (
                    <tr
                      key={subscription.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">
                            {customerName || t("unknown")}
                          </span>
                          <span className="text-xs text-gray-500">
                            {customerEmail || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-white">{planName}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={
                            statusColors[subscription.status] || statusColors.canceled
                          }
                        >
                          {subscription.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {format(
                          new Date(subscription.created * 1000),
                          "PP",
                          { locale: cs }
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoices table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{t("invoices")}</h2>
          <Link
            href="https://dashboard.stripe.com/invoices"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {t("openInStripe")} <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="overflow-x-auto rounded-[20px] border border-white/10 bg-[#09090b]/80 backdrop-blur-xl">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t("invoiceNumber")}
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t("customer")}
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t("amount")}
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t("status")}
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t("created")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    {t("noInvoices")}
                  </td>
                </tr>
              ) : (
                  invoices.map((invoice) => {
                    const customer = invoice.customer;
                    const customerEmail =
                      typeof customer === "object" && customer !== null
                        ? "email" in customer
                          ? customer.email
                          : null
                        : null;
                    const customerName =
                      typeof customer === "object" && customer !== null
                        ? "name" in customer
                          ? customer.name
                          : null
                        : null;
                    const amount =
                      (invoice.total || 0) / 100;
                    const currency = invoice.currency || "czk";

                    return (
                      <tr
                        key={invoice.id}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-white">
                            {invoice.number || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-white">
                              {customerName || t("unknown")}
                            </span>
                            <span className="text-xs text-gray-500">
                              {customerEmail || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-white">
                            {amount.toLocaleString("cs-CZ", {
                              style: "currency",
                              currency: currency.toUpperCase(),
                            })}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            className={
                              invoice.status === "paid"
                                ? statusColors.active
                                : invoice.status === "open"
                                ? statusColors.incomplete
                                : invoice.status === "void" ||
                                  invoice.status === "uncollectible"
                                ? statusColors.canceled
                                : statusColors.past_due
                            }
                          >
                            {invoice.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">
                          {format(
                            new Date(invoice.created * 1000),
                            "PP",
                            { locale: cs }
                          )}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
