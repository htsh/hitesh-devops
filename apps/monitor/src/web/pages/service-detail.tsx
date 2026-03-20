import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusDot } from "@/components/status-dot";

export function ServiceDetailPage() {
  const { key } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (key) api.getServiceDetail(key).then(setData).finally(() => setLoading(false));
  }, [key]);

  if (loading) return <div className="text-zinc-400">Loading...</div>;
  if (!data) return <div className="text-red-400">Service not found</div>;

  const healthCounts = { healthy: 0, down: 0, unknown: 0 };
  for (const t of data.targets) {
    healthCounts[t.health as keyof typeof healthCounts]++;
  }
  const overallHealth = healthCounts.down > 0 ? "down" : healthCounts.unknown === data.targets.length ? "unknown" : "healthy";

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <StatusDot health={overallHealth} className="size-3" />
        <h1 className="text-2xl font-bold tracking-tight">{data.service_name}</h1>
        <Badge variant="outline">{data.service_key}</Badge>
      </div>

      <div className="flex gap-3">
        {healthCounts.healthy > 0 && <Badge variant="success">{healthCounts.healthy} healthy</Badge>}
        {healthCounts.down > 0 && <Badge variant="danger">{healthCounts.down} down</Badge>}
        {healthCounts.unknown > 0 && <Badge variant="outline">{healthCounts.unknown} unknown</Badge>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Targets</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Check</TableHead>
                <TableHead>Node</TableHead>
                <TableHead>Last Check</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.targets.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell><StatusDot health={t.health} /></TableCell>
                  <TableCell>
                    <Link to={`/targets/${t.id}`} className="font-medium hover:underline">{t.name}</Link>
                    {!t.enabled && <Badge variant="outline" className="ml-2 text-xs">disabled</Badge>}
                  </TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{t.check_kind}</Badge></TableCell>
                  <TableCell className="text-zinc-400">{t.node}</TableCell>
                  <TableCell className="text-xs text-zinc-500">
                    {t.last_check_at ? timeAgo(t.last_check_at) : "never"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data.outages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Outages</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Target</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.outages.map((o: any) => (
                  <TableRow key={o._id}>
                    <TableCell>
                      <Link to={`/targets/${o.target_id}`} className="hover:underline">{o.target_name}</Link>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">{new Date(o.opened_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {o.resolved_at ? new Date(o.resolved_at).toLocaleString() : <Badge variant="danger">Active</Badge>}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-zinc-400">{o.last_failure_reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
