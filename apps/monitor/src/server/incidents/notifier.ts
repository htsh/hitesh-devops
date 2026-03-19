import { config } from "../config.js";

export interface NtfyMessage {
  title: string;
  body: string;
  tags: string;
  priority: string;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function formatOutageMessage(
  targetId: string,
  serviceKey: string,
  failureReason: string | null,
): NtfyMessage {
  return {
    title: `DOWN: ${targetId}`,
    body: `Service "${serviceKey}" — ${failureReason ?? "check failed"}`,
    tags: "rotating_light",
    priority: "urgent",
  };
}

export function formatRecoveryMessage(
  targetId: string,
  serviceKey: string,
  downtimeSeconds: number,
): NtfyMessage {
  return {
    title: `RECOVERED: ${targetId}`,
    body: `Service "${serviceKey}" is back up after ${formatDuration(downtimeSeconds)}`,
    tags: "white_check_mark",
    priority: "default",
  };
}

export async function sendNtfy(message: NtfyMessage): Promise<boolean> {
  if (!config.ntfyTopic) {
    console.warn("ntfy: no topic configured, skipping notification");
    return false;
  }

  const url = `${config.ntfyUrl}/${config.ntfyTopic}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Title: message.title,
        Tags: message.tags,
        Priority: message.priority,
      },
      body: message.body,
    });

    if (!res.ok) {
      console.error(`ntfy: HTTP ${res.status} — ${await res.text()}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error("ntfy: send failed —", err);
    return false;
  }
}
