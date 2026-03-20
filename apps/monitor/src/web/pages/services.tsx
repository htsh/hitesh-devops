import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/status-dot";

export function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getServices().then(setServices).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-zinc-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Services</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((svc) => {
          const health = svc.down > 0 ? "down" : svc.unknown === svc.targets ? "unknown" : "healthy";
          return (
            <Link key={svc.service_key} to={`/services/${svc.service_key}`}>
              <Card className="transition-colors hover:border-zinc-700">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{svc.service_name}</CardTitle>
                    <StatusDot health={health} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <span>{svc.targets} targets</span>
                    <span>·</span>
                    <span>{svc.nodes.join(", ")}</span>
                  </div>
                  <div className="flex gap-2">
                    {svc.healthy > 0 && <Badge variant="success">{svc.healthy} healthy</Badge>}
                    {svc.down > 0 && <Badge variant="danger">{svc.down} down</Badge>}
                    {svc.unknown > 0 && <Badge variant="outline">{svc.unknown} unknown</Badge>}
                  </div>
                  {svc.has_outage && (
                    <Badge variant="danger" className="mt-1">Active outage</Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
