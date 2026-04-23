// =============================================
// NUnite Admin Dashboard - admin.js
// =============================================

const STORAGE_KEY = 'nunite_organizations';

function getOrgs() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
}
function saveOrgs(orgs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orgs));
}
function nextId(orgs) {
    return orgs.length > 0 ? Math.max(...orgs.map(o => o.id)) + 1 : 1;
}

document.addEventListener('DOMContentLoaded', () => {

    // ---- ADMIN GUARD ----
    if (localStorage.getItem('isAdmin') !== 'true') {
        alert('Access denied. Admins only.');
        window.location.href = 'sign_in.html';
        return;
    }

    // ---- GET ALL DOM REFS FIRST (fixes assign leader modal bug) ----
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

    // ---- EVENT HELPERS ----
    function getEvents() {
        try { return JSON.parse(localStorage.getItem('nunite_events') || '[]'); }
        catch { return []; }
    }
    function saveEvents(evs) {
        localStorage.setItem('nunite_events', JSON.stringify(evs));
    }

    // ---- GET USERS (checks multiple possible keys sign_up pages use) ----
    function getAllUsers() {
        // Try all common keys sign-up pages might use
        const keys = ['nunite_users', 'users', 'registeredUsers', 'nunite_registered'];
        let all = [];
        keys.forEach(k => {
            try {
                const data = JSON.parse(localStorage.getItem(k) || '[]');
                if (Array.isArray(data)) all = all.concat(data);
            } catch {}
        });
        // Deduplicate by email
        const seen = new Set();
        return all.filter(u => {
            if (!u.email || seen.has(u.email)) return false;
            seen.add(u.email);
            return true;
        });
    }

    // ---- RENDER ORGS ----
    function renderOrgs() {
        if (!orgContainer) return;
        const orgs = getOrgs();
        const totalEl    = document.getElementById('stat-total-orgs');
        const approvedEl = document.getElementById('stat-approved-orgs');
        if (totalEl)    totalEl.textContent    = orgs.length;
        if (approvedEl) approvedEl.textContent = orgs.filter(o => o.approved).length;

        if (orgs.length === 0) {
            orgContainer.innerHTML = '<div style="text-align:center;padding:40px;color:#888;"><p style="font-size:18px;">No organizations yet.</p><p style="font-size:14px;margin-top:8px;">Click "Add Organization" to get started.</p></div>';
            return;
        }
        orgContainer.innerHTML = orgs.map(org => `
            <div class="org-card-horizontal" data-id="${org.id}">
                <div class="org-card-left">
                    <div class="org-logo-wrapper">
                        ${org.logoDataUrl
                            ? `<img src="${org.logoDataUrl}" alt="${org.name} Logo" style="width:100%;height:100%;object-fit:cover;">`
                            : `<div style="font-size:2rem;display:flex;align-items:center;justify-content:center;width:100%;height:100%;">${org.logoEmoji || '🏫'}</div>`}
                    </div>
                    <div>
                        <h3 class="org-card-title">${org.name}</h3>
                        <span style="font-size:12px;color:#666;">${org.category} · ${org.department}</span>
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
    function renderEvents() {
        if (!eventContainer) return;
        const events = getEvents();

        if (events.length === 0) {
            eventContainer.innerHTML = '<div style="text-align:center;padding:40px;color:#888;"><p style="font-size:18px;">No events yet.</p></div>';
            return;
        }

        const pending  = events.filter(ev => !ev.approved);
        const approved = events.filter(ev =>  ev.approved);
        let html = '';

        if (pending.length > 0) {
            html += '<div style="margin-bottom:8px;padding:6px 10px;background:#fef9c3;border-radius:8px;font-size:13px;font-weight:700;color:#92400e;">&#9203; Pending Approval (' + pending.length + ')</div>';
            html += pending.map(ev => renderEventCard(ev, true)).join('');
        }
        if (approved.length > 0) {
            html += '<div style="margin:16px 0 8px;padding:6px 10px;background:#dcfce7;border-radius:8px;font-size:13px;font-weight:700;color:#166534;">&#10003; Approved Events (' + approved.length + ')</div>';
            html += approved.map(ev => renderEventCard(ev, false)).join('');
        }

        eventContainer.innerHTML = html;
        attachEventListeners();
    }

    function renderEventCard(ev, isPending) {
        const dateStr = ev.date ? new Date(ev.date).toLocaleDateString() : 'No date';
        const source  = (ev.createdBy === 'leader' ? 'Leader' : 'Admin') + ' - ' + ev.org;
        return `<div class="org-card-horizontal" data-id="${ev.id}">
            <div class="org-card-left">
                <div class="org-logo-wrapper" style="font-size:2rem;display:flex;align-items:center;justify-content:center;">📅</div>
                <div>
                    <h3 class="org-card-title">${ev.title}</h3>
                    <p style="margin:0;font-size:13px;color:#666;">${source} · ${dateStr}</p>
                    ${ev.description ? `<p style="margin:2px 0 0;font-size:12px;color:#999;">${ev.description}</p>` : ''}
                </div>
            </div>
            <div class="org-card-actions">
                ${isPending
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
            btn.addEventListener('click', e => {
                if (!confirm('Delete this organization? This cannot be undone.')) return;
                const id = parseInt(e.target.closest('.org-card-horizontal').dataset.id);
                saveOrgs(getOrgs().filter(o => o.id !== id));
                renderOrgs();
            });
        });
    }

    // ---- EVENT LISTENERS ----
    function attachEventListeners() {
        document.querySelectorAll('.approve-event').forEach(btn => {
            btn.addEventListener('click', e => {
                const id  = parseInt(e.target.closest('.org-card-horizontal').dataset.id);
                const evs = getEvents().map(ev => ev.id === id ? Object.assign({}, ev, { approved: true }) : ev);
                saveEvents(evs);
                renderEvents();
            });
        });
        document.querySelectorAll('.reject-event').forEach(btn => {
            btn.addEventListener('click', e => {
                const id = parseInt(e.target.closest('.org-card-horizontal').dataset.id);
                if (!confirm('Reject and remove this event?')) return;
                saveEvents(getEvents().filter(ev => ev.id !== id));
                renderEvents();
            });
        });
        document.querySelectorAll('.delete-event').forEach(btn => {
            btn.addEventListener('click', e => {
                const id = parseInt(e.target.closest('.org-card-horizontal').dataset.id);
                if (!confirm('Remove this event?')) return;
                saveEvents(getEvents().filter(ev => ev.id !== id));
                renderEvents();
            });
        });
    }

    // ---- VIEW MODAL ----
    function openViewModal(id) {
        const org = getOrgs().find(o => o.id === id);
        if (!org) return;
        document.getElementById('viewOrgName').textContent     = org.name;
        document.getElementById('viewOrgTagline').textContent  = org.description || '';
        document.getElementById('viewOrgMembers').textContent  = (org.memberCount || 0) + ' members';
        document.getElementById('viewOrgEmail').textContent    = org.email || org.contactEmail || 'N/A';
        document.getElementById('viewOrgLocation').textContent = org.location || 'N/A';
        const logoEl = document.getElementById('viewOrgLogo');
        if (org.logoDataUrl) { logoEl.src = org.logoDataUrl; logoEl.style.display = 'block'; }
        else { logoEl.style.display = 'none'; }
        const tagContainer = document.getElementById('viewOrgTags');
        if (tagContainer) {
            tagContainer.innerHTML = [org.category, org.department].filter(Boolean)
                .map(t => `<span class="tag">${t}</span>`).join('');
        }
        viewModal.style.display = 'block';
    }

    // ---- EDIT MODAL ----
    function openEditModal(id) {
        const org = getOrgs().find(o => o.id === id);
        if (!org) return;
        editingOrgId = id;
        if (modalTitle) modalTitle.textContent = 'Edit Organization';
        orgForm.reset();
        document.getElementById('orgName').value              = org.name            || '';
        document.getElementById('orgDept').value              = org.department      || 'all';
        document.getElementById('orgCategory').value          = org.category        || 'all';
        document.getElementById('orgDescription').value       = org.description     || '';
        document.getElementById('orgFullDescription').value   = org.fullDescription || '';
        document.getElementById('contactPerson').value        = org.contactPerson   || '';
        document.getElementById('contactEmail').value         = org.contactEmail    || '';
        document.getElementById('website').value              = org.website         || '';
        document.getElementById('memberCount').value          = org.memberCount     || '';
        document.getElementById('meetingTime').value          = org.meetingTime     || '';
        document.getElementById('location').value             = org.location        || '';
        document.getElementById('applicationsStatus').checked = org.applicationsOpen !== false;
        const preview = document.getElementById('logo-preview');
        if (org.logoDataUrl) { preview.src = org.logoDataUrl; preview.style.display = 'block'; }
        else { preview.style.display = 'none'; }
        orgModal.style.display = 'block';
    }

    // ---- ASSIGN LEADER MODAL ----
    function openAssignModal(orgId) {
        assigningOrgId = orgId;
        const org = getOrgs().find(o => o.id === orgId);
        if (!org) return;
        document.getElementById('assignModalOrgName').textContent = org.name;
        document.getElementById('studentSearchInput').value = '';
        renderStudentList('');
        assignModal.style.display = 'block';
    }

    function renderStudentList(query) {
        const users   = getAllUsers();
        const leaders = JSON.parse(localStorage.getItem('nunite_leaders') || '[]');
        const listEl  = document.getElementById('studentSearchResults');

        // If no users at all, show helpful message
        if (users.length === 0) {
            listEl.innerHTML = `
                <div style="text-align:center;padding:30px;color:#888;">
                    <p style="font-size:15px;font-weight:600;margin-bottom:6px;">No registered students found.</p>
                    <p style="font-size:12px;color:#aaa;">Students must sign up first before they can be assigned as leaders.</p>
                    <p style="font-size:11px;color:#bbb;margin-top:8px;">Storage keys checked: nunite_users, users, registeredUsers</p>
                </div>`;
            return;
        }

        const q = query.toLowerCase();
        const filtered = users.filter(u =>
            !u.isAdmin &&
            (!q ||
             (u.fullName && u.fullName.toLowerCase().includes(q)) ||
             (u.email    && u.email.toLowerCase().includes(q)))
        );

        if (filtered.length === 0) {
            listEl.innerHTML = '<div class="no-students-msg">No students match your search.</div>';
            return;
        }

        listEl.innerHTML = filtered.map(u => {
            const isLeaderHere      = leaders.find(l => l.email === u.email && l.orgId === assigningOrgId);
            const isLeaderElsewhere = leaders.find(l => l.email === u.email && l.orgId !== assigningOrgId);
            const name = u.fullName || u.name || 'Unknown';
            return `
            <div class="student-item">
                <div class="student-item-info">
                    <div class="student-avatar">${name[0].toUpperCase()}</div>
                    <div>
                        <p class="student-name">${name}</p>
                        <p class="student-email">${u.email}</p>
                        ${isLeaderHere      ? '<span class="leader-badge current">Current Leader</span>' : ''}
                        ${isLeaderElsewhere ? '<span class="leader-badge other">Leader of another org</span>' : ''}
                    </div>
                </div>
                <button class="assign-confirm-btn ${isLeaderHere ? 'remove-leader-btn' : ''}"
                    data-email="${u.email}" data-name="${name}">
                    ${isLeaderHere ? 'Remove' : 'Assign'}
                </button>
            </div>`;
        }).join('');

        listEl.querySelectorAll('.assign-confirm-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const email      = btn.dataset.email;
                const name       = btn.dataset.name;
                const isRemoving = btn.classList.contains('remove-leader-btn');
                let leaders      = JSON.parse(localStorage.getItem('nunite_leaders') || '[]');

                if (isRemoving) {
                    leaders = leaders.filter(l => !(l.email === email && l.orgId === assigningOrgId));
                    localStorage.setItem('nunite_leaders', JSON.stringify(leaders));
                    alert(name + ' has been removed as leader.');
                } else {
                    // Remove any existing leader for this org first
                    leaders = leaders.filter(l => l.orgId !== assigningOrgId);
                    const org = getOrgs().find(o => o.id === assigningOrgId);
                    leaders.push({
                        email:   email,
                        name:    name,
                        orgId:   assigningOrgId,
                        orgName: org ? org.name : ''
                    });
                    localStorage.setItem('nunite_leaders', JSON.stringify(leaders));
                    alert(name + ' assigned as leader of ' + (org ? org.name : '') + '!');
                }
                renderStudentList(document.getElementById('studentSearchInput').value);
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
    document.getElementById('addEventBtn').addEventListener('click', () => {
        eventForm.reset();
        const orgs   = getOrgs();
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
    orgForm.addEventListener('submit', e => {
        e.preventDefault();
        const preview    = document.getElementById('logo-preview');
        const logoDataUrl = (preview && preview.style.display !== 'none' && preview.src && !preview.src.endsWith('#'))
            ? preview.src : null;

        const orgData = {
            name:             document.getElementById('orgName').value.trim(),
            department:       document.getElementById('orgDept').value,
            category:         document.getElementById('orgCategory').value,
            description:      document.getElementById('orgDescription').value.trim(),
            fullDescription:  document.getElementById('orgFullDescription').value.trim(),
            contactPerson:    document.getElementById('contactPerson').value.trim(),
            contactEmail:     document.getElementById('contactEmail').value.trim(),
            email:            document.getElementById('contactEmail').value.trim(),
            website:          document.getElementById('website').value.trim(),
            memberCount:      parseInt(document.getElementById('memberCount').value) || 0,
            meetingTime:      document.getElementById('meetingTime').value.trim(),
            location:         document.getElementById('location').value.trim(),
            applicationsOpen: document.getElementById('applicationsStatus').checked,
            approved:         document.getElementById('applicationsStatus').checked,
            logoDataUrl:      logoDataUrl,
        };

        if (!orgData.name) { alert('Organization name is required.'); return; }

        let orgs       = getOrgs();
        const wasEditing = editingOrgId;
        if (editingOrgId !== null) {
            orgs = orgs.map(o => o.id === editingOrgId ? Object.assign({}, o, orgData) : o);
        } else {
            orgData.id = nextId(orgs);
            orgs.push(orgData);
        }
        saveOrgs(orgs);
        renderOrgs();
        orgModal.style.display = 'none';
        editingOrgId = null;
        alert(wasEditing !== null ? 'Organization updated!' : 'Organization saved!');
    });

    // ---- SAVE EVENT (admin = auto-approved) ----
    eventForm.addEventListener('submit', e => {
        e.preventDefault();
        const orgSelect       = document.getElementById('eventOrg');
        const selectedOrgName = orgSelect ? orgSelect.options[orgSelect.selectedIndex].text : 'Admin';
        const newEvent = {
            id:          Date.now(),
            title:       document.getElementById('eventTitle').value.trim(),
            description: document.getElementById('eventDescription').value.trim(),
            date:        document.getElementById('eventDateTime').value,
            org:         selectedOrgName || 'Admin',
            location:    document.getElementById('eventLocation').value.trim(),
            approved:    true,
            createdBy:   'admin',
        };
        const evs = getEvents();
        evs.push(newEvent);
        saveEvents(evs);
        renderEvents();
        eventModal.style.display = 'none';
        alert('Event added and published!');
    });

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

    // ---- SIGN OUT ----
    document.getElementById('adminSignOutBtn').addEventListener('click', () => {
        localStorage.removeItem('userFullName');
        localStorage.removeItem('isAdmin');
        window.location.href = 'sign_in.html';
    });

    // ---- INIT ----
    renderOrgs();
    renderEvents();
});