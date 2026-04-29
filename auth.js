import { supabase } from './supabase.js';

export const ADMIN_EMAIL = 'admin@nunite.com';

export async function getSessionUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) return null;
    return user || null;
}

export function getDisplayName(user) {
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
}

export async function getLeaderForEmail(email) {
    if (!email || email === ADMIN_EMAIL) return null;
    const { data, error } = await supabase
        .from('leaders')
        .select('*')
        .eq('email', email)
        .maybeSingle();
    if (error) {
        console.error('Leader lookup failed:', error);
        return null;
    }
    return data || null;
}

export async function getCurrentRole() {
    const user = await getSessionUser();
    if (!user) return { user: null, role: 'guest', leader: null };
    if (user.email === ADMIN_EMAIL) return { user, role: 'admin', leader: null };
    const leader = await getLeaderForEmail(user.email);
    return { user, role: leader ? 'leader' : 'student', leader };
}

export async function signOutToLogin() {
    await supabase.auth.signOut();
    window.location.href = 'sign_in.html';
}
