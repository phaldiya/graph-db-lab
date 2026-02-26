import type { FastifyInstance } from "fastify";
import { executeQuery, NeptuneError } from "./neptune";
import type { QueryRequest, QuerySuccessResponse, QueryErrorResponse, HealthResponse } from "./types";

export function registerRoutes(app: FastifyInstance, graphDbUrl: string) {
  app.get<{ Reply: HealthResponse }>("/api/health", async () => {
    return { status: "ok", profile: process.env.AWS_PROFILE || "staging" };
  });

  app.post<{ Body: QueryRequest; Reply: QuerySuccessResponse | QueryErrorResponse }>(
    "/api/query",
    async (request, reply) => {
      const { query, parameters } = request.body;

      if (!query || typeof query !== "string" || query.trim().length === 0) {
        reply.status(400);
        return { error: { message: "query is required and must be a non-empty string", code: "BAD_REQUEST" as const } };
      }

      const start = performance.now();

      try {
        const results = await executeQuery(graphDbUrl, query, parameters);
        const duration = Math.round(performance.now() - start);
        return { results, duration };
      } catch (err) {
        if (err instanceof NeptuneError) {
          reply.status(err.statusCode);
          return { error: { message: err.message, code: err.code } };
        }
        reply.status(500);
        return { error: { message: "Unexpected server error", code: "NEPTUNE_ERROR" as const } };
      }
    },
  );
}
