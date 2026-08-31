import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Safely load .env.local in non-browser Node/Vitest environments if not already loaded
if (typeof window === 'undefined' && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      for (const line of envContent.split('\n')) {
        const match = line.trim().match(/^([^=]+)=(.*)$/);
        if (match && !match[1].startsWith('#')) {
          const key = match[1].trim();
          const val = match[2].trim().replace(/^["'](.*)["']$/, '$1');
          if (!process.env[key]) process.env[key] = val;
        }
      }
    }
  } catch {}
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Checks whether valid, non-placeholder Supabase credentials are provided in environment variables.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey;
  return !!(
    url &&
    anonKey &&
    url.startsWith('https://') &&
    !url.includes('mock-retailpilot-db') &&
    anonKey !== 'mock-anon-key'
  );
}

/**
 * Returns a live Supabase client.
 * FAILS LOUDLY with a clear error if environment variables are missing or invalid,
 * preventing silent fallback or hanging requests during live evaluation.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    const errorMsg =
      '[Supabase Configuration Error] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are not configured in environment variables.\n' +
      'To connect to a live Supabase database and verify PostgreSQL Row Level Security (RLS) policies:\n' +
      '1. Create a Supabase project at https://supabase.com\n' +
      '2. Apply the schema and RLS policies from supabase/schema.sql\n' +
      '3. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local\n' +
      'The application is currently operating in deterministic offline seed/in-memory mode.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return createClient(supabaseUrl!, supabaseAnonKey!);
}

/**
 * Creates a scoped Supabase client with custom tenant headers for PostgreSQL RLS testing.
 * FAILS LOUDLY if live database credentials are not configured.
 */
export function createTenantClient(orgId: string, role: string = 'STORE_MANAGER'): SupabaseClient {
  if (!isSupabaseConfigured()) {
    const errorMsg =
      `[Supabase Tenant Client Error] Cannot create tenant-scoped client for org "${orgId}". ` +
      `Live Supabase database credentials (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) are missing in environment.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return createClient(supabaseUrl!, supabaseAnonKey!, {
    global: {
      headers: {
        'x-organization-id': orgId,
        'x-user-role': role,
      },
    },
    auth: {
      persistSession: false,
    },
  });
}
