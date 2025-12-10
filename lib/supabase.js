import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://mdjvgygdhqccjytttdja.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kanZneWdkaHFjY2p5dHR0ZGphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDUzMDIsImV4cCI6MjA3NjU4MTMwMn0.vCWufp7sBd2nT7C-c4wYrTUH8W1UjgL2jVmZQSA78ks"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
