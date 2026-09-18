import type { ServerEvent } from "@system/shared";
import { API_BASE } from "./api";

/**
 * Consumes the turn stream.
 *
 * `EventSource` cannot issue a POST or send a body, so the SSE framing is parsed
 * off a plain `fetch` response stream instead. Frames are separated by a blank
 * line; a partial frame is kept in the buffer until its terminator arrives.
 */
export async function* streamTurn(
  sessionId: string,
  choiceId: string,
  signal: AbortSignal,
): AsyncGenerator<ServerEvent> {
  const response = await fetch(`${API_BASE}/api/sessions/${sessionId}/turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ choiceId }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error("The System lost the connection.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const event = parseFrame(frame);
        if (event) yield event;
        boundary = buffer.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function parseFrame(frame: string): ServerEvent | null {
  const data = frame
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("");
  if (!data) return null;
  try {
    return JSON.parse(data) as ServerEvent;
  } catch {
    return null;
  }
}
