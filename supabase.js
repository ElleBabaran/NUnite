import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL  = 'https://jivdnqxtijzlbtasubnc.supabase.co'; // ← PALITAN
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppdmRucXh0aWp6bGJ0YXN1Ym5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzY5MTAsImV4cCI6MjA5MDI1MjkxMH0.vVBR7ZQ6rk8gDWYon8D6Nmf0syT_P-gVcJrWyu_j0u0';


export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);