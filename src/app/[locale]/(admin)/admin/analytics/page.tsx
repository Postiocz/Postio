"use client";

import { useEffect, useState } from "react";
import { getNewUsersOverTime, getMRR } from "@/modules/admin-core/actions";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign } from "lucide-react";

export default function AdminAnalyticsPage() {
  const [userGrowth, setUserGrowth] = useState<any[]>([]);
  const [mrr, setMrr] = useState<{ mrr: number; currency: string }>({
    mrr: 0,
    currency: "czk",
  });

  useEffect(() => {
    async function loadData() {
      const [users, mrrData] = await Promise.all([
        getNewUsersOverTime(),
        getMRR(),
      ]);
      setUserGrowth(users);
      setMrr(mrrData);
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-[#09090b]/80 border-white/10 rounded-[20px]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Noví uživatelé (12 měsíců)
            </CardTitle>
            <Users className="h-5 w-5 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {userGrowth.reduce((sum, item) => sum + item.count, 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#09090b]/80 border-white/10 rounded-[20px]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              MRR
            </CardTitle>
            <DollarSign className="h-5 w-5 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {(mrr.mrr / 100).toLocaleString("cs-CZ", {
                style: "currency",
                currency: mrr.currency.toUpperCase(),
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#09090b]/80 border-white/10 rounded-[20px]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Churn Rate
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">0%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-[#09090b]/80 border-white/10 rounded-[20px]">
          <CardHeader>
            <CardTitle className="text-white">Růst nových uživatelů</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="month" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#09090b",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                  }}
                  labelStyle={{ color: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#6366F1"
                  strokeWidth={3}
                  dot={{
                    fill: "#6366F1",
                    stroke: "#6366F1",
                    strokeWidth: 2,
                    r: 4,
                  }}
                  activeDot={{
                    fill: "#818CF8",
                    stroke: "#6366F1",
                    strokeWidth: 3,
                    r: 6,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
