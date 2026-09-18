import type { SessionSnapshot } from "@system/shared";

/**
 * Render's `fromService` wiring supplies a bare hostname with no scheme, so the
 * blueprint can point this at the API service without hardcoding a URL.
 */
function normaliseBase(raw: string | undefined): string {
  if (!raw) return "http://localhost:4000";
  const trimmed = raw.trim().replace(/\/+$/, "");
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export const API_BASE = normaliseBase(process.env.NEXT_PUBLIC_API_URL);

export async function createSession(
  username?: string,
): Promise<SessionSnapshot> {
  const response = await fetch(`${API_BASE}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(username ? { username } : {}),
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Could not start a run."));
  }
  const payload = (await response.json()) as { session: SessionSnapshot };
  return payload.session;
}

export async function fetchSession(
  sessionId: string,
): Promise<SessionSnapshot | null> {
  const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(await readError(response, "Could not load that run."));
  }
  const payload = (await response.json()) as { session: SessionSnapshot };
  return payload.session;
}

export async function fetchEpilogueBlob(runId: string): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE}/api/runs/${runId}/epilogue`);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.size || blob.type.includes("json")) return null;
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

async function readError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}
