"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getAuditLogs } from "@/modules/admin-core/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Search,
  User,
  Database,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Activity,
  ShieldCheck,
  UserCheck,
  LogIn,
  FileEdit,
  Trash2,
  Settings
} from "lucide-react";

type AuditLog = {
  id: string;
  user_id: string;
  action: string;
  target_table: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user: { id: string; full_name: string | null } | null;
};

/** Formátuje metadata do čitelné podoby */
function formatMetadata(metadata: Record<string, unknown> | null): { label: string; value: string }[] {
  if (!metadata || Object.keys(metadata).length === 0) return [];
  return Object.entries(metadata).map(([key, value]) => ({
    label: key.replace(/_/g, " "),
    value: typeof value === "object" ? JSON.stringify(value) : String(value),
  }));
}

export default function AdminAuditLogPage() {
  const t = useTranslations("adminAuditLog");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /** Vrací ikonu, barvu a lokalizovaný popisek podle typu akce */
  const getActionStyle = (action: string) => {
    if (action.includes("role_changed_to_admin")) return { icon: ShieldCheck, color: "bg-indigo-600", label: t("actionPromoted") };
    if (action.includes("role_changed_to_user")) return { icon: UserCheck, color: "bg-gray-600", label: t("actionDemoted") };
    if (action.includes("login")) return { icon: LogIn, color: "bg-emerald-600", label: t("actionLogin") };
    if (action.includes("create")) return { icon: FileEdit, color: "bg-blue-600", label: t("actionCreate") };
    if (action.includes("update") || action.includes("edit")) return { icon: FileEdit, color: "bg-amber-600", label: t("actionUpdate") };
    if (action.includes("delete")) return { icon: Trash2, color: "bg-red-600", label: t("actionDelete") };
    if (action.includes("settings")) return { icon: Settings, color: "bg-purple-600", label: t("actionSettings") };
    return { icon: Activity, color: "bg-gray-600", label: action };
  };

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      try {
        const data = await getAuditLogs();
        setLogs(data as AuditLog[]);
        setFilteredLogs(data as AuditLog[]);
      } catch (err) {
        console.error("Failed to load audit logs:", err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  // Filtrování a vyhledávání
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredLogs(logs);
      return;
    }
    const term = searchTerm.toLowerCase();
    setFilteredLogs(
      logs.filter((log) =>
        log.action.toLowerCase().includes(term) ||
        log.user?.full_name?.toLowerCase().includes(term) ||
        log.user_id.toLowerCase().includes(term) ||
        log.target_table?.toLowerCase().includes(term) ||
        log.target_id?.toLowerCase().includes(term) ||
        JSON.stringify(log.metadata).toLowerCase().includes(term)
      )
    );
  }, [searchTerm, logs]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
          <p className="text-gray-400 text-sm mt-1">{t("subtitle")}</p>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Activity className="h-4 w-4" />
          <span>{logs.length} {t("records")}</span>
        </div>
      </div>

      {/* Vyhledávání */}
      <Card className="bg-[#09090b]/80 border-white/10 rounded-[20px]">
        <CardContent className="pt-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-black/50 border-white/10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Seznam audit logů */}
      <Card className="bg-[#09090b]/80 border-white/10 rounded-[20px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <FileText className="h-5 w-5 text-indigo-400" />
            {t("historyTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
                <p className="text-gray-400 mt-2">{t("loading")}</p>
              </div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <h3 className="text-white font-medium">{t("noRecordsTitle")}</h3>
              <p className="text-gray-400 text-sm mt-1">
                {searchTerm
                  ? `"${searchTerm}"`
                  : t("noRecordsDesc")}
              </p>
              {!searchTerm && (
                <p className="text-gray-500 text-xs mt-2">
                  {t("noRecordsHint")}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => {
                const actionStyle = getActionStyle(log.action);
                const ActionIcon = actionStyle.icon;
                const metaFields = formatMetadata(log.metadata);
                const hasDetails = metaFields.length > 0 || log.target_id;
                const isExpanded = expandedId === log.id;

                return (
                  <div
                    key={log.id}
                    className="p-4 rounded-[20px] bg-black/30 border border-white/10 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      {/* Levá část — akce a kdo */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`mt-0.5 p-1.5 rounded-lg ${actionStyle.color}/20`}>
                          <ActionIcon className={`h-4 w-4 ${actionStyle.color} text-white`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={`${actionStyle.color} hover:${actionStyle.color} border-0`}>
                              {actionStyle.label}
                            </Badge>
                            {log.user?.full_name && (
                              <span className="text-sm text-gray-300 truncate">
                                {log.user.full_name}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                            {log.target_table && (
                              <span className="flex items-center gap-1">
                                <Database className="h-3 w-3" />
                                {log.target_table}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(log.created_at).toLocaleString("cs-CZ")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Pravá část — tlačítka */}
                      <div className="flex items-center gap-2 shrink-0">
                        {hasDetails && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpand(log.id)}
                            className="text-gray-400 hover:text-white hover:bg-white/5"
                          >
                            {isExpanded ? (
                              <><ChevronUp className="h-4 w-4 mr-1" /> {t("hideDetail")}</>
                            ) : (
                              <><ChevronDown className="h-4 w-4 mr-1" /> {t("showDetail")}</>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Rozbalené detaily */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                        {/* Metadata */}
                        {metaFields.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {metaFields.map((field, i) => (
                              <div key={i} className="flex flex-col gap-0.5">
                                <span className="text-xs text-gray-500 uppercase tracking-wider">
                                  {field.label}
                                </span>
                                <span className="text-sm text-gray-300 font-mono break-all">
                                  {field.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Technické detaily */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/5">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-gray-500 uppercase tracking-wider">{t("eventId")}</span>
                            <span className="text-xs text-gray-600 font-mono">{log.id}</span>
                          </div>
                          {log.target_id && (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs text-gray-500 uppercase tracking-wider">{t("targetId")}</span>
                              <span className="text-xs text-gray-600 font-mono">{log.target_id}</span>
                            </div>
                          )}
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-gray-500 uppercase tracking-wider">{t("userIdLabel")}</span>
                            <span className="text-xs text-gray-600 font-mono">{log.user_id}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Informace o počtu */}
              <div className="text-center text-xs text-gray-600 pt-2">
                {t("showingCount", { count: filteredLogs.length, total: logs.length })}
                {logs.length >= 200 && ` ${t("maxRecords")}`}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
