export interface QueryRequest {
  query: string;
  parameters?: Record<string, unknown>;
}

export interface QuerySuccessResponse {
  results: unknown[];
  duration: number;
}

export type ErrorCode = "BAD_REQUEST" | "NEPTUNE_ERROR" | "CONNECTION_ERROR";

export interface QueryErrorResponse {
  error: {
    message: string;
    code: ErrorCode;
  };
}

export interface HealthResponse {
  status: "ok";
  profile: string;
}
