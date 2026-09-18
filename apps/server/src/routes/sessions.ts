import { Readable } from "node:stream";
import type { FastifyPluginAsync } from "fastify";
import { encodeSSE } from "@system/shared";
import { z } from "zod";
import { loadSession, startSession } from "../engine/session.js";
import { playTurn } from "../engine/turn.js";
import { getEpilogue } from "../state/sessionStore.js";

const createBody = z.object({
  username: z.string().trim().min(1).max(32).optional(),
});

const turnBody = z.object({
  choiceId: z.string().min(1).max(64),
});

const sessionParams = z.object({
  id: z.string().uuid(),
});

export const sessionRoutes: FastifyPluginAsync = async (app) => {
  app.post("/sessions", async (request, reply) => {
    const body = createBody.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: "Invalid username." });
    }
    const session = await startSession(body.data.username);
    return reply.code(201).send({ session });
  });

  app.get("/sessions/:id", async (request, reply) => {
    const params = sessionParams.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Invalid session id." });
    }
    const session = await loadSession(params.data.id);
    if (!session) {
      return reply.code(404).send({ error: "Session not found or expired." });
    }
    return reply.send({ session });
  });

  /**
   * Streams one turn as Server-Sent Events. Returning a stream rather than
   * hijacking the reply keeps the CORS and logging hooks in play, and Fastify
   * flushes each chunk as the generator produces it.
   */
  app.post("/sessions/:id/turn", async (request, reply) => {
    const params = sessionParams.safeParse(request.params);
    const body = turnBody.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.code(400).send({ error: "Invalid turn request." });
    }

    const { id } = params.data;
    const { choiceId } = body.data;
    const log = request.log;

    async function* frames(): AsyncGenerator<string> {
      try {
        for await (const event of playTurn(id, choiceId)) {
          yield encodeSSE(event);
        }
      } catch (error) {
        log.error({ err: error, sessionId: id }, "turn failed");
        yield encodeSSE({
          type: "error",
          message: "The System stuttered. Try that again.",
        });
      }
    }

    return reply
      .header("Content-Type", "text/event-stream; charset=utf-8")
      .header("Cache-Control", "no-cache, no-transform")
      .header("Connection", "keep-alive")
      // Disables response buffering on proxies that would otherwise batch the stream.
      .header("X-Accel-Buffering", "no")
      .send(Readable.from(frames()));
  });

  app.get("/runs/:runId/epilogue", async (request, reply) => {
    const params = z
      .object({ runId: z.string().uuid() })
      .safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Invalid run id." });
    }
    const still = await getEpilogue(params.data.runId);
    if (!still) {
      return reply.code(404).send({ error: "Not ready." });
    }
    return reply
      .header("Content-Type", still.mime)
      .header("Cache-Control", "private, max-age=3600")
      .send(still.bytes);
  });
};
