import { createClient } from '@supabase/supabase-js';

export const getSupabaseClient = () => {
  if (
    !process.env.SUPABASE_PROJECT_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error('Supabase environment variables not set');
  }

  return createClient(
    process.env.SUPABASE_PROJECT_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
};
