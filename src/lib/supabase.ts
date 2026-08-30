import { createClient } from '@supabase/supabase-js';

const meta = import.meta as any;
const rawUrl = meta.env?.VITE_SUPABASE_URL || '';
const rawKey = meta.env?.VITE_SUPABASE_ANON_KEY || '';

function cleanEnvValue(val: any): string {
  if (typeof val !== 'string') return '';
  let cleaned = val.trim();
  while (cleaned.startsWith('"') || cleaned.startsWith("'")) {
    cleaned = cleaned.substring(1);
  }
  while (cleaned.endsWith('"') || cleaned.endsWith("'")) {
    cleaned = cleaned.substring(0, cleaned.length - 1);
  }
  return cleaned.trim();
}

export const supabase = createClient(cleanEnvValue(rawUrl), cleanEnvValue(rawKey));