import type { IncomingMessage, ServerResponse } from "http";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app";

let appPromise: Promise<FastifyInstance> | null = null;

function getApp(): Promise<FastifyInstance> {
  if (!appPromise) {
    appPromise = buildApp().catch((err) => {
      console.error("BUILD_APP_FAILED:", err);
      throw err;
    });
  }
  return appPromise;
}

process.on("uncaughtException", (err) => console.error("UNCAUGHT_EXCEPTION:", err));
process.on("unhandledRejection", (err) => console.error("UNHANDLED_REJECTION:", err));

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const app = await getApp();
    console.error("HANDLER_START:", req.method, req.url);
    app.server.emit("request", req, res);
    await new Promise<void>((resolve) => {
      res.once("finish", () => resolve());
      res.once("close", () => resolve());
    });
    console.error("HANDLER_DONE:", req.url);
  } catch (err) {
    console.error("HANDLER_ERROR:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  }
}
