/**
 * leaderdash-supabase.js
 * Drop-in replacement for the <script type="module"> block in leaderdash.html
 * Supabase-backed leader dashboard.
 *
 * HOW TO USE:
 *   1. In leaderdash.html, find the opening <script type="module"> tag near the bottom.
 *   2. Delete everything inside that tag (the entire JS).
 *   3. Replace with: import './leaderdash-supabase.js';
 *      (or just paste the contents of this file there directly)
 */

import { supabase, supabaseAdmin } from './supabase.js';
import { ADMIN_EMAIL, getDisplayName, getSessionUser, signOutToLogin } from './auth.js';

(async function () {

    // ── AUTH GUARD ──
    // Use Supabase Auth as the source of truth.
    const leaderUser = await getSessionUser();
    const userEmail    = leaderUser?.email || '';
    const userFullName = leaderUser ? getDisplayName(leaderUser) : 'Leader';

    if (!userEmail) {
        alert('Access denied. Please sign in first.');
        window.location.href = 'sign_in.html';
        return;
    }

    // Admin should not access leaderdash
    if (userEmail === ADMIN_EMAIL) {
        window.location.href = 'admindash.html';
        return;
    }

    const { data: leaderRows } = await supabase
        .from('leaders')
        .select('*')
        .eq('email', userEmail)
        .limit(1);

    const myLeader = leaderRows && leaderRows[0];
    if (!myLeader) {
        alert('Access denied. You are not assigned as a leader.');
        window.location.href = 'Index.html';
        return;
    }

    const myOrgId   = myLeader.org_id;
    const myOrgName = myLeader.org_name;

    function isBeforeToday(dateValue) {
        if (!dateValue) return false;
        const eventDate = new Date(dateValue);
        if (Number.isNaN(eventDate.getTime())) return false;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        return eventDate < todayStart;
    }

    async function rejectExpiredPendingEvents(events = null) {
        const rows = events || await getMyEvents();
        const expired = rows.filter(ev => !ev.approved && ev.rejected !== true && isBeforeToday(ev.date));
        if (expired.length === 0) return rows;

        await Promise.all(expired.map(ev =>
            supabaseAdmin
                .from('events')
                .update({ approved: false, rejected: true })
                .eq('id', ev.id)
        ));

        return rows.map(ev =>
            expired.some(exp => exp.id === ev.id)
                ? { ...ev, approved: false, rejected: true }
                : ev
        );
    }

    // ── ORG EXISTENCE CHECK via Supabase ──
    const { data: orgCheck } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', myOrgId)
        .maybeSingle();
    if (!orgCheck) {
        alert('Your organization no longer exists. Redirecting...');
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('leaderOrgSubtitle').textContent = myOrgName;

    // ══════════════════════════════════════════════════════
    // TABS
    // ══════════════════════════════════════════════════════
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', e => {
            e.preventDefault();
            const target = tab.dataset.section;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.content-section').forEach(s => {
                s.classList.remove('active');
                if (s.id === target) s.classList.add('active');
            });
            if (target === 'ld-events') renderEvents();
        });
    });

    // ── FILTER PILLS ──
    let activeFilter = 'all';
    document.querySelectorAll('.pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeFilter = pill.dataset.filter;
            renderMembers();
        });
    });
    document.getElementById('memberSearch').addEventListener('input', renderMembers);

    // ══════════════════════════════════════════════════════
    // MEMBERS  (Supabase: joins table)
    // ══════════════════════════════════════════════════════

    async function getMembers() {
        const { data } = await supabase
            .from('joins')
            .select('*')
            .eq('org_id', myOrgId);
        return data || [];
    }

    async function updateJoinStatus(joinId, status) {
        const { error } = await supabaseAdmin
            .from('joins')
            .update({ status })
            .eq('id', joinId);
        if (error) throw error;
    }

    async function renderMembers() {
        const members = await getMembers();
        const query   = document.getElementById('memberSearch').value.toLowerCase();

        document.getElementById('stat-total-members').textContent = members.length;
        document.getElementById('stat-pending').textContent       = members.filter(m => (m.status || 'pending') === 'pending').length;
        document.getElementById('stat-approved').textContent      = members.filter(m => m.status === 'approved').length;

        let filtered = activeFilter !== 'all'
            ? members.filter(m => (m.status || 'pending') === activeFilter)
            : members;
        if (query) {
            filtered = filtered.filter(m =>
                m.name?.toLowerCase().includes(query) ||
                m.email?.toLowerCase().includes(query)
            );
        }

        const body = document.getElementById('memberListBody');
        if (filtered.length === 0) {
            body.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <p>No members found</p>
                    <span>Try a different filter or search term.</span>
                </div>`;
            return;
        }

        body.innerHTML = filtered.map(m => {
            const status  = m.status || 'pending';
            const initial = (m.name || 'S')[0].toUpperCase();
            return `
            <div class="member-card" data-join-id="${m.id}" data-email="${m.email}">
                <div class="member-card-left">
                    <div class="member-avatar">${initial}</div>
                    <div>
                        <p class="member-name">${m.name || 'Unknown'}</p>
                        <p class="member-meta">${m.email}${m.department ? ' · ' + m.department : ''}</p>
                    </div>
                </div>
                <div class="member-card-actions">
                    <span class="status-badge ${status}">
                        ${status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                    <button class="action-btn reason-btn view-reason-btn">View Reason</button>
                    ${status !== 'approved' ? `<button class="action-btn approve-btn do-approve">Approve</button>` : ''}
                    ${status !== 'rejected' ? `<button class="action-btn reject-btn do-reject">Reject</button>`   : ''}
                </div>
            </div>`;
        }).join('');

        body.querySelectorAll('.member-card').forEach(card => {
            const joinId = card.dataset.joinId;
            const email  = card.dataset.email;

            card.querySelector('.view-reason-btn')?.addEventListener('click', async () => {
                const members = await getMembers();
                const m = members.find(x => x.email === email);
                if (!m) return;
                currentReasonMember = m;
                const initial = (m.name || 'S')[0].toUpperCase();
                document.getElementById('reasonStudentAvatar').textContent = initial;
                document.getElementById('reasonStudentName').textContent   = m.name  || m.email || 'Unknown';
                document.getElementById('reasonStudentEmail').textContent  = m.email || '';
                document.getElementById('reasonStudentDept').textContent   = m.department ? `Department: ${m.department}` : '';
                document.getElementById('reasonOrgName').textContent       = myOrgName;
                document.getElementById('reasonText').textContent          = m.reason || '(No reason provided.)';
                const status = m.status || 'pending';
                const statusColors = { pending:'#fef9c3;color:#92400e', approved:'#dcfce7;color:#166534', rejected:'#fee2e2;color:#991b1b' };
                const statusLabels = { pending:'⏳ Pending', approved:'✅ Approved', rejected:'❌ Rejected' };
                document.getElementById('reasonCurrentStatus').innerHTML = `<span style="padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;background:${statusColors[status]||statusColors.pending}">${statusLabels[status]||status}</span>`;
                document.getElementById('reasonModal').style.display = 'block';
            });

            card.querySelector('.do-approve')?.addEventListener('click', async () => {
                try {
                    await updateJoinStatus(joinId, 'approved');
                    // Auto-approve pending event joins for this user in this org's events
                    await autoApproveEventJoins(email);
                    await renderMembers();
                } catch(err) { alert('Error: ' + err.message); }
            });

            card.querySelector('.do-reject')?.addEventListener('click', async () => {
                try {
                    await updateJoinStatus(joinId, 'rejected');
                    await renderMembers();
                } catch(err) { alert('Error: ' + err.message); }
            });
        });
    }

    async function autoApproveEventJoins(email) {
        // Get all event IDs for this org
        const { data: orgEvents } = await supabase.from('events').select('id').eq('org_id', myOrgId);
        if (!orgEvents || orgEvents.length === 0) return;
        const eventIds = orgEvents.map(e => e.id);

        // Approve pending event_joins for this user in those events
        for (const eventId of eventIds) {
            await supabaseAdmin
                .from('event_joins')
                .update({ status: 'approved' })
                .eq('event_id', eventId)
                .or(`user_email.eq.${email},email.eq.${email}`)
                .eq('status', 'pending');
        }
    }

    // ── REASON MODAL ──
    let currentReasonMember = null;
    document.getElementById('closeReasonModal').addEventListener('click', () => {
        document.getElementById('reasonModal').style.display = 'none';
    });
    document.getElementById('reasonApproveBtn').addEventListener('click', async () => {
        if (!currentReasonMember) return;
        await updateJoinStatus(currentReasonMember.id, 'approved');
        await autoApproveEventJoins(currentReasonMember.email);
        document.getElementById('reasonModal').style.display = 'none';
        await renderMembers();
    });
    document.getElementById('reasonRejectBtn').addEventListener('click', async () => {
        if (!currentReasonMember) return;
        await updateJoinStatus(currentReasonMember.id, 'rejected');
        document.getElementById('reasonModal').style.display = 'none';
        await renderMembers();
    });
    window.addEventListener('click', e => {
        const modal = document.getElementById('reasonModal');
        if (e.target === modal) modal.style.display = 'none';
    });

    // ══════════════════════════════════════════════════════
    // EVENTS  (Supabase: events table)
    // ══════════════════════════════════════════════════════

    async function getMyEvents() {
        const { data } = await supabase
            .from('events')
            .select('*')
            .eq('org_id', myOrgId)
            .order('id');
        return data || [];
    }

    async function renderEvents() {
        const orgEvents = await rejectExpiredPendingEvents(await getMyEvents());
        const body      = document.getElementById('leaderEventBody');

        if (orgEvents.length === 0) {
            body.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📅</div>
                    <p>No events yet</p>
                    <span>Click "Submit Event" to propose an event. Admin must approve it before it appears publicly.</span>
                </div>`;
            return;
        }

        body.innerHTML = orgEvents.map(ev => {
            const d     = ev.date ? new Date(ev.date) : null;
            const month = d ? d.toLocaleString('default', { month: 'short' }) : '—';
            const day   = d ? d.getDate() : '—';
            const badge = ev.rejected
                ? '<span style="font-size:11px;padding:2px 10px;border-radius:20px;background:#fee2e2;color:#991b1b;font-weight:700;">❌ Not Approved</span>'
                : ev.approved
                ? '<span style="font-size:11px;padding:2px 10px;border-radius:20px;background:#dcfce7;color:#166534;font-weight:700;">✅ Approved</span>'
                : '<span style="font-size:11px;padding:2px 10px;border-radius:20px;background:#fef9c3;color:#92400e;font-weight:700;">⏳ Pending</span>';
            return `
            <div class="event-card-row" data-id="${ev.id}">
                <div class="event-date-pill">
                    <span class="ev-month">${month}</span>
                    <span class="ev-day">${day}</span>
                </div>
                <div class="event-card-info" style="flex:1;">
                    <h4>${ev.title} ${badge}</h4>
                    <p>${ev.description || 'No description.'}</p>
                    ${ev.location ? `<p style="margin-top:3px;">📍 ${ev.location}</p>` : ''}
                    <div class="event-card-actions">
                        <button class="ev-action-btn ev-btn-view"   data-id="${ev.id}">View</button>
                        <button class="ev-action-btn ev-btn-edit"   data-id="${ev.id}">Edit</button>
                        <button class="ev-action-btn ev-btn-delete" data-id="${ev.id}">Delete</button>
                    </div>
                </div>
            </div>`;
        }).join('');

        // VIEW
        body.querySelectorAll('.ev-btn-view').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id      = parseInt(btn.dataset.id);
                const events  = await getMyEvents();
                const ev      = events.find(e => e.id === id);
                if (!ev) return;
                document.getElementById('vevTitle').textContent       = ev.title;
                document.getElementById('vevDescription').textContent = ev.description || '(No description.)';
                document.getElementById('vevLocation').textContent    = ev.location    || '(No location.)';
                document.getElementById('vevDate').textContent        = ev.date
                    ? new Date(ev.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                    : '(No date.)';
                document.getElementById('vevStatus').innerHTML = ev.rejected
                    ? '<span style="font-size:12px;padding:3px 12px;border-radius:20px;background:#fee2e2;color:#991b1b;font-weight:700;">❌ Not Approved</span>'
                    : ev.approved
                    ? '<span style="font-size:12px;padding:3px 12px;border-radius:20px;background:#dcfce7;color:#166534;font-weight:700;">✅ Approved</span>'
                    : '<span style="font-size:12px;padding:3px 12px;border-radius:20px;background:#fef9c3;color:#92400e;font-weight:700;">⏳ Pending Admin Approval</span>';
                document.getElementById('viewEventModal').style.display = 'block';
            });
        });

        // EDIT
        body.querySelectorAll('.ev-btn-edit').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id     = parseInt(btn.dataset.id);
                const events = await getMyEvents();
                const ev     = events.find(e => e.id === id);
                if (!ev) return;
                document.getElementById('editEventId').value          = ev.id;
                document.getElementById('editEventTitle').value       = ev.title       || '';
                document.getElementById('editEventDescription').value = ev.description || '';
                document.getElementById('editEventDateTime').value    = ev.date        || '';
                document.getElementById('editEventLocation').value    = ev.location    || '';
                document.getElementById('editEventVisibility').value  = ev.visibility  || 'everyone';
                // Set minimum date to start of today so past dates can't be picked
                const todayLocalEdit = new Date();
                todayLocalEdit.setHours(0, 0, 0, 0);
                const todayStrEdit = new Date(todayLocalEdit.getTime() - todayLocalEdit.getTimezoneOffset() * 60000)
                    .toISOString().slice(0, 16);
                document.getElementById('editEventDateTime').min = todayStrEdit;
                document.getElementById('editEventModal').style.display = 'block';
            });
        });

        // DELETE
        body.querySelectorAll('.ev-btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.dataset.id);
                if (!confirm('Delete this event? This cannot be undone.')) return;
                btn.disabled = true;
                const { error } = await supabaseAdmin.from('events').delete().eq('id', id);
                if (error) { alert('Error: ' + error.message); btn.disabled = false; return; }
                await renderEvents();
            });
        });
    }

    // ── LEADER EVENT SUBMISSION ──
    const leaderEventModal = document.getElementById('leaderEventModal');
    const leaderEventForm  = document.getElementById('leaderEventForm');

    document.getElementById('leaderAddEventBtn').addEventListener('click', () => {
        leaderEventForm.reset();
        // Set minimum date to start of today so past dates can't be picked
        const todayLocal = new Date();
        todayLocal.setHours(0, 0, 0, 0);
        const todayStr = new Date(todayLocal.getTime() - todayLocal.getTimezoneOffset() * 60000)
            .toISOString().slice(0, 16);
        document.getElementById('ldEventDateTime').min = todayStr;
        leaderEventModal.style.display = 'block';
    });
    document.getElementById('closeLeaderEventModal').addEventListener('click', () => { leaderEventModal.style.display = 'none'; });
    document.getElementById('cancelLeaderEventBtn').addEventListener('click', () => { leaderEventModal.style.display = 'none'; });
    window.addEventListener('click', e => { if (e.target === leaderEventModal) leaderEventModal.style.display = 'none'; });

    leaderEventForm.addEventListener('submit', async e => {
        e.preventDefault();
        const title = document.getElementById('ldEventTitle').value.trim();
        if (!title) { alert('Event title is required.'); return; }

        const rawDate = document.getElementById('ldEventDateTime').value;
        if (!rawDate) { alert('Please set an event date and time.'); return; }
        // Block dates before today — today itself is still allowed (any time today is fine)
        const selectedDate = new Date(rawDate);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        if (selectedDate < todayStart) {
            alert('❌ Hindi pwede ang nakaraang petsa. Pumili ng date na hindi pa lumipas.');
            return;
        }

        const row = {
            title:       title,
            description: document.getElementById('ldEventDescription').value.trim() || null,
            date:        document.getElementById('ldEventDateTime').value || null,
            org:         myOrgName,
            org_id:      myOrgId,
            location:    document.getElementById('ldEventLocation').value.trim() || null,
            visibility:  document.getElementById('ldEventVisibility').value || 'everyone',
            approved:    false,
            rejected:    false,
            created_by:  'leader',
        };

        const { error } = await supabaseAdmin.from('events').insert(row);
        if (error) { alert('Error submitting event: ' + error.message); return; }

        leaderEventModal.style.display = 'none';
        await renderEvents();
        alert('Event submitted! It will appear publicly once the admin approves it.');
    });

    // ── VIEW MODAL CLOSE ──
    document.getElementById('closeViewEventModal').addEventListener('click', () => {
        document.getElementById('viewEventModal').style.display = 'none';
    });
    document.getElementById('closeViewEventModalBtn')?.addEventListener('click', () => {
        document.getElementById('viewEventModal').style.display = 'none';
    });
    window.addEventListener('click', e => {
        if (e.target === document.getElementById('viewEventModal'))
            document.getElementById('viewEventModal').style.display = 'none';
    });

    // ── EDIT MODAL ──
    document.getElementById('closeEditEventModal').addEventListener('click', () => {
        document.getElementById('editEventModal').style.display = 'none';
    });
    document.getElementById('cancelEditEventBtn').addEventListener('click', () => {
        document.getElementById('editEventModal').style.display = 'none';
    });
    window.addEventListener('click', e => {
        if (e.target === document.getElementById('editEventModal'))
            document.getElementById('editEventModal').style.display = 'none';
    });

    document.getElementById('editEventForm').addEventListener('submit', async e => {
        e.preventDefault();
        const id    = parseInt(document.getElementById('editEventId').value);
        const title = document.getElementById('editEventTitle').value.trim();
        if (!title) { alert('Event title is required.'); return; }

        const rawEditDate = document.getElementById('editEventDateTime').value;
        if (!rawEditDate) { alert('Please set an event date and time.'); return; }
        // Block dates before today — today itself is still allowed
        const selectedEditDate = new Date(rawEditDate);
        const todayStartEdit = new Date();
        todayStartEdit.setHours(0, 0, 0, 0);
        if (selectedEditDate < todayStartEdit) {
            alert('❌ Hindi pwede ang nakaraang petsa. Pumili ng date na hindi pa lumipas.');
            return;
        }

        const patch = {
            title:       title,
            description: document.getElementById('editEventDescription').value.trim() || null,
            date:        document.getElementById('editEventDateTime').value || null,
            location:    document.getElementById('editEventLocation').value.trim() || null,
            visibility:  document.getElementById('editEventVisibility').value || 'everyone',
            approved:    false, // Reset approval on edit
            rejected:    false,
        };
        const { error } = await supabaseAdmin.from('events').update(patch).eq('id', id);
        if (error) { alert('Error updating event: ' + error.message); return; }
        document.getElementById('editEventModal').style.display = 'none';
        await renderEvents();
        alert('Event updated! It will need admin re-approval.');
    });

    // ══════════════════════════════════════════════════════
    // ATTENDEES  (Supabase: event_joins table)
    // ══════════════════════════════════════════════════════

    async function renderAttendees() {
        // Fetch events for this org
        const { data: myEvents } = await supabase.from('events').select('*').eq('org_id', myOrgId);
        const events = myEvents || [];

        // Fetch all event_joins for those events
        const eventIds = events.map(e => e.id);
        let attendees = [];
        if (eventIds.length > 0) {
            const { data } = await supabase.from('event_joins').select('*').in('event_id', eventIds);
            attendees = data || [];
        }

        // Fetch org members
        const { data: orgJoinsData } = await supabase.from('joins').select('*').eq('org_id', myOrgId);
        const orgJoins = orgJoinsData || [];

        // Badge on tab
        const pendingCount = attendees.filter(j => (j.status || 'pending') === 'pending').length;
        const badge = document.getElementById('attendeeTabBadge');
        if (badge) {
            badge.textContent   = pendingCount > 9 ? '9+' : pendingCount;
            badge.style.display = pendingCount > 0 ? 'inline' : 'none';
        }

        const pillsEl = document.getElementById('attendeeEventPills');
        if (pillsEl) pillsEl.innerHTML = '';

        const body = document.getElementById('attendeeListBody');

        if (events.length === 0) {
            body.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📅</div>
                    <p>No events yet</p>
                    <span>Submit events and students can join them.</span>
                </div>`;
            return;
        }

        body.innerHTML = events.map((ev, idx) => {
            const evAttendees = attendees.filter(j => j.event_id === ev.id);
            const pending     = evAttendees.filter(j => (j.status || 'pending') === 'pending').length;
            const approved    = evAttendees.filter(j => j.status === 'approved').length;
            const d           = ev.date ? new Date(ev.date) : null;
            const dateStr     = d ? d.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date';

            const pendingPill  = pending  > 0 ? `<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#fef9c3;color:#92400e;font-weight:700;">⏳ ${pending} pending</span>` : '';
            const approvedPill = approved > 0 ? `<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#dcfce7;color:#166534;font-weight:700;">✅ ${approved} attending</span>` : '';
            const emptyPill    = evAttendees.length === 0 ? `<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#f1f5f9;color:#94a3b8;font-weight:700;">No requests</span>` : '';

            const rows = evAttendees.length === 0
                ? `<div style="padding:18px 20px;text-align:center;color:#aaa;font-size:13px;">No attendee requests for this event.</div>`
                : evAttendees.map(j => {
                    const status    = j.status || 'pending';
                    const initial   = (j.user_name || j.user_email || '?')[0].toUpperCase();
                    const isMember  = orgJoins.some(oj => oj.email === j.user_email && oj.status === 'approved');
                    const isPending = orgJoins.some(oj => oj.email === j.user_email && (oj.status || 'pending') === 'pending');

                    const memberPill = isMember
                        ? `<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#dcfce7;color:#166534;font-weight:700;">✅ Org Member</span>`
                        : isPending
                        ? `<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#fef9c3;color:#92400e;font-weight:700;">⏳ Join Pending</span>`
                        : `<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#fee2e2;color:#991b1b;font-weight:700;">⚠️ Not in Org</span>`;

                    let actionHtml = '';
                    if (status === 'pending') {
                        if (!isMember) {
                            actionHtml = `
                                <button class="action-btn approve-btn do-approve-attendee" data-id="${j.id}" disabled style="opacity:.4;cursor:not-allowed;">Approve</button>
                                <button class="action-btn reject-btn do-reject-attendee"   data-id="${j.id}" disabled style="opacity:.4;cursor:not-allowed;">Decline</button>
                                <button class="action-btn reason-btn do-invite-member" data-email="${j.user_email}" data-name="${(j.user_name||'').replace(/"/g,'')}" style="font-size:11px;white-space:nowrap;">+ Add to Org First</button>`;
                        } else {
                            actionHtml = `
                                <button class="action-btn approve-btn do-approve-attendee" data-id="${j.id}">Approve</button>
                                <button class="action-btn reject-btn do-reject-attendee"   data-id="${j.id}">Decline</button>`;
                        }
                    } else if (status === 'approved') {
                        actionHtml = `<span class="status-badge approved">✅ Approved</span>`;
                    } else {
                        actionHtml = `<span class="status-badge rejected">❌ Declined</span>`;
                    }

                    return `
                    <div class="member-card" style="border-radius:0;border-left:none;border-right:none;border-top:none;margin-bottom:0;" data-join-id="${j.id}">
                        <div class="member-card-left">
                            <div class="member-avatar">${initial}</div>
                            <div>
                                <p class="member-name">${j.user_name || 'Unknown'}</p>
                                <p class="member-meta">${j.user_email}</p>
                                <div style="margin-top:4px;display:flex;gap:6px;flex-wrap:wrap;">${memberPill}</div>
                            </div>
                        </div>
                        <div class="member-card-actions">${actionHtml}</div>
                    </div>`;
                }).join('');

            return `
            <div class="ev-accordion" data-accordion-idx="${idx}">
                <div class="ev-accordion-header" onclick="toggleAccordion(${idx})">
                    <div class="ev-accordion-header-left">
                        <div class="event-date-pill" style="width:42px;height:42px;border-radius:10px;">
                            <span class="ev-month">${d ? d.toLocaleString('default',{month:'short'}) : '—'}</span>
                            <span class="ev-day">${d ? d.getDate() : '—'}</span>
                        </div>
                        <div>
                            <div class="ev-accordion-title">${ev.title}</div>
                            <div class="ev-accordion-meta">${dateStr}${ev.location ? ' · 📍 ' + ev.location : ''}</div>
                            <div class="ev-accordion-pills" style="margin-top:4px;">${pendingPill}${approvedPill}${emptyPill}</div>
                        </div>
                    </div>
                    <span class="ev-accordion-chevron" id="chev-${idx}">▼</span>
                </div>
                <div class="ev-accordion-body" id="acc-body-${idx}">
                    ${rows}
                </div>
            </div>`;
        }).join('');

        // Wire approve/decline/invite
        body.querySelectorAll('.do-approve-attendee:not([disabled])').forEach(btn => {
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                const { error } = await supabaseAdmin.from('event_joins').update({ status: 'approved' }).eq('id', btn.dataset.id);
                if (error) { alert('Error: ' + error.message); }
                await renderAttendees();
            });
        });
        body.querySelectorAll('.do-reject-attendee:not([disabled])').forEach(btn => {
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                const { error } = await supabaseAdmin.from('event_joins').update({ status: 'rejected' }).eq('id', btn.dataset.id);
                if (error) { alert('Error: ' + error.message); }
                await renderAttendees();
            });
        });
        body.querySelectorAll('.do-invite-member').forEach(btn => {
            btn.addEventListener('click', async () => {
                const email = btn.dataset.email;
                const name  = btn.dataset.name || email;

                // Check if already has a join request
                const { data: existing } = await supabase
                    .from('joins')
                    .select('id')
                    .eq('org_id', myOrgId)
                    .eq('email', email)
                    .maybeSingle();

                if (existing) { alert(`${name} already has a membership request.`); return; }

                const { error } = await supabaseAdmin.from('joins').insert({
                    org_id:   myOrgId,
                    org_name: myOrgName,
                    email:    email,
                    name:     name,
                    status:   'pending',
                    reason:   'Added by leader from event attendee request.',
                });
                if (error) { alert('Error: ' + error.message); return; }
                alert(`✅ ${name} added to Members as Pending. Approve them in the Members tab first.`);
                await renderAttendees();
                await renderMembers();
            });
        });
    }

    // Accordion toggle
    window.toggleAccordion = function(idx) {
        const body = document.getElementById('acc-body-' + idx);
        const chev = document.getElementById('chev-' + idx);
        if (!body) return;
        const open = body.style.display !== 'none' && body.style.display !== '';
        body.style.display = open ? 'none' : 'block';
        if (chev) chev.textContent = open ? '▶' : '▼';
    };

    // ── SIGN OUT ──
    document.getElementById('leaderSignOutBtn').addEventListener('click', async () => {
        await signOutToLogin();
    });

    // ── INIT ──
    await renderMembers();
    await renderAttendees();

})();
