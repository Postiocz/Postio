"use client";

import { useEffect, useState } from "react";
import { getAuditLogs } from "@/modules/admin-core/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

type AuditLog = {
  id: number;
  user_id: string;
  action: string;
  target_table: string | null;
  target_id: string | null;
  metadata: any;
  created_at: string;
};

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    async function loadLogs() {
      const data = await getAuditLogs();
      setLogs(data as AuditLog[]);
    }
    loadLogs();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Audit Log</h1>
      </div>

      <Card className="bg-[#09090b]/80 border-white/10 rounded-[20px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <FileText className="h-5 w-5 text-indigo-400" />
            Historie akcí
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-2 p-4 rounded-[20px] bg-black/30 border border-white/10"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-indigo-600 hover:bg-indigo-700">
                      {log.action}
                    </Badge>
                    {log.target_table && (
                      <span className="text-sm text-gray-400">
                        Tabulka: {log.target_table}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-300">
                    {new Date(log.created_at).toLocaleString("cs-CZ")}
                  </span>
                </div>
                {log.metadata && (
                  <div className="text-xs text-gray-500 font-mono">
                    {JSON.stringify(log.metadata, null, 2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
