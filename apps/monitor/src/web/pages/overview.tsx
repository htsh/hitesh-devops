import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/status-dot";
import { Activity, AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";

export function OverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOverview().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-zinc-400">Loading...</div>;
  if (!data) return <div className="text-red-400">Failed to load overview</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Overview</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Targets</CardTitle>
            <Activity className="size-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Healthy</CardTitle>
            <CheckCircle className="size-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-400">{data.healthy}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Down</CardTitle>
            <AlertTriangle className="size-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400">{data.down}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Unknown</CardTitle>
            <HelpCircle className="size-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-zinc-500">{data.unknown}</div>
          </CardContent>
        </Card>
      </div>

      {data.active_outages.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Active Outages</h2>
          <div className="space-y-2">
            {data.active_outages.map((o: any) => (
              <Card key={o._id} className="border-red-900/50 bg-red-950/20">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <StatusDot health="down" />
                    <div>
                      <Link to={`/targets/${o.target_id}`} className="font-medium hover:underline">
                        {o.target_name}
                      </Link>
                      <p className="text-sm text-zinc-400">{o.last_failure_reason}</p>
                    </div>
                  </div>
                  <Badge variant="danger">
                    {timeAgo(o.opened_at)}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {data.recent_failures.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Recent Failures</h2>
          <div className="space-y-2">
            {data.recent_failures.map((r: any) => (
              <div key={r._id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Badge variant={r.status === "timeout" ? "warning" : "danger"} className="text-xs">
                    {r.status}
                  </Badge>
                  <Link to={`/targets/${r.target_id}`} className="text-sm hover:underline">
                    {r.target_name}
                  </Link>
                </div>
                <span className="text-xs text-zinc-500">{timeAgo(r.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
