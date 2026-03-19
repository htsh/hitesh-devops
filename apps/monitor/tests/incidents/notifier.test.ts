import { describe, it, expect } from "vitest";
import { formatOutageMessage, formatRecoveryMessage } from "../../src/server/incidents/notifier.js";

describe("formatOutageMessage", () => {
  it("formats an outage notification", () => {
    const msg = formatOutageMessage("caddy-vps1", "caddy", "Connection refused");
    expect(msg.title).toContain("caddy-vps1");
    expect(msg.title).toContain("DOWN");
    expect(msg.body).toContain("Connection refused");
    expect(msg.tags).toContain("rotating_light");
    expect(msg.priority).toBe("urgent");
  });

  it("handles null failure reason", () => {
    const msg = formatOutageMessage("ping-vps2", "network", null);
    expect(msg.title).toContain("ping-vps2");
    expect(msg.body).toBeDefined();
  });
});

describe("formatRecoveryMessage", () => {
  it("formats a recovery notification", () => {
    const msg = formatRecoveryMessage("caddy-vps1", "caddy", 300);
    expect(msg.title).toContain("caddy-vps1");
    expect(msg.title).toContain("RECOVERED");
    expect(msg.body).toContain("5m");
    expect(msg.tags).toContain("white_check_mark");
    expect(msg.priority).toBe("default");
  });
});
