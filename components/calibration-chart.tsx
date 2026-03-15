"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

interface CalibrationPoint {
  bucket: number; // predicted probability bucket (10, 20, ..., 90)
  actual: number; // actual win rate in that bucket
  count: number;  // number of predictions in that bucket
}

export function CalibrationChart() {
  const [data, setData] = useState<CalibrationPoint[]>([]);
  const [stats, setStats] = useState<{ total: number; wins: number; brierScore: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/positions")
      .then((r) => r.json())
      .then((positions: Array<{ side: string; avgPrice: number; shares: number; market: { status: string; resolvedOutcome: string | null } }>) => {
        const resolved = positions.filter((p) => p.market.status === "RESOLVED" && p.shares > 0);

        if (resolved.length < 3) {
          setLoading(false);
          return;
        }

        // Group by predicted probability buckets (10% intervals)
        const buckets: Record<number, { wins: number; total: number; brierSum: number }> = {};
        let totalWins = 0;
        let brierTotal = 0;

        for (const p of resolved) {
          const predictedProb = p.side === "YES" ? (1 - p.avgPrice) : p.avgPrice;
          const bucket = Math.max(10, Math.min(90, Math.round(predictedProb * 10) * 10));
          const won = p.side === p.market.resolvedOutcome ? 1 : 0;
          totalWins += won;

          const brier = Math.pow(predictedProb - won, 2);
          brierTotal += brier;

          if (!buckets[bucket]) buckets[bucket] = { wins: 0, total: 0, brierSum: 0 };
          buckets[bucket].total++;
          buckets[bucket].wins += won;
          buckets[bucket].brierSum += brier;
        }

        const points = Object.entries(buckets)
          .map(([b, v]) => ({
            bucket: parseInt(b),
            actual: Math.round((v.wins / v.total) * 100),
            count: v.total,
          }))
          .sort((a, b) => a.bucket - b.bucket);

        setData(points);
        setStats({
          total: resolved.length,
          wins: totalWins,
          brierScore: brierTotal / resolved.length,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex h-48 items-center justify-center text-sm text-gray-400">Yükleniyor...</div>;
  }

  if (data.length < 2) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-500">Kalibrasyon grafiği için en az 3 sonuçlanmış tahmin gerekli.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Kalibrasyon Grafiği</h3>
        {stats && (
          <div className="flex gap-4 text-xs text-gray-500">
            <span>Toplam: {stats.total}</span>
            <span>İsabet: %{((stats.wins / stats.total) * 100).toFixed(0)}</span>
            <span>Brier: {stats.brierScore.toFixed(3)}</span>
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="bucket"
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickFormatter={(v) => `%${v}`}
            label={{ value: "Tahmin Edilen", position: "bottom", fontSize: 11, fill: "#9ca3af" }}
          />
          <YAxis
            dataKey="actual"
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickFormatter={(v) => `%${v}`}
            label={{ value: "Gerçekleşen", angle: -90, position: "insideLeft", fontSize: 11, fill: "#9ca3af" }}
            width={40}
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
            formatter={(value: any, name: any) => {
              if (name === "actual") return [`%${value}`, "Gerçekleşen"];
              return [value, name];
            }}
            labelFormatter={(label) => `Tahmin: %${label}`}
          />
          {/* Perfect calibration line */}
          <ReferenceLine
            segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]}
            stroke="#d1d5db"
            strokeDasharray="5 5"
            label={{ value: "Mükemmel", position: "insideTopLeft", fontSize: 10, fill: "#9ca3af" }}
          />
          <Scatter
            data={data}
            fill="#0d9488"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            shape={(props: any) => {
              const size = Math.max(6, Math.min(16, (props.payload?.count || 1) * 3));
              return (
                <circle
                  cx={props.cx || 0}
                  cy={props.cy || 0}
                  r={size}
                  fill="#0d9488"
                  fillOpacity={0.7}
                  stroke="#0d9488"
                  strokeWidth={1}
                />
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
      <p className="mt-2 text-center text-[10px] text-gray-400">
        Daire büyüklüğü = o aralıktaki tahmin sayısı. Kesikli çizgiye yakınlık = iyi kalibrasyon.
      </p>
    </div>
  );
}
