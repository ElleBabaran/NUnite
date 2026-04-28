import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL      = 'https://jivdnqxtijzlbtasubnc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppdmRucXh0aWp6bGJ0YXN1Ym5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzY5MTAsImV4cCI6MjA5MDI1MjkxMH0.vVBR7ZQ6rk8gDWYon8D6Nmf0syT_P-gVcJrWyu_j0u0';

// ⚠️ Service role key — bypasses RLS. Only use in admin-only pages.
// Get this from: Supabase Dashboard → Project Settings → API → service_role key
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppdmRucXh0aWp6bGJ0YXN1Ym5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY3NjkxMCwiZXhwIjoyMDkwMjUyOTEwfQ.mGwRsZBO0o7MqrO4-QiZIakyAnmPkMAZ7Ke4rANwX_c';

export const supabase      = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);