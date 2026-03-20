import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusDot } from "@/components/status-dot";

export function OutagesPage() {
  const [outages, setOutages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOutages().then(setOutages).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-zinc-400">Loading...</div>;

  const active = outages.filter((o) => !o.resolved_at);
  const resolved = outages.filter((o) => o.resolved_at);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Outages</h1>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          Active <Badge variant="danger" className="ml-2">{active.length}</Badge>
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-zinc-500">No active outages</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Opened</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((o) => (
                <TableRow key={o._id}>
                  <TableCell><StatusDot health="down" /></TableCell>
                  <TableCell>
                    <Link to={`/targets/${o.target_id}`} className="font-medium hover:underline">{o.target_name}</Link>
                  </TableCell>
                  <TableCell className="text-zinc-400">{o.service_key}</TableCell>
                  <TableCell className="text-xs text-zinc-500">{timeAgo(o.opened_at)}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-zinc-400">{o.last_failure_reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recently Resolved</h2>
        {resolved.length === 0 ? (
          <p className="text-sm text-zinc-500">No resolved outages</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Target</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Opened</TableHead>
                <TableHead>Resolved</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resolved.map((o) => (
                <TableRow key={o._id}>
                  <TableCell>
                    <Link to={`/targets/${o.target_id}`} className="font-medium hover:underline">{o.target_name}</Link>
                  </TableCell>
                  <TableCell className="text-zinc-400">{o.service_key}</TableCell>
                  <TableCell className="text-xs text-zinc-500">{formatDate(o.opened_at)}</TableCell>
                  <TableCell className="text-xs text-zinc-500">{formatDate(o.resolved_at)}</TableCell>
                  <TableCell className="text-xs text-zinc-400">{duration(o.opened_at, o.resolved_at)}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-zinc-400">{o.last_failure_reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

function duration(start: string, end: string): string {
  const seconds = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
