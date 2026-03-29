"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface Analytics {
  total_requests: number;
  success_count: number;
  error_count: number;
  avg_duration_ms: number;
  total_bytes_in: number;
  total_bytes_out: number;
  method_breakdown: Record<string, number>;
  status_breakdown: Record<string, number>;
  top_paths: { path: string; count: number }[];
  timeline: { time: string; total: number; success: number; error: number }[];
}

const periods = [
  { label: "1h", hours: 1 },
  { label: "6h", hours: 6 },
  { label: "24h", hours: 24 },
  { label: "7d", hours: 168 },
  { label: "30d", hours: 720 },
];

const methodColors: Record<string, string> = {
  GET: "bg-blue-500",
  POST: "bg-green-500",
  PUT: "bg-yellow-500",
  PATCH: "bg-orange-500",
  DELETE: "bg-red-500",
  HEAD: "bg-violet-500",
  OPTIONS: "bg-gray-500",
};

const statusColors: Record<string, string> = {
  "2xx": "bg-green-500",
  "3xx": "bg-blue-500",
  "4xx": "bg-yellow-500",
  "5xx": "bg-red-500",
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(24);

  async function load(hours: number) {
    setLoading(true);
    try {
      const token = localStorage.getItem("sm_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081"}/api/v1/analytics?hours=${hours}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    load(period);
  }, [period]);

  const successRate =
    data && data.total_requests > 0
      ? ((data.success_count / data.total_requests) * 100).toFixed(1)
      : "0";

  const maxTimeline = data?.timeline
    ? Math.max(...data.timeline.map((t) => t.total), 1)
    : 1;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Request metrics and traffic insights.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {periods.map((p) => (
              <button
                key={p.hours}
                onClick={() => setPeriod(p.hours)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === p.hours
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => load(period)} className="gap-1">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="mt-12 text-center text-muted-foreground">Loading...</div>
      ) : !data || data.total_requests === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center py-16">
            <BarChart3 className="h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 font-semibold">No data yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Send some requests through your tunnels to see analytics.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Requests"
              value={data.total_requests.toLocaleString()}
              icon={<Activity className="h-4 w-4" />}
              color="text-blue-500"
            />
            <StatCard
              title="Success Rate"
              value={`${successRate}%`}
              icon={<CheckCircle2 className="h-4 w-4" />}
              color="text-green-500"
              sub={`${data.success_count.toLocaleString()} ok / ${data.error_count.toLocaleString()} errors`}
            />
            <StatCard
              title="Avg Duration"
              value={`${data.avg_duration_ms.toFixed(1)}ms`}
              icon={<Clock className="h-4 w-4" />}
              color="text-yellow-500"
            />
            <StatCard
              title="Bandwidth"
              value={formatBytes(data.total_bytes_in + data.total_bytes_out)}
              icon={<ArrowUpRight className="h-4 w-4" />}
              color="text-violet-500"
              sub={`${formatBytes(data.total_bytes_in)} in / ${formatBytes(data.total_bytes_out)} out`}
            />
          </div>

          {/* Timeline Chart */}
          {data.timeline && data.timeline.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Request Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-40">
                  {data.timeline.map((point, i) => (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center gap-0.5 group"
                      title={`${point.time}: ${point.total} requests (${point.success} ok, ${point.error} errors)`}
                    >
                      <div className="w-full flex flex-col-reverse" style={{ height: "100%" }}>
                        <div
                          className="w-full bg-green-500/80 rounded-t-sm transition-all group-hover:bg-green-500"
                          style={{
                            height: `${(point.success / maxTimeline) * 100}%`,
                            minHeight: point.success > 0 ? "2px" : "0",
                          }}
                        />
                        <div
                          className="w-full bg-red-500/80 rounded-t-sm transition-all group-hover:bg-red-500"
                          style={{
                            height: `${(point.error / maxTimeline) * 100}%`,
                            minHeight: point.error > 0 ? "2px" : "0",
                          }}
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground">
                        {i % Math.max(1, Math.floor(data.timeline.length / 8)) === 0
                          ? point.time
                          : ""}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500" /> Success
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> Error
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Breakdowns */}
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {/* Method breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Methods</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(data.method_breakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([method, count]) => (
                    <div key={method} className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className="w-16 justify-center font-mono text-xs"
                      >
                        {method}
                      </Badge>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${methodColors[method] || "bg-gray-500"}`}
                          style={{
                            width: `${(count / data.total_requests) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {count}
                      </span>
                    </div>
                  ))}
              </CardContent>
            </Card>

            {/* Status breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status Codes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(data.status_breakdown)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([status, count]) => (
                    <div key={status} className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className="w-12 justify-center font-mono text-xs"
                      >
                        {status}
                      </Badge>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${statusColors[status] || "bg-gray-500"}`}
                          style={{
                            width: `${(count / data.total_requests) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {count}
                      </span>
                    </div>
                  ))}
              </CardContent>
            </Card>

            {/* Top paths */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Paths</CardTitle>
              </CardHeader>
              <CardContent>
                {data.top_paths && data.top_paths.length > 0 ? (
                  <div className="space-y-2">
                    {data.top_paths.map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2"
                      >
                        <span className="font-mono text-xs truncate flex-1">
                          {p.path}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {p.count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No path data</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
  sub,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          <span className={color}>{icon}</span>
        </div>
        <p className="mt-2 text-2xl font-bold">{value}</p>
        {sub && (
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}
