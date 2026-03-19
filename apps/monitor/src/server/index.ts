import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { healthRoutes } from "./api/health.js";
import { targetRoutes } from "./api/targets.js";
import { connectDb, disconnectDb } from "./db/client.js";
import { ensureIndexes } from "./db/indexes.js";
import { seedAdvancedTargets } from "./db/seed.js";
import { startScheduler, stopScheduler } from "./scheduler/loop.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function start() {
  const app = Fastify({ logger: true });

  // Database
  await connectDb();
  await ensureIndexes();
  await seedAdvancedTargets();

  // Start check scheduler
  startScheduler();

  // API routes
  await app.register(healthRoutes);
  await app.register(targetRoutes);

  // Static file serving in production
  if (!config.isDev) {
    await app.register(fastifyStatic, {
      root: path.resolve(__dirname, "../../dist/web"),
      prefix: "/",
    });

    app.setNotFoundHandler((_req, reply) => {
      reply.sendFile("index.html");
    });
  }

  // Graceful shutdown
  const shutdown = async () => {
    await app.close();
    stopScheduler();
    await disconnectDb();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await app.listen({ port: config.port, host: config.host });
  console.log(`Monitor running at http://${config.host}:${config.port}`);
}

start();
