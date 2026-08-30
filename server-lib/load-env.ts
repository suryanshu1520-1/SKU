// Side-effect-only module: must be the FIRST import in any entrypoint (server.ts, api/server.ts).
// Node's dotenv (unlike Vite) only auto-loads .env, never .env.local — but this repo splits
// Supabase config across both (.env: server-side keys, .env.local: VITE_-prefixed public keys).
// This has to be an *import*, not a plain function call inside the entrypoint: sibling imports
// in one file evaluate fully, in declaration order, before any plain statement in that file runs
// — so a plain `dotenv.config()` call placed "before" other imports still executes after them.
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local", override: false });
