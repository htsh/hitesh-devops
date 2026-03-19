import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const config = {
  port: parseInt(process.env.PORT || "3100", 10),
  host: process.env.HOST || "0.0.0.0",
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/monitor",
  isDev: (process.env.NODE_ENV || "development") === "development",
  ntfyUrl: process.env.NTFY_URL || "https://ntfy.sh",
  ntfyTopic: process.env.NTFY_TOPIC || "",
} as const;
