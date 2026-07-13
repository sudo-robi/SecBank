import type { IncomingMessage, ServerResponse } from "http";
import { buildApp } from "../src/app";

const appPromise = buildApp();

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const app = await appPromise;
  app.server.emit("request", req, res);
}
