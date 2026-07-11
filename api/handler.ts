import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleHttpRequest } from "../dist/src/surfaces/telegram/http-handler.js";

export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await handleHttpRequest(req, res);
}
