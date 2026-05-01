import { supabase, supabaseAdmin } from './supabase.js';
import { ADMIN_EMAIL, getSessionUser } from './auth.js';

// =============================================
// NUnite Admin Dashboard - admin.js  (Supabase)
// =============================================

// ── Supabase helpers ──
async function getOrgs() {
    const { data, error } = await supabaseAdmin.from('organizations').select('*').order('id');
    if (error) { console.error('getOrgs error:', error); return []; }
    return data || [];
}

async function getEvents() {
    const { data, error } = await supabaseAdmin.from('events').select('*').order('id');
    if (error) { console.error('getEvents error:', error); return []; }
    return data || [];
}

document.addEventListener('DOMContentLoaded', async () => {

    // ---- ADMIN GUARD ----
    const adminUser = await getSessionUser();
    if (!adminUser || adminUser.email !== ADMIN_EMAIL) {
        alert('Access denied. Admins only.');
        window.location.href = 'sign_in.html';
        return;
    }

    // ---- GET ALL DOM REFS ----
    const orgContainer   = document.getElementById('orgTableBody');
    const eventContainer = document.getElementById('eventTableBody');
    const orgModal       = document.getElementById('organizationModal');
    const viewModal      = document.getElementById('viewOrgModal');
    const eventModal     = document.getElementById('eventModal');
    const assignModal    = document.getElementById('assignLeaderModal');
    const orgForm        = document.getElementById('organizationForm');
    const eventForm      = document.getElementById('eventForm');
    const modalTitle     = orgModal ? orgModal.querySelector('h3') : null;

    let editingOrgId   = null;
    let assigningOrgId = null;

    function isBeforeToday(dateValue) {
        if (!dateValue) return false;
        const eventDate = new Date(dateValue);
        if (Number.isNaN(eventDate.getTime())) return false;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        return eventDate < todayStart;
    }

    function setMinToday(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        input.min = new Date(todayStart.getTime() - todayStart.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
    }

    async function rejectExpiredPendingEvents(events = null) {
        const rows = events || await getEvents();
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

    // ---- GET USERS from Supabase profiles table ----
    async function getAllUsers() {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, full_name');
            if (error) { console.error('Supabase fetch error:', error); return []; }
            return (data || []).map(u => ({
                id:       u.id,
                email:    u.email,
                fullName: u.full_name,
                isAdmin:  false,
            }));
        } catch (err) {
            console.error('getAllUsers error:', err);
            return [];
        }
    }

    // ---- RENDER ORGS ----
    async function renderOrgs() {
        if (!orgContainer) return;
        const orgs = await getOrgs();

        const totalEl    = document.getElementById('stat-total-orgs');
        const approvedEl = document.getElementById('stat-approved-orgs');
        if (totalEl)    totalEl.textContent    = orgs.length;
        if (approvedEl) approvedEl.textContent = orgs.filter(o => o.approved).length;

        // Total approved members from joins table
        const totalMembersEl = document.getElementById('stat-total-members');
        if (totalMembersEl) {
            const { count } = await supabaseAdmin
                .from('joins')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'approved');
            totalMembersEl.textContent = count || 0;
        }

        if (orgs.length === 0) {
            orgContainer.innerHTML = '<div style="text-align:center;padding:40px;color:#888;"><p style="font-size:18px;">No organizations yet.</p><p style="font-size:14px;margin-top:8px;">Click "Add Organization" to get started.</p></div>';
            return;
        }
        orgContainer.innerHTML = orgs.map(org => `
            <div class="org-card-horizontal" data-id="${org.id}">
                <div class="org-card-left">
                    <div class="org-logo-wrapper">
                        ${org.logo_url
                            ? `<img src="${org.logo_url}" alt="${org.name} Logo" style="width:100%;height:100%;object-fit:cover;">`
                            : `<div style="font-size:2rem;display:flex;align-items:center;justify-content:center;width:100%;height:100%;">${org.logo_emoji || '🏫'}</div>`}
                    </div>
                    <div>
                        <h3 class="org-card-title">${org.name}</h3>
                        <span style="font-size:12px;color:#666;">${org.category || ''} · ${org.department || ''}</span>
                    </div>
                </div>
                <div class="org-card-actions">
                    <button class="action-btn view-trigger">View</button>
                    <button class="action-btn edit-trigger">Edit</button>
                    <button class="action-btn assign-leader-trigger" style="background:#272789;color:white;border:none;">Assign Leader</button>
                    <button class="action-btn delete-org" style="background:#ff4d4d;color:white;border:none;">Delete</button>
                </div>
            </div>`).join('');
        attachOrgListeners();
    }

    // ---- RENDER EVENTS ----
    async function renderEvents() {
        if (!eventContainer) return;
        const events = await rejectExpiredPendingEvents(await getEvents());
        const filterEl = document.getElementById('eventStatusFilter');
        const activeFilter = filterEl ? filterEl.value : 'needs_approval';

        let filtered = [];
        if (activeFilter === 'needs_approval') {
            filtered = events.filter(ev => !ev.approved && ev.rejected !== true);
        } else if (activeFilter === 'approved') {
            filtered = events.filter(ev => ev.approved);
        } else if (activeFilter === 'not_approved') {
            filtered = events.filter(ev => ev.rejected === true);
        }

        if (filtered.length === 0) {
            eventContainer.innerHTML = `<div style="text-align:center;padding:40px;color:#888;"><p style="font-size:18px;">No events in this category.</p></div>`;
            return;
        }

        const status = activeFilter === 'needs_approval' ? 'pending'
                     : activeFilter === 'approved'       ? 'approved'
                     : 'rejected';

        eventContainer.innerHTML = filtered.map(ev => renderEventCard(ev, status)).join('');
        attachEventListeners();
    }

    function renderEventCard(ev, status) {
        const dateStr = ev.date ? new Date(ev.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'No date';
        const source  = (ev.created_by === 'leader' ? '👤 Leader' : '🔑 Admin') + ' · ' + (ev.org || '');
        const icon    = status === 'rejected' ? '❌' : status === 'approved' ? '✅' : '📅';
        return `<div class="org-card-horizontal" data-id="${ev.id}">
            <div class="org-card-left">
                <div class="org-logo-wrapper" style="font-size:2rem;display:flex;align-items:center;justify-content:center;">${icon}</div>
                <div>
                    <h3 class="org-card-title">${ev.title}</h3>
                    <p style="margin:0;font-size:13px;color:#666;">${source} · ${dateStr}</p>
                    ${ev.description ? `<p style="margin:2px 0 0;font-size:12px;color:#999;">${ev.description}</p>` : ''}
                </div>
            </div>
            <div class="org-card-actions">
                ${status === 'pending'
                    ? `<button class="action-btn approve-event" style="background:#22c55e;color:white;border:none;">Approve</button>
                       <button class="action-btn reject-event"  style="background:#ff4d4d;color:white;border:none;">Reject</button>`
                    : `<button class="action-btn delete-event"  style="background:#ff4d4d;color:white;border:none;">Delete</button>`}
            </div>
        </div>`;
    }

    // ---- ORG LISTENERS ----
    function attachOrgListeners() {
        document.querySelectorAll('.view-trigger').forEach(btn => {
            btn.addEventListener('click', e => {
                const id = parseInt(e.target.closest('.org-card-horizontal').dataset.id);
                openViewModal(id);
            });
        });
        document.querySelectorAll('.edit-trigger').forEach(btn => {
            btn.addEventListener('click', e => {
                const id = parseInt(e.target.closest('.org-card-horizontal').dataset.id);
                openEditModal(id);
            });
        });
        document.querySelectorAll('.assign-leader-trigger').forEach(btn => {
            btn.addEventListener('click', e => {
                const id = parseInt(e.target.closest('.org-card-horizontal').dataset.id);
                openAssignModal(id);
            });
        });
        document.querySelectorAll('.delete-org').forEach(btn => {
            btn.addEventListener('click', async e => {
                if (!confirm('Delete this organization? This cannot be undone.')) return;
                const id = parseInt(e.target.closest('.org-card-horizontal').dataset.id);
                try {
                    // Remove leader
                    await supabaseAdmin.from('leaders').delete().eq('org_id', id);
                    // Remove join requests
                    await supabaseAdmin.from('joins').delete().eq('org_id', id);
                    // Remove event_joins for this org's events
                    const { data: orgEvents } = await supabaseAdmin.from('events').select('id').eq('org_id', id);
                    if (orgEvents && orgEvents.length > 0) {
                        const eventIds = orgEvents.map(e => e.id);
                        await supabaseAdmin.from('event_joins').delete().in('event_id', eventIds);
                    }
                    // Remove events
                    await supabaseAdmin.from('events').delete().eq('org_id', id);
                    // Remove org
                    await supabaseAdmin.from('organizations').delete().eq('id', id);
                } catch(err) { console.warn('Delete org error:', err); }
                await renderOrgs();
            });
        });
    }

    // ---- EVENT LISTENERS ----
    function attachEventListeners() {
        document.querySelectorAll('.approve-event').forEach(btn => {
            btn.addEventListener('click', async e => {
                const id = parseInt(e.target.closest('.org-card-horizontal').dataset.id);
                const events = await getEvents();
                const event = events.find(ev => ev.id === id);
                if (event && isBeforeToday(event.date)) {
                    await supabaseAdmin.from('events').update({ approved: false, rejected: true }).eq('id', id);
                    alert('This event date has already passed, so it was moved to Not Approved.');
                    await renderEvents();
                    return;
                }
                await supabaseAdmin.from('events').update({ approved: true, rejected: false }).eq('id', id);
                await renderEvents();
            });
        });
        document.querySelectorAll('.reject-event').forEach(btn => {
            btn.addEventListener('click', async e => {
                const id = parseInt(e.target.closest('.org-card-horizontal').dataset.id);
                if (!confirm('Reject this event?')) return;
                await supabaseAdmin.from('events').update({ approved: false, rejected: true }).eq('id', id);
                await renderEvents();
            });
        });
        document.querySelectorAll('.delete-event').forEach(btn => {
            btn.addEventListener('click', async e => {
                const id = parseInt(e.target.closest('.org-card-horizontal').dataset.id);
                if (!confirm('Remove this event?')) return;
                // Also delete event_joins for this event
                await supabaseAdmin.from('event_joins').delete().eq('event_id', id);
                await supabaseAdmin.from('events').delete().eq('id', id);
                await renderEvents();
            });
        });
    }

    // ---- VIEW MODAL ----
    async function openViewModal(id) {
        const orgs = await getOrgs();
        const org = orgs.find(o => o.id === id);
        if (!org) return;
        document.getElementById('viewOrgName').textContent     = org.name;
        document.getElementById('viewOrgTagline').textContent  = org.description || '';

        // Member count from Supabase
        const { count } = await supabaseAdmin
            .from('joins')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', id)
            .eq('status', 'approved');
        document.getElementById('viewOrgMembers').textContent = (count || 0) + ' members';

        document.getElementById('viewOrgEmail').textContent    = org.email || org.contact_email || 'N/A';
        document.getElementById('viewOrgLocation').textContent = org.location || 'N/A';
        const logoEl = document.getElementById('viewOrgLogo');
        if (org.logo_url) { logoEl.src = org.logo_url; logoEl.style.display = 'block'; }
        else { logoEl.style.display = 'none'; }
        const tagContainer = document.getElementById('viewOrgTags');
        if (tagContainer) {
            tagContainer.innerHTML = [org.category, org.department].filter(Boolean)
                .map(t => `<span class="tag">${t}</span>`).join('');
        }
        viewModal.style.display = 'block';
    }

    // ---- EDIT MODAL ----
    async function openEditModal(id) {
        const orgs = await getOrgs();
        const org = orgs.find(o => o.id === id);
        if (!org) return;
        editingOrgId = id;
        if (modalTitle) modalTitle.textContent = 'Edit Organization';
        orgForm.reset();
        document.getElementById('orgName').value              = org.name            || '';
        document.getElementById('orgDept').value              = org.department      || 'all';
        document.getElementById('orgCategory').value          = org.category        || 'all';
        document.getElementById('orgDescription').value       = org.description     || '';
        document.getElementById('orgFullDescription').value   = org.full_description || '';
        document.getElementById('contactPerson').value        = org.contact_person   || '';
        document.getElementById('contactEmail').value         = org.contact_email    || '';
        document.getElementById('website').value              = org.website         || '';
        document.getElementById('location').value             = org.location        || '';
        document.getElementById('applicationsStatus').checked = org.applications_open !== false;
        const preview = document.getElementById('logo-preview');
        if (org.logo_url) { preview.src = org.logo_url; preview.style.display = 'block'; }
        else { preview.style.display = 'none'; }
        orgModal.style.display = 'block';
    }

    // ---- ASSIGN LEADER MODAL ----
    function openAssignModal(orgId) {
        assigningOrgId = orgId;
        getOrgs().then(orgs => {
            const org = orgs.find(o => o.id === orgId);
            if (!org) return;
            document.getElementById('assignModalOrgName').textContent = org.name;
        });
        document.getElementById('studentSearchInput').value = '';
        const listEl = document.getElementById('studentSearchResults');
        listEl.innerHTML = '<div style="text-align:center;padding:20px;color:#aaa;font-size:13px;">Loading students...</div>';
        assignModal.style.display = 'block';
        renderStudentList('');
    }

    async function renderStudentList(query) {
        const listEl = document.getElementById('studentSearchResults');
        listEl.innerHTML = '<div style="text-align:center;padding:20px;color:#aaa;font-size:13px;">⏳ Loading...</div>';

        const users = await getAllUsers();
        if (users.length === 0) {
            listEl.innerHTML = `
                <div style="text-align:center;padding:30px;color:#888;">
                    <p style="font-size:15px;font-weight:600;margin-bottom:6px;">No registered students found.</p>
                    <p style="font-size:12px;color:#aaa;">Students must sign up and confirm their email first.</p>
                </div>`;
            return;
        }

        const { data: leadersData } = await supabase.from('leaders').select('*');
        const leaders = leadersData || [];

        const q = query.toLowerCase();
        const filtered = users.filter(u =>
            u.email !== 'admin@nunite.com' &&
            (!q ||
             (u.fullName && u.fullName.toLowerCase().includes(q)) ||
             (u.email    && u.email.toLowerCase().includes(q)))
        );

        if (filtered.length === 0) {
            listEl.innerHTML = '<div class="no-students-msg">No students match your search.</div>';
            return;
        }

        function buildCard(u) {
            const isLeaderHere      = leaders.find(l => l.email === u.email && l.org_id === assigningOrgId);
            const isLeaderElsewhere = leaders.find(l => l.email === u.email && l.org_id !== assigningOrgId);
            const name = u.fullName || 'Unknown';
            return `
            <div class="student-item">
                <div class="student-item-info">
                    <div class="student-avatar">${name[0].toUpperCase()}</div>
                    <div>
                        <p class="student-name">${name}</p>
                        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:2px;">
                            ${isLeaderHere      ? '<span class="leader-badge current">Current Leader</span>' : ''}
                            ${isLeaderElsewhere ? '<span class="leader-badge other">Leader of another org</span>' : ''}
                        </div>
                    </div>
                </div>
                <button class="assign-confirm-btn ${isLeaderHere ? 'remove-leader-btn' : ''}"
                    data-email="${u.email}" data-name="${name}">
                    ${isLeaderHere ? 'Remove' : 'Assign'}
                </button>
            </div>`;
        }

        listEl.innerHTML = filtered.map(buildCard).join('');

        listEl.querySelectorAll('.assign-confirm-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const email      = btn.dataset.email;
                const name       = btn.dataset.name;
                const isRemoving = btn.classList.contains('remove-leader-btn');
                const orgs       = await getOrgs();
                const org        = orgs.find(o => o.id === assigningOrgId);

                if (isRemoving) {
                    const { error } = await supabaseAdmin
                        .from('leaders')
                        .delete()
                        .eq('email', email)
                        .eq('org_id', assigningOrgId);
                    if (error) { alert('Error removing leader: ' + error.message); return; }
                    alert(name + ' has been removed as leader.');
                } else {
                    await supabaseAdmin.from('leaders').delete().eq('org_id', assigningOrgId);
                    const { error } = await supabaseAdmin.from('leaders').insert({
                        email:    email,
                        name:     name,
                        org_id:   assigningOrgId,
                        org_name: org ? org.name : '',
                    });
                    if (error) { alert('Error assigning leader: ' + error.message); return; }
                    alert(name + ' assigned as leader of ' + (org ? org.name : '') + '!');
                }
                await renderStudentList(document.getElementById('studentSearchInput').value);
            });
        });
    }

    document.getElementById('studentSearchInput').addEventListener('input', e => {
        renderStudentList(e.target.value);
    });

    document.getElementById('closeAssignModal').addEventListener('click', () => {
        assignModal.style.display = 'none';
        assigningOrgId = null;
    });

    // ---- ADD ORG BUTTON ----
    document.getElementById('addOrganizationBtn').addEventListener('click', () => {
        editingOrgId = null;
        orgForm.reset();
        if (modalTitle) modalTitle.textContent = 'Add New Organization';
        const preview = document.getElementById('logo-preview');
        if (preview) { preview.src = '#'; preview.style.display = 'none'; }
        orgModal.style.display = 'block';
    });

    // ---- ADD EVENT BUTTON ----
    document.getElementById('addEventBtn').addEventListener('click', async () => {
        eventForm.reset();
        setMinToday('eventDateTime');
        const orgs   = await getOrgs();
        const select = document.getElementById('eventOrg');
        if (select) {
            select.innerHTML = '<option value="">-- Select Organization --</option>';
            orgs.forEach(org => {
                const opt = document.createElement('option');
                opt.value = org.id;
                opt.textContent = org.name;
                select.appendChild(opt);
            });
        }
        eventModal.style.display = 'block';
    });

    // ---- CLOSE MODALS ----
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (orgModal)    orgModal.style.display    = 'none';
            if (eventModal)  eventModal.style.display  = 'none';
            if (viewModal)   viewModal.style.display   = 'none';
            if (assignModal) assignModal.style.display = 'none';
            editingOrgId   = null;
            assigningOrgId = null;
        });
    });
    document.querySelectorAll('.cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (orgModal)   orgModal.style.display   = 'none';
            if (eventModal) eventModal.style.display = 'none';
            editingOrgId = null;
        });
    });
    window.addEventListener('click', e => {
        if (orgModal    && e.target === orgModal)    { orgModal.style.display    = 'none'; editingOrgId   = null; }
        if (eventModal  && e.target === eventModal)  { eventModal.style.display  = 'none'; }
        if (viewModal   && e.target === viewModal)   { viewModal.style.display   = 'none'; }
        if (assignModal && e.target === assignModal) { assignModal.style.display = 'none'; assigningOrgId = null; }
    });

    // ---- LOGO PREVIEW ----
    document.getElementById('orgLogoFile').addEventListener('change', function () {
        const file = this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            const preview = document.getElementById('logo-preview');
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });

    // ---- SAVE ORG ----
    orgForm.addEventListener('submit', async e => {
        e.preventDefault();
        const preview    = document.getElementById('logo-preview');
        const logoUrl = (preview && preview.style.display !== 'none' && preview.src && !preview.src.endsWith('#'))
            ? preview.src : null;

        const orgData = {
            name:              document.getElementById('orgName').value.trim(),
            department:        document.getElementById('orgDept').value,
            category:          document.getElementById('orgCategory').value,
            description:       document.getElementById('orgDescription').value.trim(),
            full_description:  document.getElementById('orgFullDescription').value.trim(),
            contact_person:    document.getElementById('contactPerson').value.trim(),
            contact_email:     document.getElementById('contactEmail').value.trim(),
            email:             document.getElementById('contactEmail').value.trim(),
            website:           document.getElementById('website').value.trim(),
            location:          document.getElementById('location').value.trim(),
            applications_open: document.getElementById('applicationsStatus').checked,
            approved:          document.getElementById('applicationsStatus').checked,
            logo_url:          logoUrl,
        };

        if (!orgData.name) { alert('Organization name is required.'); return; }

        const wasEditing = editingOrgId;
        if (editingOrgId !== null) {
            const { error } = await supabaseAdmin
                .from('organizations')
                .update(orgData)
                .eq('id', editingOrgId);
            if (error) { alert('Error updating org: ' + error.message); return; }
        } else {
            const { error } = await supabaseAdmin
                .from('organizations')
                .insert(orgData);
            if (error) { alert('Error creating org: ' + error.message); return; }
        }
        await renderOrgs();
        orgModal.style.display = 'none';
        editingOrgId = null;
        alert(wasEditing !== null ? 'Organization updated!' : 'Organization saved!');
    });

    // ---- SAVE EVENT (admin = auto-approved) ----
    eventForm.addEventListener('submit', async e => {
        e.preventDefault();
        const orgSelect       = document.getElementById('eventOrg');
        const selectedOrgId   = orgSelect ? parseInt(orgSelect.value) : null;
        const selectedOrgName = orgSelect ? orgSelect.options[orgSelect.selectedIndex].text : 'Admin';
        const rawDate = document.getElementById('eventDateTime').value;
        if (!rawDate) { alert('Please set an event date and time.'); return; }
        if (isBeforeToday(rawDate)) {
            alert('Hindi pwede ang nakaraang petsa. Pumili ng date na hindi pa lumipas.');
            return;
        }
        const newEvent = {
            title:       document.getElementById('eventTitle').value.trim(),
            description: document.getElementById('eventDescription').value.trim(),
            date:        rawDate,
            org:         selectedOrgName || 'Admin',
            org_id:      selectedOrgId || null,
            location:    document.getElementById('eventLocation').value.trim(),
            visibility:  document.getElementById('eventVisibility').value || 'everyone',
            approved:    true,
            rejected:    false,
            created_by:  'admin',
        };
        const { error } = await supabaseAdmin.from('events').insert(newEvent);
        if (error) { alert('Error adding event: ' + error.message); return; }
        await renderEvents();
        eventModal.style.display = 'none';
        alert('Event added and published!');
    });

    // ---- EVENT FILTER DROPDOWN LISTENER ----
    const filterSel = document.getElementById('eventStatusFilter');
    if (filterSel) {
        filterSel.addEventListener('change', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelector('[data-section="events"]')?.classList.add('active');
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            document.getElementById('events')?.classList.add('active');
            renderEvents();
        });
    }

    // ---- TABS ----
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
            if (target === 'events') renderEvents();
        });
    });

    // ---- INIT ----
    renderOrgs();
    renderEvents();

});