import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !key) {
  throw new Error(
    'Missing Supabase config — copy .env.example to .env and fill in VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY.',
  );
}

export const supabase = createClient(url, key);
