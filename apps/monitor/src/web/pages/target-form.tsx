import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const CHECK_KINDS = ["http", "tcp", "ping"] as const;

interface FormData {
  name: string;
  service_key: string;
  service_name: string;
  check_kind: string;
  node: string;
  interval_seconds: number;
  timeout_seconds: number;
  failure_threshold: number;
  recovery_threshold: number;
  notify_on_failure: boolean;
  metadata: string;
}

const defaults: FormData = {
  name: "",
  service_key: "",
  service_name: "",
  check_kind: "http",
  node: "",
  interval_seconds: 60,
  timeout_seconds: 10,
  failure_threshold: 3,
  recovery_threshold: 2,
  notify_on_failure: true,
  metadata: "{}",
};

export function TargetFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<FormData>(defaults);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      api.getTargetDetail(id).then((data) => {
        const t = data.target;
        if (t.class !== "basic") {
          navigate(`/targets/${id}`);
          return;
        }
        setForm({
          name: t.name,
          service_key: t.service_key,
          service_name: t.service_name,
          check_kind: t.check_kind,
          node: t.node,
          interval_seconds: t.interval_seconds,
          timeout_seconds: t.timeout_seconds,
          failure_threshold: t.failure_threshold,
          recovery_threshold: t.recovery_threshold,
          notify_on_failure: t.notify_on_failure,
          metadata: JSON.stringify(t.metadata, null, 2),
        });
      }).finally(() => setLoading(false));
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      let metadata: Record<string, unknown>;
      try {
        metadata = JSON.parse(form.metadata);
      } catch {
        setError("Metadata must be valid JSON");
        setSaving(false);
        return;
      }

      const payload = { ...form, metadata };

      if (isEdit && id) {
        await api.updateTarget(id, payload);
        navigate(`/targets/${id}`);
      } else {
        const result = await api.createTarget(payload);
        navigate(`/targets/${result.id}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to save target");
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof FormData, value: any) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  if (loading) return <div className="text-zinc-400">Loading...</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{isEdit ? "Edit Target" : "New Target"}</h1>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="check_kind">Check Type</Label>
                <Select id="check_kind" value={form.check_kind} onChange={(e) => update("check_kind", e.target.value)}>
                  {CHECK_KINDS.map((k) => <option key={k} value={k}>{k.toUpperCase()}</option>)}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="service_key">Service Key</Label>
                <Input id="service_key" value={form.service_key} onChange={(e) => update("service_key", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service_name">Service Name</Label>
                <Input id="service_name" value={form.service_name} onChange={(e) => update("service_name", e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="node">Node</Label>
              <Input id="node" value={form.node} onChange={(e) => update("node", e.target.value)} required placeholder="e.g., vps1" />
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="interval">Interval (s)</Label>
                <Input id="interval" type="number" value={form.interval_seconds} onChange={(e) => update("interval_seconds", parseInt(e.target.value))} min={10} max={3600} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (s)</Label>
                <Input id="timeout" type="number" value={form.timeout_seconds} onChange={(e) => update("timeout_seconds", parseInt(e.target.value))} min={1} max={60} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fail_th">Fail Threshold</Label>
                <Input id="fail_th" type="number" value={form.failure_threshold} onChange={(e) => update("failure_threshold", parseInt(e.target.value))} min={1} max={20} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recov_th">Recovery Threshold</Label>
                <Input id="recov_th" type="number" value={form.recovery_threshold} onChange={(e) => update("recovery_threshold", parseInt(e.target.value))} min={1} max={20} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metadata">Metadata (JSON)</Label>
              <textarea
                id="metadata"
                value={form.metadata}
                onChange={(e) => update("metadata", e.target.value)}
                rows={4}
                className="flex w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
                placeholder='{"url": "https://example.com", "expected_status": 200}'
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="notify"
                checked={form.notify_on_failure}
                onChange={(e) => update("notify_on_failure", e.target.checked)}
                className="rounded border-zinc-700"
              />
              <Label htmlFor="notify">Send notifications on failure</Label>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : isEdit ? "Update Target" : "Create Target"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
