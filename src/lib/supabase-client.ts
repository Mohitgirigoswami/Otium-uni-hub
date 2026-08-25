import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pjrpscknjjkhwfssxxwa.supabase.co";
// Client-side anon key or service role fallback
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqcnBzY2tuampraHdmc3N4eHdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2OTY2NzAsImV4cCI6MjEwMjI3MjY3MH0.placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
