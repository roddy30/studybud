import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://bxkkdxqbthzzgmjxxjpd.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4a2tkeHFidGh6emdtanh4anBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMDY0NzQsImV4cCI6MjEwNTY4MjQ3NH0.YiceADGulrA0R39a7F6FN_Np2GpDiDwkLMvTVdrcJQU';

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
