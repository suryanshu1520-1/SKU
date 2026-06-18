import { createClient } from '@supabase/supabase-js';

const meta = import.meta as any;
const rawUrl = meta.env?.VITE_SUPABASE_URL || 'https://ixngfxaerlkkcacrbdgc.supabase.co';
const rawKey = meta.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4bmdmeGFlcmxra2NhY3JiZGdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMTY3NDQsImV4cCI6MjA5NTc5Mjc0NH0.G44wtBZZKGPb-ZTX3zaIPCXFcRtPP9Vtv-0saO0dEXE';

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