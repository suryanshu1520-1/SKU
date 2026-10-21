/**
 * server-lib/auth/middleware.ts
 *
 * Server-side bearer authentication and principal derivation.
 * Enforces Operational Invariant #1: All protected client requests must use valid Bearer token.
 */

import type { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

function cleanEnv(val?: string): string {
  if (!val) return "";
  let cleaned = val.trim();
  while (cleaned.startsWith('"') || cleaned.startsWith("'")) cleaned = cleaned.substring(1);
  while (cleaned.endsWith('"') || cleaned.endsWith("'")) cleaned = cleaned.substring(0, cleaned.length - 1);
  return cleaned.trim();
}

let supabaseClient: any = null;
function getAuthClient() {
  if (!supabaseClient) {
    const url = cleanEnv(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
    const key = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);
    if (!url || !key) throw new Error("Supabase credentials missing for auth middleware");
    supabaseClient = createClient(url, key, { auth: { persistSession: false } });
  }
  return supabaseClient;
}

export interface AuthenticatedUser {
  id: string;
  email?: string;
  [key: string]: any;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Extract and authenticate Bearer token from request.
 */
export async function authenticateBearer(req: Request): Promise<{ user: AuthenticatedUser | null; error: string | null }> {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"] || "";
  const token = (typeof authHeader === "string" ? authHeader : "").replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return { user: null, error: "Missing authorization token" };
  }

  const supabase = getAuthClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return { user: null, error: "Invalid or expired authorization token" };
  }

  return { user: data.user, error: null };
}

/**
 * Express middleware requiring a valid Bearer token.
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const { user, error } = await authenticateBearer(req);
  if (error || !user) {
    return res.status(401).json({ success: false, error: "UNAUTHORIZED", message: error || "Authentication required" });
  }
  req.user = user;
  next();
}
