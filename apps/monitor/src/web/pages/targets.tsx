import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusDot } from "@/components/status-dot";
import { Plus } from "lucide-react";

export function TargetsPage() {
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ health: "all", class: "all" });

  useEffect(() => {
    api.getTargets().then(setTargets).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-zinc-400">Loading...</div>;

  const filtered = targets.filter((t) => {
    if (filter.health !== "all" && t.health !== filter.health) return false;
    if (filter.class !== "all" && t.class !== filter.class) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Targets</h1>
        <Link to="/targets/new">
          <Button size="sm"><Plus className="size-4" /> New Target</Button>
        </Link>
      </div>

      <div className="flex gap-3">
        <Select value={filter.health} onChange={(e) => setFilter((f) => ({ ...f, health: e.target.value }))}>
          <option value="all">All Health</option>
          <option value="healthy">Healthy</option>
          <option value="down">Down</option>
          <option value="unknown">Unknown</option>
        </Select>
        <Select value={filter.class} onChange={(e) => setFilter((f) => ({ ...f, class: e.target.value }))}>
          <option value="all">All Classes</option>
          <option value="basic">Basic</option>
          <option value="advanced">Advanced</option>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Node</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Last Check</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((t) => (
            <TableRow key={t.id}>
              <TableCell>
                <StatusDot health={t.health} />
              </TableCell>
              <TableCell>
                <Link to={`/targets/${t.id}`} className="font-medium hover:underline">
                  {t.name}
                </Link>
                {!t.enabled && <Badge variant="outline" className="ml-2 text-xs">disabled</Badge>}
              </TableCell>
              <TableCell className="text-zinc-400">{t.service_name}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs">{t.check_kind}</Badge>
              </TableCell>
              <TableCell className="text-zinc-400">{t.node}</TableCell>
              <TableCell>
                <Badge variant={t.class === "advanced" ? "outline" : "secondary"} className="text-xs">
                  {t.class}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-zinc-500">
                {t.last_check_at ? timeAgo(t.last_check_at) : "never"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
