import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Single client instance reused across all server-component fetches.
// Never called on the client — all data-fetching happens in Server Components.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
