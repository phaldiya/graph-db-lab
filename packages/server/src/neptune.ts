import { SignatureV4 } from "@smithy/signature-v4";
import { HttpRequest } from "@smithy/protocol-http";
import { Sha256 } from "@aws-crypto/sha256-js";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import type { ErrorCode } from "./types";

export class NeptuneError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public statusCode: number,
  ) {
    super(message);
    this.name = "NeptuneError";
  }
}

const credentialProvider = fromNodeProviderChain({
  profile: process.env.AWS_PROFILE || "staging",
});

function parseRegionFromUrl(graphDbUrl: string): string {
  const match = graphDbUrl.match(/\.([a-z0-9-]+)\.neptune\.amazonaws\.com/);
  if (!match) {
    throw new NeptuneError(
      "Could not parse AWS region from GRAPH_DB_URL. Expected *.region.neptune.amazonaws.com",
      "CONNECTION_ERROR",
      502,
    );
  }
  return match[1];
}

export async function checkConnection(graphDbUrl: string): Promise<void> {
  const hostname = graphDbUrl.replace(/^https?:\/\//, "").replace(/:\d+$/, "");
  const port = graphDbUrl.match(/:(\d+)$/)?.[1] ?? "8182";
  const region = parseRegionFromUrl(graphDbUrl);

  const credentials = await credentialProvider();

  const request = new HttpRequest({
    method: "GET",
    protocol: "https:",
    hostname,
    port: Number(port),
    path: "/status",
    headers: { host: `${hostname}:${port}` },
  });

  const signer = new SignatureV4({ service: "neptune-db", region, credentials, sha256: Sha256 });
  const signed = await signer.sign(request);
  const { host: _, ...fetchHeaders } = signed.headers;

  const response = await fetch(`https://${hostname}:${port}/status`, {
    headers: fetchHeaders as Record<string, string>,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(`Neptune status check failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  if (data.status !== "healthy") {
    throw new Error(`Neptune cluster is not healthy: ${data.status}`);
  }
}

export async function executeQuery(
  graphDbUrl: string,
  query: string,
  parameters: Record<string, unknown> = {},
): Promise<unknown[]> {
  const region = parseRegionFromUrl(graphDbUrl);

  let credentials;
  try {
    credentials = await credentialProvider();
  } catch (err) {
    throw new NeptuneError(
      `Failed to resolve AWS credentials: ${err instanceof Error ? err.message : String(err)}`,
      "CONNECTION_ERROR",
      502,
    );
  }

  const hostname = graphDbUrl.replace(/^https?:\/\//, "").replace(/:\d+$/, "");
  const port = graphDbUrl.match(/:(\d+)$/)?.[1] ?? "8182";

  const body = new URLSearchParams();
  body.set("query", query);
  if (Object.keys(parameters).length > 0) {
    body.set("parameters", JSON.stringify(parameters));
  }
  const bodyString = body.toString();

  const request = new HttpRequest({
    method: "POST",
    protocol: "https:",
    hostname,
    port: Number(port),
    path: "/openCypher",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      host: `${hostname}:${port}`,
    },
    body: bodyString,
  });

  const signer = new SignatureV4({
    service: "neptune-db",
    region,
    credentials,
    sha256: Sha256,
  });

  const signed = await signer.sign(request);

  // Bun's fetch sets the Host header from the URL; passing it explicitly causes ConnectionRefused
  const { host: _, ...fetchHeaders } = signed.headers;

  const url = `https://${hostname}:${port}/openCypher`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: fetchHeaders as Record<string, string>,
      body: bodyString,
    });
  } catch (err) {
    throw new NeptuneError(
      `Failed to connect to Neptune: ${err instanceof Error ? err.message : String(err)}`,
      "CONNECTION_ERROR",
      502,
    );
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new NeptuneError(
      `Neptune returned ${response.status}: ${text}`,
      "NEPTUNE_ERROR",
      response.status >= 400 && response.status < 500 ? 400 : 502,
    );
  }

  const data = await response.json();
  return data.results ?? data;
}
