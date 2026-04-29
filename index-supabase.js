import { supabase, supabaseAdmin } from './supabase.js';
import { getCurrentRole, getDisplayName, signOutToLogin } from './auth.js';

let organizations = [];
let events = [];
let joins = [];
let eventJoins = [];
let authState = { user: null, role: 'guest', leader: null };

let filters = {
    category: 'all',
    department: 'all',
    searchQuery: '',
};

async function loadData() {
    authState = await getCurrentRole();

    const [{ data: orgRows }, { data: eventRows }, { data: joinRows }, { data: eventJoinRows }] = await Promise.all([
        supabase.from('organizations').select('*').order('name'),
        supabase.from('events').select('*').eq('approved', true).eq('rejected', false).order('date', { ascending: true }),
        supabase.from('joins').select('*'),
        supabase.from('event_joins').select('*'),
    ]);

    organizations = orgRows || [];
    events = eventRows || [];
    joins = joinRows || [];
    eventJoins = eventJoinRows || [];
}

function logoFor(org) {
    if (org.logo_url) return `<img src="${org.logo_url}" alt="${org.name}" style="width:100%;height:100%;object-fit:cover;">`;
    return org.logo_emoji || '🏫';
}

function contactFor(org) {
    return org.contact_email || org.email || 'N/A';
}

function getApprovedMemberCount(orgId) {
    return joins.filter(j => String(j.org_id) === String(orgId) && j.status === 'approved').length;
}

function render() {
    const grid = document.getElementById('orgGrid');
    if (!grid) return;

    const filtered = organizations.filter(org => {
        const matchesCat = filters.category === 'all' || org.category === filters.category;
        const matchesDept = filters.department === 'all' || org.department === filters.department;
        const matchesSearch = (org.name || '').toLowerCase().includes(filters.searchQuery.trim().toLowerCase());
        return matchesCat && matchesDept && matchesSearch && org.approved !== false;
    });

    document.getElementById('countDisplay').innerText = `${filtered.length} FOUND`;

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-20 text-slate-400"><p class="text-2xl mb-2">No organizations found</p><p class="text-sm">Try adjusting your filters or check back later.</p></div>`;
        updateStats(filtered);
        return;
    }

    const grouped = filtered.reduce((acc, org) => {
        const key = org.category || 'general';
        if (!acc[key]) acc[key] = [];
        acc[key].push(org);
        return acc;
    }, {});

    let finalHtml = '';
    Object.keys(grouped).forEach((category, index) => {
        finalHtml += `
            <div class="col-span-full ${index === 0 ? 'mt-2' : 'mt-12'} mb-6">
                <div class="border-t-2 border-[#FFD700] w-full mb-3"></div>
                <h2 class="text-3xl font-bold text-[#0f172a] capitalize leading-tight">${category}</h2>
                <p class="text-slate-500 text-xs font-medium">Student Organization</p>
            </div>`;

        finalHtml += grouped[category].map(org => `
            <div class="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm hover:shadow-xl transition-all flex flex-col h-full text-slate-900 group">
                <div class="flex gap-4 mb-4">
                    <div class="w-16 h-16 flex-shrink-0 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform overflow-hidden">
                        ${logoFor(org)}
                    </div>
                    <div class="flex flex-col justify-center">
                        <h3 class="text-sm font-black leading-tight text-slate-800">${org.name}</h3>
                        <div class="flex gap-1 mt-1">
                            <span class="px-2 py-0.5 bg-blue-600 text-white text-[8px] rounded-full font-black uppercase tracking-tighter">${org.category || 'general'}</span>
                        </div>
                    </div>
                </div>
                <div class="flex-grow flex flex-col">
                    <p class="italic text-slate-500 text-[11px] leading-relaxed mb-6 font-medium">"${org.description || ''}"</p>
                    <div class="space-y-3 mt-auto">
                        <div class="flex items-center gap-3 text-slate-700 text-[11px] font-bold">
                            <img src="/image/group.png" alt="members" class="w-5 h-5 object-contain">
                            <span>${getApprovedMemberCount(org.id)} members</span>
                        </div>
                        <div class="flex items-center gap-3 text-slate-700 text-[11px] font-bold">
                            <i class="fa-regular fa-envelope w-5 text-black text-base"></i>
                            <span class="truncate">${contactFor(org)}</span>
                        </div>
                        <div class="flex items-center gap-3 text-slate-700 text-[11px] font-bold">
                            <i class="fa-solid fa-map-signs w-5 text-black text-base"></i>
                            <span>${org.location || 'NU Manila'}</span>
                        </div>
                    </div>
                </div>
                <a href="viewdetails.html?id=${org.id}" class="mt-8 w-full py-2 border border-slate-300 rounded-md font-bold text-[10px] hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all active:scale-95 shadow-sm text-slate-700 inline-block text-center">
                    View Details
                </a>
            </div>`).join('');
    });

    grid.innerHTML = finalHtml;
    updateStats(filtered);
}

function updateStats(data) {
    document.getElementById('stat-total').innerText = data.length;
    document.getElementById('stat-members').innerText = joins.filter(j => j.status === 'approved').length;
    const now = new Date();
    document.getElementById('stat-events').innerText = events.filter(ev => !ev.date || new Date(ev.date) >= now).length;
}

function getEventJoinForUser(ev) {
    const email = authState.user?.email;
    if (!email) return null;
    return eventJoins.find(j =>
        String(j.event_id) === String(ev.id) &&
        ((j.user_email || j.email) === email)
    );
}

function eventVisibilityBadge(ev) {
    if (ev.visibility === 'exclusive') {
        return `<span style="display:inline-block;width:max-content;margin-top:4px;padding:3px 10px;border-radius:999px;background:rgba(245,158,11,0.16);color:#fbbf24;font-size:10px;font-weight:800;">Exclusive to Org members</span>`;
    }
    return `<span style="display:inline-block;width:max-content;margin-top:4px;padding:3px 10px;border-radius:999px;background:rgba(34,197,94,0.16);color:#4ade80;font-size:10px;font-weight:800;">Open to everyone</span>`;
}

function renderJoinStatus(ev) {
    const user = authState.user;
    if (!user) {
        if (ev.visibility === 'exclusive') {
            return `<div style="margin-top:8px;display:flex;flex-direction:column;align-items:flex-start;gap:6px;">
                <span style="display:inline-block;padding:3px 10px;background:rgba(245,158,11,0.2);color:#fbbf24;border-radius:8px;font-size:10px;font-weight:700;">🔒 Members Only - Sign in and join the org first</span>
                <a href="sign_in.html" style="display:inline-flex;align-items:center;justify-content:center;width:96px;padding:6px 16px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border-radius:8px;font-size:11px;font-weight:700;text-decoration:none;">Join</a>
            </div>`;
        }
        return `<div style="margin-top:8px;display:flex;flex-direction:column;align-items:flex-start;gap:6px;">
            <span style="display:inline-block;padding:3px 10px;background:rgba(99,102,241,0.15);color:#818cf8;border-radius:8px;font-size:10px;font-weight:700;">🌐 Open to everyone - Sign in to join</span>
            <a href="sign_in.html" style="display:inline-flex;align-items:center;justify-content:center;width:96px;padding:6px 16px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border-radius:8px;font-size:11px;font-weight:700;text-decoration:none;">Join</a>
        </div>`;
    }
    if (authState.role === 'admin') return '';
    if (authState.leader && String(authState.leader.org_id) === String(ev.org_id)) return '';

    const existing = getEventJoinForUser(ev);
    if (existing) {
        if (existing.status === 'approved') return `<span style="display:inline-block;margin-top:8px;padding:4px 12px;background:rgba(34,197,94,0.2);color:#4ade80;border-radius:8px;font-size:11px;font-weight:700;">✅ Attending</span>`;
        if (existing.status === 'rejected') return `<span style="display:inline-block;margin-top:8px;padding:4px 12px;background:rgba(239,68,68,0.2);color:#f87171;border-radius:8px;font-size:11px;font-weight:700;">❌ Request Declined</span>`;
        return `<span style="display:inline-block;margin-top:8px;padding:4px 12px;background:rgba(245,158,11,0.2);color:#fbbf24;border-radius:8px;font-size:11px;font-weight:700;">⏳ Request Pending</span>`;
    }

    const membership = joins.find(j => String(j.org_id) === String(ev.org_id) && j.email === user.email);
    const isMember = membership?.status === 'approved';
    const isPending = (membership?.status || '') === 'pending';
    const isRejected = membership?.status === 'rejected';

    if (ev.visibility === 'exclusive' && !isMember) {
        if (isPending) return `<span style="display:inline-block;margin-top:8px;padding:4px 12px;background:rgba(245,158,11,0.2);color:#fbbf24;border-radius:8px;font-size:11px;font-weight:700;">🔒 Members Only · ⏳ Membership Pending</span>`;
        if (isRejected) return `<span style="display:inline-block;margin-top:8px;padding:4px 12px;background:rgba(239,68,68,0.2);color:#f87171;border-radius:8px;font-size:11px;font-weight:700;">🔒 Members Only · ❌ Org Join Rejected</span>`;
        return `<div style="margin-top:8px;display:flex;flex-direction:column;gap:4px;"><span style="display:inline-block;padding:3px 10px;background:rgba(99,102,241,0.15);color:#818cf8;border-radius:8px;font-size:10px;font-weight:700;">🔒 Members Only - Join the org first</span><a href="viewdetails.html?id=${ev.org_id}" style="display:inline-block;margin-top:4px;padding:5px 14px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border-radius:8px;font-size:11px;font-weight:700;text-decoration:none;text-align:center;">View Org &amp; Apply</a></div>`;
    }

    return `<div style="margin-top:8px;display:flex;flex-direction:column;align-items:flex-start;gap:6px;">
        <span style="display:inline-block;padding:3px 10px;background:rgba(99,102,241,0.15);color:#818cf8;border-radius:8px;font-size:10px;font-weight:700;">🌐 Open to everyone - You can join</span>
        <button onclick="attendEvent('${ev.id}')" style="width:96px;padding:6px 16px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border-radius:8px;font-size:11px;font-weight:700;border:none;cursor:pointer;">Join</button>
    </div>`;
}

function renderEvents() {
    const grid = document.getElementById('eventsGrid');
    if (!grid) return;

    const now = new Date();
    const upcoming = events
        .filter(ev => !ev.date || new Date(ev.date) >= now)
        .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

    if (upcoming.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-10 text-white/40"><p class="text-xl">No upcoming events yet.</p></div>';
        return;
    }

    grid.innerHTML = upcoming.map(ev => {
        const d = ev.date ? new Date(ev.date) : null;
        const month = d ? d.toLocaleString('default', { month: 'short' }).toUpperCase() : '-';
        const day = d ? d.getDate() : '-';
        const year = d ? d.getFullYear() : '';
        const time = d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const fullDate = d ? d.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '-';

        return `
        <div class="bg-white/10 border border-white/20 rounded-2xl p-6 flex gap-5 items-start hover:bg-white/15 transition-all" style="min-height:140px;">
            <div class="flex-shrink-0 w-16 rounded-xl overflow-hidden border border-white/20 text-center" style="background:linear-gradient(135deg,#4f46e5,#7c3aed);">
                <div style="background:rgba(255,255,255,0.15);padding:4px 0;font-size:9px;letter-spacing:2px;font-weight:800;color:rgba(255,255,255,0.9);">${month}</div>
                <div style="font-size:32px;font-weight:900;color:#fff;line-height:1.1;padding:6px 0 2px;">${day}</div>
                <div style="font-size:9px;color:rgba(255,255,255,0.6);padding-bottom:6px;">${year}</div>
            </div>
            <div class="flex-1 min-w-0 flex flex-col justify-between" style="min-height:100px;">
                <div>
                    <h3 class="text-white font-bold text-base leading-tight mb-2">${ev.title}</h3>
                    ${ev.description ? `<p class="text-white/60 text-sm leading-relaxed mb-2">${ev.description}</p>` : ''}
                </div>
                <div class="flex flex-col gap-1 mt-auto">
                    <p class="text-indigo-300 text-xs font-semibold">Org: ${ev.org || 'Admin'}</p>
                    ${eventVisibilityBadge(ev)}
                    ${d ? `<p class="text-white/70 text-xs">📅 ${fullDate}</p>` : ''}
                    ${time ? `<p class="text-white/70 text-xs">🕐 ${time}</p>` : ''}
                    ${ev.location ? `<p class="text-white/50 text-xs">📍 ${ev.location}</p>` : ''}
                    ${renderJoinStatus(ev)}
                </div>
            </div>
        </div>`;
    }).join('');
}

async function updateAuthDropdown() {
    const dropdown = document.getElementById('authDropdown');
    if (!dropdown) return;

    if (authState.user) {
        const displayName = authState.role === 'admin' ? 'Admin' : getDisplayName(authState.user);
        dropdown.innerHTML = `
            <div class="px-4 py-2 border-b border-slate-100">
                <p class="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Signed in as</p>
                <p class="text-sm font-bold text-slate-800 truncate">${displayName}</p>
            </div>
            ${authState.role === 'admin' ? '<a href="admindash.html" class="block px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-colors">Admin Dashboard</a>' : ''}
            ${authState.role === 'leader' ? '<a href="leaderdash.html" class="block px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-colors">Leader Dashboard</a>' : ''}
            <a href="#" id="navSignOutBtn" class="block px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors">Sign Out</a>`;
        document.getElementById('navSignOutBtn').addEventListener('click', async e => {
            e.preventDefault();
            await signOutToLogin();
        });
    } else {
        dropdown.innerHTML = `
            <a href="sign_in.html" class="block px-4 py-2 text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">Sign In</a>
            <a href="sign_up.html" class="block px-4 py-2 text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors border-t border-slate-100">Sign Up</a>`;
    }
}

function setNotifBadge(count) {
    const btn = document.getElementById('notifBtn');
    const badge = document.getElementById('notifBadge');
    if (!btn || !badge) return;
    btn.style.display = authState.user ? 'block' : 'none';
    badge.textContent = count > 9 ? '9+' : count;
    badge.style.display = count > 0 ? 'flex' : 'none';
}

function notifItem(title, text, action) {
    return `
        <button type="button" class="notif-item" data-action="${action}" style="width:100%;border:0;background:#fff;text-align:left;cursor:pointer;">
            <span style="width:9px;height:9px;margin-top:5px;border-radius:50%;background:#ef4444;flex-shrink:0;"></span>
            <span class="notif-info">
                <h4>${title}</h4>
                <p>${text}</p>
            </span>
        </button>`;
}

async function renderNotifications() {
    const dropdown = document.getElementById('notifDropdown');
    if (!dropdown) return;

    if (!authState.user || authState.role === 'admin') {
        setNotifBadge(0);
        dropdown.innerHTML = '';
        return;
    }

    let count = 0;
    let html = '<div class="notif-header">Notifications</div>';

    if (authState.role === 'leader' && authState.leader) {
        const orgId = authState.leader.org_id;
        const [{ data: memberRows }, { data: eventRows }] = await Promise.all([
            supabase.from('joins').select('*').eq('org_id', orgId),
            supabase.from('events').select('id,title').eq('org_id', orgId),
        ]);
        const eventIds = (eventRows || []).map(ev => ev.id);
        let attendeeRows = [];
        if (eventIds.length > 0) {
            const { data } = await supabase.from('event_joins').select('*').in('event_id', eventIds);
            attendeeRows = data || [];
        }

        const pendingMembers = (memberRows || []).filter(m => (m.status || 'pending') === 'pending');
        const pendingAttendees = attendeeRows.filter(j => (j.status || 'pending') === 'pending');
        const visible = [
            ...pendingMembers.map(m => ({
                title: 'Membership request',
                text: `${m.name || m.email || 'A student'} wants to join ${authState.leader.org_name || 'your organization'}.`,
                action: 'leader',
            })),
            ...pendingAttendees.map(j => {
                const ev = (eventRows || []).find(e => String(e.id) === String(j.event_id));
                return {
                    title: 'Event attendee request',
                    text: `${j.user_name || j.user_email || 'A student'} requested to join ${ev?.title || 'an event'}.`,
                    action: 'leader',
                };
            }),
        ];

        count = visible.length;
        html += visible.length === 0
            ? '<div class="notif-empty">No leader notifications yet.</div>'
            : visible.slice(0, 8).map(n => notifItem(n.title, n.text, n.action)).join('');

        dropdown.innerHTML = html;
        setNotifBadge(count);
        dropdown.querySelectorAll('[data-action="leader"]').forEach(item => {
            item.addEventListener('click', () => {
                window.location.href = 'leaderdash.html';
            });
        });
        return;
    }

    const email = authState.user.email;
    const myJoins = joins.filter(j => j.email === email);
    const approvedOrgIds = myJoins
        .filter(j => j.status === 'approved')
        .map(j => String(j.org_id));
    const now = new Date();
    const memberOrgEvents = events.filter(ev =>
        approvedOrgIds.includes(String(ev.org_id)) &&
        (!ev.date || new Date(ev.date) >= now)
    );
    const completedOrgApplications = myJoins.filter(j => ['approved', 'rejected'].includes(j.status));
    const visible = [
        ...memberOrgEvents.map(ev => ({
            title: 'New organization event',
            text: `${ev.org || 'Your organization'} posted ${ev.title || 'an event'}.`,
        })),
        ...completedOrgApplications.map(j => ({
            title: 'Organization application',
            text: `${j.org_name || 'Organization'}: ${j.status.toUpperCase()}`,
        })),
    ];
    count = visible.length;
    html += visible.length === 0
        ? '<div class="notif-empty">No student notifications yet.</div>'
        : visible.slice(0, 8).map(n => notifItem(n.title, n.text, 'student')).join('');

    dropdown.innerHTML = html;
    setNotifBadge(count);
    dropdown.querySelectorAll('[data-action]').forEach(item => {
        item.addEventListener('click', () => {
            document.getElementById('events-section')?.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

window.toggleAuthMenu = async function() {
    const dropdown = document.getElementById('authDropdown');
    await updateAuthDropdown();
    dropdown.classList.toggle('hidden');
    window.onclick = function(event) {
        if (!event.target.closest('button') && !event.target.closest('#authDropdown')) dropdown.classList.add('hidden');
    };
};

window.toggleNotifMenu = async function() {
    const dropdown = document.getElementById('notifDropdown');
    if (!dropdown) return;
    await renderNotifications();
    dropdown.classList.toggle('hidden');
};

window.updateFilters = function() {
    filters.category = document.getElementById('categoryFilter').value;
    filters.department = document.getElementById('deptFilter').value;
    render();
};

window.handleSearch = function() {
    filters.searchQuery = document.getElementById('navSearch').value;
    render();
    window.scrollToOrgs();
};

window.scrollToOrgs = function() {
    document.getElementById('organizations-section')?.scrollIntoView({ behavior: 'smooth' });
};

window.attendEvent = async function(eventId) {
    if (!authState.user) {
        alert('Please sign in first.');
        return;
    }

    const ev = events.find(e => String(e.id) === String(eventId));
    if (!ev) return;

    const existing = getEventJoinForUser(ev);
    if (existing) {
        renderEvents();
        return;
    }

    const membership = joins.find(j => String(j.org_id) === String(ev.org_id) && j.email === authState.user.email);
    const isOrgMember = membership?.status === 'approved';
    if (ev.visibility === 'exclusive' && ev.org_id && !isOrgMember) {
        alert('You must be an approved member of ' + (ev.org || 'the organization') + ' to attend this event.');
        return;
    }

    const { error } = await supabaseAdmin.from('event_joins').insert({
        event_id: ev.id,
        user_email: authState.user.email,
        email: authState.user.email,
        user_name: getDisplayName(authState.user),
        name: getDisplayName(authState.user),
        status: ev.visibility === 'exclusive' && ev.org_id && !isOrgMember ? 'pending' : 'approved',
    });

    if (error) {
        alert('Could not join event: ' + error.message);
        return;
    }

    await loadData();
    renderEvents();
};

window.applyToOrgForEvent = async function(orgId, orgName, eventId) {
    if (!authState.user) {
        alert('Please sign in first.');
        return;
    }
    const alreadyApplied = joins.some(j => String(j.org_id) === String(orgId) && j.email === authState.user.email);
    if (alreadyApplied) {
        alert('You already have a membership request for ' + orgName + '.');
        return;
    }
    const apply = confirm('To join this event you must first be a member of ' + orgName + '.\n\nSubmit a membership application now?');
    if (!apply) return;

    await supabaseAdmin.from('joins').insert({
        org_id: parseInt(orgId, 10),
        org_name: orgName,
        name: getDisplayName(authState.user),
        email: authState.user.email,
        status: 'pending',
        reason: 'Applied via event join request.',
    });
    if (eventId) {
        await supabaseAdmin.from('event_joins').insert({
            event_id: parseInt(eventId, 10),
            user_email: authState.user.email,
            email: authState.user.email,
            user_name: getDisplayName(authState.user),
            name: getDisplayName(authState.user),
            status: 'pending',
        });
    }
    window.location.href = 'viewdetails.html?id=' + orgId;
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    render();
    renderEvents();
    await updateAuthDropdown();
    await renderNotifications();
    document.addEventListener('click', e => {
        if (!e.target.closest('#notifBtn')) {
            document.getElementById('notifDropdown')?.classList.add('hidden');
        }
    });
});
