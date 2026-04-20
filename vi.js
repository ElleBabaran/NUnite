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
        document.getElementById('orgMemberCount').innerText = org.memberCount;
        document.getElementById('orgEmail').innerText = org.email;
        document.getElementById('orgEmail').href = `mailto:${org.email}`;

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

        if (action === 'join') {
            content.innerHTML = `
                <h3 class="info-title">Apply for ${org.name}</h3>
                <p style="font-size: 13px; color: #64748b;">Tell the officers why you'd like to join.</p>
                <textarea style="width:100%; height:100px; border:1px solid #ddd; border-radius:10px; margin-top:15px; padding:10px; font-family:inherit;" placeholder="I want to join because..."></textarea>
                <button onclick="submitApp()" class="modal-btn btn-primary">Submit Application</button>
            `;
        } else {
            content.innerHTML = `
                <h3 class="info-title">Contact Information</h3>
                <div style="margin-top:20px;">
                    <a href="mailto:${org.email}" style="display:flex; align-items:center; gap:10px; text-decoration:none; color:#1e1b4b; margin-bottom:15px; padding:10px; background:#f8fafc; border-radius:10px;">
                        <i class="fa-solid fa-envelope" style="color:#4f46e5;"></i> <b>Email:</b> ${org.email}
                    </a>
                    <div style="display:flex; align-items:center; gap:10px; padding:10px; background:#f8fafc; border-radius:10px;">
                        <i class="fa-brands fa-facebook" style="color:#1877f2;"></i> <b>FB:</b> /${org.name.replace(/\s/g, '')}
                    </div>
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
    alert("Application Received! The organization will contact you via your NU email.");
    closeModal();
}

function closeModal() {
    document.getElementById('infoModal').classList.add('hidden');
}