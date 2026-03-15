"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface PricePoint {
  probability: number;
  source: string;
  createdAt: string;
}

interface PriceChartProps {
  marketId: string;
  currentProbability: number;
  createdAt: string;
}

export function PriceChart({ marketId, currentProbability, createdAt }: PriceChartProps) {
  const [data, setData] = useState<Array<{ date: string; prob: number; source: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/markets/history?marketId=${marketId}`)
      .then((r) => r.json())
      .then((history: PricePoint[]) => {
        const points = [
          // Market creation point (always starts at 50%)
          {
            date: new Date(createdAt).toLocaleDateString("tr-TR", { month: "short", day: "numeric" }),
            prob: 50,
            source: "INITIAL",
          },
          ...history.map((h) => ({
            date: new Date(h.createdAt).toLocaleDateString("tr-TR", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            prob: Math.round(h.probability * 100),
            source: h.source,
          })),
        ];

        // Add current point if different from last
        const lastPoint = points[points.length - 1];
        const currentPct = Math.round(currentProbability * 100);
        if (!lastPoint || lastPoint.prob !== currentPct) {
          points.push({
            date: "Simdi",
            prob: currentPct,
            source: "CURRENT",
          });
        }

        setData(points);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [marketId, currentProbability, createdAt]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-400">Yukleniyor...</p>
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-400">Henuz yeterli veri yok</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
        Olasilik Gecmisi
      </h4>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="probGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `%${v}`}
            width={35}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "none",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#f3f4f6",
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => [`%${value}`, "Evet"]}
            labelStyle={{ color: "#9ca3af", fontSize: "11px" }}
          />
          <Area
            type="monotone"
            dataKey="prob"
            stroke="#0d9488"
            strokeWidth={2}
            fill="url(#probGradient)"
            dot={(props) => {
              const { cx, cy, payload } = props;
              if (payload.source === "POLYMARKET") {
                return (
                  <circle
                    key={`dot-${cx}-${cy}`}
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill="#6366f1"
                    stroke="#fff"
                    strokeWidth={1}
                  />
                );
              }
              return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={0} />;
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center gap-4 text-[10px] text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-teal-500" /> Trade
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" /> Polymarket
        </span>
      </div>
    </div>
  );
}
