function loadOrganizations() {
    try {
        const saved = JSON.parse(localStorage.getItem('nunite_organizations'));
        // Admin saves with 'contactEmail', viewdetails expects 'email' — normalize
        if (saved && saved.length > 0) {
            return saved.map(o => ({ ...o, email: o.email || o.contactEmail || 'contact@national-u.edu.ph' }));
        }
    } catch {}
    return defaultOrganizations;
}

const organizations = loadOrganizations();

// Read login state from localStorage (set by sign.js on login)
const isLoggedIn = !!localStorage.getItem('userFullName');

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const orgId = urlParams.get('id');
    const org = organizations.find(o => o.id == orgId);

    if (org) {
        document.getElementById('orgName').innerText = org.name;
        document.getElementById('orgNameAbout').innerText = org.name;
        document.getElementById('orgCategory').innerText = org.category;
        document.getElementById('orgTagline').innerText = `"${org.description}"`;
        document.getElementById('orgDescription').innerText = org.fullDescription || org.description;
        // Count approved members from joins only (no manual base count)
        const allJoins = JSON.parse(localStorage.getItem('nunite_joins') || '[]');
        const approvedCount = allJoins.filter(j => String(j.orgId) === String(orgId) && j.status === 'approved').length;
        document.getElementById('orgMemberCount').innerText = approvedCount;
        document.getElementById('orgEmail').innerText = org.email || 'contact@national-u.edu.ph';
        document.getElementById('orgEmail').href = `mailto:${org.email || 'contact@national-u.edu.ph'}`;

        // Support both admin-uploaded logo images and emoji logos
        const logoEl = document.getElementById('orgLogo');
        if (org.logoDataUrl) {
            logoEl.innerHTML = `<img src="${org.logoDataUrl}" alt="${org.name}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`;
            logoEl.style.fontSize = '0';
        } else {
            logoEl.innerText = org.logo || '🏫';
        }
    }
});

function checkLogin(action) {
    const modal = document.getElementById('infoModal');
    const content = document.getElementById('modalContent');
    const loginGate = document.getElementById('loginGate');
    
    const urlParams = new URLSearchParams(window.location.search);
    const orgId = urlParams.get('id');
    const org = organizations.find(o => o.id == orgId);

    modal.classList.remove('hidden');

    if (isLoggedIn) {
        // --- SIGNED IN VIEW ---
        loginGate.classList.add('hidden');
        content.style.filter = "none";

        // Check if user is already an approved member of this org
        const allJoins = JSON.parse(localStorage.getItem('nunite_joins') || '[]');
        const userEmail = localStorage.getItem('userEmail') || '';
        const existingJoin = allJoins.find(j => String(j.orgId) === String(orgId) && j.email === userEmail);
        const isApprovedMember = existingJoin && existingJoin.status === 'approved';
        const isPendingMember = existingJoin && (existingJoin.status || 'pending') === 'pending';

        // ── NEW: leaders can't join their own org ──
        const leaderOrgName = localStorage.getItem('leaderOrgName') || '';
        const isLeaderOfThisOrg = leaderOrgName && org && org.name === leaderOrgName;

        if (action === 'join') {
            if (isLeaderOfThisOrg) {
                content.innerHTML = `
                    <h3 class="info-title">You're the Leader! 🏅</h3>
                    <p style="font-size: 13px; color: #64748b; margin-top: 12px;">You are the student leader of <strong>${org.name}</strong>. Leaders don't need to apply as members.</p>
                `;
            } else if (isApprovedMember) {
                content.innerHTML = `
                    <h3 class="info-title">You're Already a Member! ✅</h3>
                    <p style="font-size: 13px; color: #64748b; margin-top: 12px;">You are already an approved member of <strong>${org.name}</strong>. No need to apply again.</p>
                `;
            } else if (isPendingMember) {
                content.innerHTML = `
                    <h3 class="info-title">Application Pending ⏳</h3>
                    <p style="font-size: 13px; color: #64748b; margin-top: 12px;">Your application to <strong>${org.name}</strong> is still being reviewed by the student leader.</p>
                `;
            } else {
                content.innerHTML = `
                    <h3 class="info-title">Apply for ${org.name}</h3>
                    <p style="font-size: 13px; color: #64748b;">Tell the officers why you'd like to join.</p>
                    <textarea style="width:100%; height:100px; border:1px solid #ddd; border-radius:10px; margin-top:15px; padding:10px; font-family:inherit;" placeholder="I want to join because..."></textarea>
                    <button onclick="submitApp()" class="modal-btn btn-primary">Submit Application</button>
                `;
            }
        } else {
            content.innerHTML = `
                <h3 class="info-title">Contact Information</h3>
                <div style="margin-top:20px;">
                    <div style="display:flex; align-items:center; gap:10px; padding:10px; background:#f8fafc; border-radius:10px; margin-bottom:15px;">
                        <i class="fa-solid fa-user" style="color:#6366f1;"></i> <b>Contact Person:</b> ${org.contactPerson || 'TBD'}
                    </div>
                    <a href="mailto:${org.email}" style="display:flex; align-items:center; gap:10px; text-decoration:none; color:#1e1b4b; padding:10px; background:#f8fafc; border-radius:10px;">
                        <i class="fa-solid fa-envelope" style="color:#4f46e5;"></i> <b>Email:</b> ${org.email || 'contact@national-u.edu.ph'}
                    </a>
                </div>
            `;
        }
    } else {
        // --- GUEST VIEW (LOCKED) ---
        loginGate.classList.remove('hidden');
        content.style.filter = "blur(4px)";
        content.innerHTML = `
            <h3 class="info-title">Locked Content</h3>
            <p>To see the joining process and contact details for this organization, please sign in.</p>
            <ul style="margin-top:10px; line-height:2;">
                <li>• Application Requirements</li>
                <li>• Official Email Address</li>
                <li>• Social Media Links</li>
            </ul>
        `;
    }
}

function submitApp() {
    const userFullName = localStorage.getItem('userFullName');
    const userEmail = localStorage.getItem('userEmail');
    
    if (!userFullName) {
        alert("Please sign in first!");
        return;
    }

    const application = {
        id: Date.now(),
        orgId: String(new URLSearchParams(window.location.search).get('id')),
        orgName: document.getElementById('orgName').innerText,
        name: userFullName,
        email: userEmail,
        status: 'pending',
        reason: document.querySelector('textarea') ? document.querySelector('textarea').value.trim() : '',
        appliedAt: new Date().toISOString()
    };

    const existingJoins = JSON.parse(localStorage.getItem('nunite_joins') || '[]');
    
    // Check kung nakapag-apply na para hindi doble
    const alreadyApplied = existingJoins.some(j => j.orgId == application.orgId && j.email === userEmail);
    if (alreadyApplied) {
        alert("You have already applied for this organization.");
        return;
    }

    existingJoins.push(application);
    localStorage.setItem('nunite_joins', JSON.stringify(existingJoins));
    alert("Application sent to Student Leader!");
}

function closeModal() {
    document.getElementById('infoModal').classList.add('hidden');
}