import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { lireEnv } from '@/config/env'
import type { Database } from '@/types/database'

export type ClientSupabase = SupabaseClient<Database>

let instance: ClientSupabase | undefined

/** Client unique, créé à la première utilisation (une configuration invalide lève une ConfigurationError). */
export function supabase(): ClientSupabase {
  if (!instance) {
    const env = lireEnv()
    instance = createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return instance
}
