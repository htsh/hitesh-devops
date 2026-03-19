import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { healthRoutes } from "./api/health.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function start() {
  const app = Fastify({ logger: true });

  await app.register(healthRoutes);

  if (!config.isDev) {
    await app.register(fastifyStatic, {
      root: path.resolve(__dirname, "../../dist/web"),
      prefix: "/",
    });

    app.setNotFoundHandler((_req, reply) => {
      reply.sendFile("index.html");
    });
  }

  await app.listen({ port: config.port, host: config.host });
  console.log(`Monitor running at http://${config.host}:${config.port}`);
}

start();
