import type { CheckKind } from "../types.js";
import type { CheckerFn } from "./types.js";
import { checkHttp } from "./http.js";
import { checkTcp } from "./tcp.js";
import { checkPing } from "./ping.js";
import { checkPm2 } from "./pm2.js";
import { checkDocker } from "./docker.js";
import { checkMongo } from "./mongo.js";
import { checkRedis } from "./redis.js";
import { checkHeartbeat } from "./heartbeat.js";
import { checkSshCommand } from "./ssh-command.js";

const checkers: Record<string, CheckerFn> = {
  http: checkHttp,
  tcp: checkTcp,
  ping: checkPing,
  pm2_status: checkPm2,
  docker_status: checkDocker,
  mongo_ping: checkMongo,
  mongo_rs: checkMongo,
  redis_ping: checkRedis,
  heartbeat: checkHeartbeat,
  ssh_command: checkSshCommand,
};

export function getChecker(checkKind: CheckKind): CheckerFn | null {
  return checkers[checkKind] ?? null;
}
