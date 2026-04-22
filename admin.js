// =============================================
// NUnite Admin Dashboard - admin.js
// All org data stored in localStorage under
// key "nunite_organizations"
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

    // Admin guard
    if (localStorage.getItem('isAdmin') !== 'true') {
        alert('Access denied. Admins only.');
        window.location.href = 'sign_in.html';
        return;
    }

    const orgContainer   = document.getElementById('orgTableBody');
    const eventContainer = document.getElementById('eventTableBody');
    const orgModal       = document.getElementById('organizationModal');
    const viewModal      = document.getElementById('viewOrgModal');
    const eventModal     = document.getElementById('eventModal');
    const orgForm        = document.getElementById('organizationForm');
    const eventForm      = document.getElementById('eventForm');
    const modalTitle     = orgModal.querySelector('h3');

    let editingOrgId = null;
    let mockEvents   = JSON.parse(localStorage.getItem('nunite_events') || '[]');

    function saveEvents() { localStorage.setItem('nunite_events', JSON.stringify(mockEvents)); }

    // ---- RENDER ORGS ----
    function renderOrgs() {
        if (!orgContainer) return;
        const orgs = getOrgs();
        const totalEl    = document.getElementById('stat-total-orgs');
        const approvedEl = document.getElementById('stat-approved-orgs');
        if (totalEl)    totalEl.textContent    = orgs.length;
        if (approvedEl) approvedEl.textContent = orgs.filter(o => o.approved).length;

        if (orgs.length === 0) {
            orgContainer.innerHTML = `<div style="text-align:center;padding:40px;color:#888;"><p style="font-size:18px;">No organizations yet.</p><p style="font-size:14px;margin-top:8px;">Click "Add Organization" to get started.</p></div>`;
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
                    <button class="action-btn delete-org" style="background:#ff4d4d;color:white;border:none;">Delete</button>
                </div>
            </div>`).join('');
        attachOrgListeners();
    }

    // ---- RENDER EVENTS ----
    function renderEvents() {
        if (!eventContainer) return;
        if (mockEvents.length === 0) {
            eventContainer.innerHTML = `<div style="text-align:center;padding:40px;color:#888;"><p style="font-size:18px;">No events yet.</p></div>`;
            return;
        }
        eventContainer.innerHTML = mockEvents.map(ev => `
            <div class="org-card-horizontal" data-id="${ev.id}">
                <div class="org-card-left">
                    <div class="org-logo-wrapper" style="font-size:2rem;display:flex;align-items:center;justify-content:center;">📅</div>
                    <div>
                        <h3 class="org-card-title">${ev.title}</h3>
                        <p style="margin:0;font-size:13px;color:#666;">${ev.org} · ${new Date(ev.date).toLocaleDateString()}</p>
                    </div>
                </div>
                <div class="org-card-actions">
                    <button class="action-btn delete-event" style="background:#ff4d4d;color:white;border:none;">Delete</button>
                </div>
            </div>`).join('');
        attachEventListeners();
    }

    // ---- LISTENERS ----
    function attachOrgListeners() {
        document.querySelectorAll('.view-trigger').forEach(btn => {
            btn.addEventListener('click', e => openViewModal(parseInt(e.target.closest('.org-card-horizontal').dataset.id)));
        });
        document.querySelectorAll('.edit-trigger').forEach(btn => {
            btn.addEventListener('click', e => openEditModal(parseInt(e.target.closest('.org-card-horizontal').dataset.id)));
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

    function attachEventListeners() {
        document.querySelectorAll('.delete-event').forEach(btn => {
            btn.addEventListener('click', e => {
                const id = parseInt(e.target.closest('.org-card-horizontal').dataset.id);
                if (!confirm('Remove this event?')) return;
                mockEvents = mockEvents.filter(ev => ev.id !== id);
                saveEvents();
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
            tagContainer.innerHTML = [org.category, org.department].filter(Boolean).map(t => `<span class="tag">${t}</span>`).join('');
        }
        viewModal.style.display = 'block';
    }

    // ---- EDIT MODAL ----
    function openEditModal(id) {
        const org = getOrgs().find(o => o.id === id);
        if (!org) return;
        editingOrgId = id;
        modalTitle.textContent = 'Edit Organization';
        orgForm.reset();
        document.getElementById('orgName').value            = org.name            || '';
        document.getElementById('orgDept').value            = org.department      || 'all';
        document.getElementById('orgCategory').value        = org.category        || 'all';
        document.getElementById('orgDescription').value     = org.description     || '';
        document.getElementById('orgFullDescription').value = org.fullDescription || '';
        document.getElementById('contactPerson').value      = org.contactPerson   || '';
        document.getElementById('contactEmail').value       = org.contactEmail    || '';
        document.getElementById('website').value            = org.website         || '';
        document.getElementById('memberCount').value        = org.memberCount     || '';
        document.getElementById('meetingTime').value        = org.meetingTime     || '';
        document.getElementById('location').value           = org.location        || '';
        document.getElementById('applicationsStatus').checked = org.applicationsOpen !== false;
        const preview = document.getElementById('logo-preview');
        if (org.logoDataUrl) { preview.src = org.logoDataUrl; preview.style.display = 'block'; }
        else { preview.style.display = 'none'; }
        orgModal.style.display = 'block';
    }

    // ---- ADD ORG BUTTON ----
    document.getElementById('addOrganizationBtn')?.addEventListener('click', () => {
        editingOrgId = null;
        orgForm.reset();
        modalTitle.textContent = 'Add New Organization';
        const preview = document.getElementById('logo-preview');
        if (preview) { preview.src = '#'; preview.style.display = 'none'; }
        orgModal.style.display = 'block';
    });

    // ---- ADD EVENT BUTTON ----
    document.getElementById('addEventBtn')?.addEventListener('click', () => {
        eventForm.reset();
        const orgs = getOrgs();
        const select = document.getElementById('eventOrg');
        if (select) {
            select.innerHTML = '<option value="">-- Select Organization --</option>';
            orgs.forEach(org => {
                const option = document.createElement('option');
                option.value = org.id;
                option.textContent = org.name;
                select.appendChild(option);
            });
        }
        eventModal.style.display = 'block';
    });

    // ---- CLOSE MODALS ----
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            orgModal.style.display = 'none'; eventModal.style.display = 'none'; viewModal.style.display = 'none';
            editingOrgId = null;
        });
    });
    document.querySelectorAll('.cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            orgModal.style.display = 'none'; eventModal.style.display = 'none'; editingOrgId = null;
        });
    });
    window.addEventListener('click', e => {
        if (e.target === orgModal)   { orgModal.style.display   = 'none'; editingOrgId = null; }
        if (e.target === eventModal) { eventModal.style.display = 'none'; }
        if (e.target === viewModal)  { viewModal.style.display  = 'none'; }
    });

    // ---- LOGO PREVIEW ----
    document.getElementById('orgLogoFile')?.addEventListener('change', function() {
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
    orgForm?.addEventListener('submit', e => {
        e.preventDefault();
        const preview    = document.getElementById('logo-preview');
        const logoDataUrl = (preview && preview.style.display !== 'none' && preview.src && !preview.src.endsWith('#'))
            ? preview.src : null;

        const orgData = {
            name:            document.getElementById('orgName').value.trim(),
            department:      document.getElementById('orgDept').value,
            category:        document.getElementById('orgCategory').value,
            description:     document.getElementById('orgDescription').value.trim(),
            fullDescription: document.getElementById('orgFullDescription').value.trim(),
            contactPerson:   document.getElementById('contactPerson').value.trim(),
            contactEmail:    document.getElementById('contactEmail').value.trim(),
            email:           document.getElementById('contactEmail').value.trim(),
            website:         document.getElementById('website').value.trim(),
            memberCount:     parseInt(document.getElementById('memberCount').value) || 0,
            meetingTime:     document.getElementById('meetingTime').value.trim(),
            location:        document.getElementById('location').value.trim(),
            applicationsOpen: document.getElementById('applicationsStatus').checked,
            approved:        document.getElementById('applicationsStatus').checked,
            logoDataUrl:     logoDataUrl,
        };

        if (!orgData.name) { alert('Organization name is required.'); return; }

        let orgs = getOrgs();
        const wasEditing = editingOrgId;
        if (editingOrgId !== null) {
            orgs = orgs.map(o => o.id === editingOrgId ? { ...o, ...orgData } : o);
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

    // ---- SAVE EVENT ----
    eventForm?.addEventListener('submit', e => {
        e.preventDefault();
        const orgSelect = document.getElementById('eventOrg');
        const selectedOrgName = orgSelect ? orgSelect.options[orgSelect.selectedIndex]?.text : 'Admin';
        const newEvent = {
            id:          Date.now(),
            title:       document.getElementById('eventTitle').value.trim(),
            description: document.getElementById('eventDescription').value.trim(),
            date:        document.getElementById('eventDateTime').value,
            org:         selectedOrgName || 'Admin',
            location:    document.getElementById('eventLocation').value.trim(),
        };
        mockEvents.push(newEvent);
        saveEvents();
        renderEvents();
        eventModal.style.display = 'none';
        alert('Event Added!');
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
        });
    });

    // ---- SIGN OUT ----
    document.getElementById('adminSignOutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('userFullName');
        localStorage.removeItem('isAdmin');
        window.location.href = 'sign_in.html';
    });

    // ---- INIT ----
    renderOrgs();
    renderEvents();
});