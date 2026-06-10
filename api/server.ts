import { createApp } from "../server.js";

export default async function handler(req: any, res: any) {
  const app = await createApp();
  return app(req, res);
}