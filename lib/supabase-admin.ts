import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Requiere SUPABASE_SERVICE_ROLE_KEY en .env.local (nunca usar en cliente)
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local");
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
