import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.warn(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and set your Supabase credentials.'
  )
}

// Use placeholders when env is missing so createClient() never throws and the app can load.
// Auth calls will fail until .env is configured.
const supabaseUrl = url || 'https://placeholder.supabase.co'
const supabaseAnonKey = anonKey || 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
