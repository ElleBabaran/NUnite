import { supabase, supabaseAdmin } from './supabase.js';
import { getCurrentRole, getDisplayName, signOutToLogin } from './auth.js';

let authState = { user: null, role: 'guest', leader: null };
let currentEvent = null;

function notFound() {
    document.body.innerHTML = '<div style="text-align:center;padding:4rem;color:#888;"><h1>Event not found</h1><p>This event may have been deleted or not approved yet.</p><a href="Index.html" style="color:#6366f1;">Back to Events</a></div>';
}

async function loadEvent() {
    authState = await getCurrentRole();
    const eventId = new URLSearchParams(window.location.search).get('id');
    if (!eventId) {
        notFound();
        return;
    }

    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();

    if (error || !data || (!data.approved && authState.role !== 'admin' && String(authState.leader?.org_id || '') !== String(data.org_id || ''))) {
        notFound();
        return;
    }

    currentEvent = data;
    renderEvent(data);
    await renderJoinSection(data);
    await renderAttendeesSection(data);
    await updateAuthDropdown();
}

function renderEvent(event) {
    document.getElementById('eventTitle').textContent = event.title;
    document.getElementById('eventOrg').textContent = event.org || 'Admin';
    document.getElementById('eventDescription').textContent = event.description || 'No description provided.';
    const visibilityEl = document.getElementById('eventVisibilityBadge');
    if (visibilityEl) {
        visibilityEl.innerHTML = event.visibility === 'exclusive'
            ? `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">Exclusive to ${event.org || 'organization members'}</span>`
            : `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-300 border border-green-500/30">Open to everyone</span>`;
    }

    const d = event.date ? new Date(event.date) : null;
    if (d) {
        document.getElementById('eventMonth').textContent = d.toLocaleString('default', { month: 'short' }).toUpperCase();
        document.getElementById('eventDay').textContent = d.getDate();
        document.getElementById('eventDateTime').textContent = d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    } else {
        document.getElementById('eventDateTime').textContent = 'No date set';
    }
    document.getElementById('eventLocation').innerHTML = event.location ? `<i class="fa-solid fa-map-pin"></i> ${event.location}` : 'Location TBD';

    const statusEl = document.getElementById('eventStatusBadge');
    if (event.approved) {
        statusEl.innerHTML = '<i class="fa-solid fa-check-circle text-green-400 mr-1"></i>Published';
        statusEl.className = 'px-4 py-2 rounded-full font-bold text-sm bg-green-500/20 text-green-400 border border-green-500/30';
    } else {
        statusEl.innerHTML = '<i class="fa-solid fa-clock text-yellow-400 mr-1"></i>Pending Approval';
        statusEl.className = 'px-4 py-2 rounded-full font-bold text-sm bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    }
}

async function renderJoinSection(event) {
    const section = document.getElementById('eventJoinSection');
    if (!authState.user) {
        section.innerHTML = '<p class="text-white/60">Please sign in to join this event.</p>';
        return;
    }
    if (authState.role === 'admin' || String(authState.leader?.org_id || '') === String(event.org_id || '')) {
        section.innerHTML = '<p class="text-white/60">You manage this event.</p>';
        return;
    }

    const email = authState.user.email;
    const { data: existingJoin } = await supabase
        .from('event_joins')
        .select('*')
        .eq('event_id', event.id)
        .or(`user_email.eq.${email},email.eq.${email}`)
        .maybeSingle();

    if (existingJoin) {
        const states = {
            approved: ['green', "You're attending!", `Confirmed for ${event.title}`],
            pending: ['yellow', 'Request Pending', `Waiting for ${event.org || 'the'} leader approval`],
            rejected: ['red', 'Request Declined', `Your request to attend ${event.title} was declined.`],
        };
        const [color, title, subtitle] = states[existingJoin.status || 'pending'];
        section.innerHTML = `<div class="flex items-center gap-3 p-4 bg-${color}-500/20 border border-${color}-500/30 rounded-2xl">
            <i class="fa-solid fa-circle-info text-2xl text-${color}-400"></i>
            <div><p class="font-bold text-lg">${title}</p><p class="text-sm text-${color}-300">${subtitle}</p></div>
        </div>`;
        return;
    }

    const { data: membership } = await supabase
        .from('joins')
        .select('*')
        .eq('org_id', event.org_id)
        .eq('email', email)
        .maybeSingle();

    const isMember = membership?.status === 'approved';
    if (event.visibility === 'exclusive' && event.org_id && !isMember) {
        section.innerHTML = `<div class="p-4 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl">
            <p class="font-bold text-lg">Members only</p>
            <p class="text-sm text-indigo-200 mb-4">Join ${event.org || 'this organization'} first to attend this event.</p>
            <a href="viewdetails.html?id=${event.org_id}" class="inline-block px-5 py-2 bg-indigo-600 rounded-xl font-bold text-sm">View Organization</a>
        </div>`;
        return;
    }

    section.innerHTML = `<button id="joinEventBtn" class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold transition-colors">Join Event</button>`;
    document.getElementById('joinEventBtn').addEventListener('click', async () => {
        const { error } = await supabaseAdmin.from('event_joins').insert({
            event_id: event.id,
            user_email: email,
            email,
            user_name: getDisplayName(authState.user),
            name: getDisplayName(authState.user),
            status: isMember || !event.org_id ? 'approved' : 'pending',
        });
        if (error) {
            alert('Could not join event: ' + error.message);
            return;
        }
        await renderJoinSection(event);
    });
}

async function renderAttendeesSection(event) {
    const canManage = authState.role === 'admin' || String(authState.leader?.org_id || '') === String(event.org_id || '');
    const section = document.getElementById('attendeesSection');
    if (!canManage) {
        section.classList.add('hidden');
        return;
    }
    section.classList.remove('hidden');
    const { data } = await supabase.from('event_joins').select('*').eq('event_id', event.id).order('joined_at');
    const attendees = data || [];
    document.getElementById('attendeesList').innerHTML = attendees.length
        ? attendees.map(j => `<div class="bg-white/10 border border-white/20 rounded-xl p-4"><p class="font-bold">${j.user_name || j.name || 'Unknown'}</p><p class="text-white/60 text-sm">${j.user_email || j.email || ''}</p><p class="text-xs mt-2 uppercase font-bold">${j.status || 'pending'}</p></div>`).join('')
        : '<p class="text-white/50">No attendees yet.</p>';
}

async function updateAuthDropdown() {
    const content = document.getElementById('authMenuContent');
    if (!content) return;
    if (!authState.user) {
        content.innerHTML = '<a href="sign_in.html" class="block px-4 py-2 text-sm font-bold text-slate-700">Sign In</a><a href="sign_up.html" class="block px-4 py-2 text-sm font-bold text-slate-700">Sign Up</a>';
        return;
    }
    content.innerHTML = `<div class="px-4 py-2 border-b border-slate-200"><p class="text-xs text-slate-500">Signed in as</p><p class="font-bold text-slate-900 truncate">${authState.role === 'admin' ? 'Admin' : getDisplayName(authState.user)}</p></div>
        ${authState.role === 'admin' ? '<a href="admindash.html" class="block px-4 py-2 text-sm font-bold text-indigo-600">Admin Dashboard</a>' : ''}
        ${authState.role === 'leader' ? '<a href="leaderdash.html" class="block px-4 py-2 text-sm font-bold text-indigo-600">Leader Dashboard</a>' : ''}
        <a href="#" id="eventSignOutBtn" class="block px-4 py-2 text-sm font-bold text-red-600">Sign Out</a>`;
    document.getElementById('eventSignOutBtn').addEventListener('click', async e => {
        e.preventDefault();
        await signOutToLogin();
    });
}

window.toggleAuthMenu = function() {
    document.getElementById('authDropdown')?.classList.toggle('hidden');
};

document.addEventListener('DOMContentLoaded', loadEvent);
