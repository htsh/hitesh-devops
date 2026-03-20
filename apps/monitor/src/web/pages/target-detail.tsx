import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusDot } from "@/components/status-dot";
import { Play, Pencil, Power } from "lucide-react";

export function TargetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = () => {
    if (id) api.getTargetDetail(id).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="text-zinc-400">Loading...</div>;
  if (!data) return <div className="text-red-400">Target not found</div>;

  const { target, status, recent_runs, outages } = data;

  const handleRunNow = async () => {
    setRunning(true);
    try {
      await api.runTarget(target.id);
      load();
    } finally {
      setRunning(false);
    }
  };

  const handleToggle = async () => {
    await api.toggleTarget(target.id, !target.enabled);
    load();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusDot health={status?.health ?? "unknown"} className="size-3" />
          <h1 className="text-2xl font-bold tracking-tight">{target.name}</h1>
          <Badge variant={target.class === "advanced" ? "outline" : "secondary"}>{target.class}</Badge>
          {!target.enabled && <Badge variant="outline">disabled</Badge>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleRunNow} disabled={running || !target.enabled}>
            <Play className="size-4" /> {running ? "Running..." : "Run Now"}
          </Button>
          {target.class === "basic" && (
            <>
              <Link to={`/targets/${target.id}/edit`}>
                <Button size="sm" variant="outline"><Pencil className="size-4" /> Edit</Button>
              </Link>
              <Button size="sm" variant="outline" onClick={handleToggle}>
                <Power className="size-4" /> {target.enabled ? "Disable" : "Enable"}
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          {target.class === "advanced" && (
            <CardDescription>This target is config-managed and read-only in the dashboard.</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            {[
              ["Service", target.service_name],
              ["Check Kind", target.check_kind],
              ["Resource", target.resource_kind],
              ["Node", target.node],
              ["Interval", `${target.interval_seconds}s`],
              ["Timeout", `${target.timeout_seconds}s`],
              ["Fail Threshold", target.failure_threshold],
              ["Recovery Threshold", target.recovery_threshold],
              ["Notifications", target.notify_on_failure ? "On" : "Off"],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-zinc-500">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          {Object.keys(target.metadata).length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-zinc-500">Metadata</p>
              <pre className="mt-1 rounded bg-zinc-800 p-3 text-xs text-zinc-300">
                {JSON.stringify(target.metadata, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {status && (
        <Card>
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              {[
                ["Health", status.health],
                ["Last Check", status.last_check_at ? new Date(status.last_check_at).toLocaleString() : "never"],
                ["Last Success", status.last_success_at ? new Date(status.last_success_at).toLocaleString() : "never"],
                ["Last Failure", status.last_failure_at ? new Date(status.last_failure_at).toLocaleString() : "never"],
                ["Consecutive Failures", status.consecutive_failures],
                ["Consecutive Successes", status.consecutive_successes],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-zinc-500">{label}</dt>
                  <dd className="font-medium">{String(value)}</dd>
                </div>
              ))}
            </dl>
            {status.last_failure_reason && (
              <div className="mt-3">
                <p className="text-sm text-zinc-500">Last Failure Reason</p>
                <p className="mt-1 text-sm text-red-400">{status.last_failure_reason}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {recent_runs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Check Runs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent_runs.map((r: any) => (
                  <TableRow key={r._id}>
                    <TableCell>
                      <Badge variant={r.status === "success" ? "success" : r.status === "timeout" ? "warning" : "danger"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-400">{r.duration_ms}ms</TableCell>
                    <TableCell className="max-w-sm truncate text-sm text-zinc-400">{r.message}</TableCell>
                    <TableCell className="text-xs text-zinc-500">{new Date(r.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {outages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Outage History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opened</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outages.map((o: any) => (
                  <TableRow key={o._id}>
                    <TableCell className="text-xs text-zinc-500">{new Date(o.opened_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {o.resolved_at ? new Date(o.resolved_at).toLocaleString() : <Badge variant="danger">Active</Badge>}
                    </TableCell>
                    <TableCell className="max-w-sm truncate text-sm text-zinc-400">{o.last_failure_reason}</TableCell>
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
