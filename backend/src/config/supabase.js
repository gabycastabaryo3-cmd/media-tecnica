import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('[supabase] Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el .env');
}

/**
 * Cliente de Supabase con la service role key.
 * Se usa solo en el servidor: nunca debe llegar al frontend.
 */
export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
