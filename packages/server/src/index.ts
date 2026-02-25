import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerRoutes } from "./routes";
import { checkConnection } from "./neptune";

const graphDbUrl = process.env.GRAPH_DB_URL;
if (!graphDbUrl) {
  console.error("GRAPH_DB_URL environment variable is required");
  process.exit(1);
}

const port = Number(process.env.PORT) || 4000;

// Verify Neptune connection before starting
try {
  await checkConnection(graphDbUrl);
  console.log("Neptune connection verified");
} catch (err) {
  console.error("Neptune connection check failed:", err instanceof Error ? err.message : err);
  process.exit(1);
}

const app = Fastify({ logger: true });

await app.register(cors);

registerRoutes(app, graphDbUrl);

try {
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`Server listening on http://localhost:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
