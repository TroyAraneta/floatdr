import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://usbtryxyfzdxwyoloxud.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzYnRyeXh5ZnpkeHd5b2xveHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzOTEwMTYsImV4cCI6MjA3NDk2NzAxNn0.ube5F0t73xQuFINFX2TNCml0Xtn9PsaOgJjEXs8Bqhc"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
