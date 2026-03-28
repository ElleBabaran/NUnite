const organizations = [
    { id: 1, name: "Pixel Guild", category: "tech", department: "CCIT", memberCount: 150, description: "Digital art and game development community.", logo: "🎮", email: "pixelguild@national-u.edu.ph" },
    { id: 2, name: "Varsity Titans", category: "sports", department: "None", memberCount: 85, description: "Official university athletics team.", logo: "🏆", email: "titans@national-u.edu.ph" },
    { id: 3, name: "Coding Society", category: "tech", department: "CCIT", memberCount: 210, description: "Problem solving and software engineering.", logo: "💻", email: "codingsoc@national-u.edu.ph" },
    { id: 4, name: "Theatre Group", category: "arts", department: "CAH", memberCount: 45, description: "Performing arts and production.", logo: "🎭", email: "theatre@national-u.edu.ph" },
    { id: 5, name: "Business Leaders", category: "academics", department: "CBA", memberCount: 120, description: "Future entrepreneurship network.", logo: "📈", email: "cba_leaders@national-u.edu.ph" }
];

// Switch to true to see the "Joined/Contact" info
let isLoggedIn = false; 

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const orgId = urlParams.get('id');
    const org = organizations.find(o => o.id == orgId);

    if (org) {
        document.getElementById('orgName').innerText = org.name;
        document.getElementById('orgNameAbout').innerText = org.name;
        document.getElementById('orgCategory').innerText = org.category;
        document.getElementById('orgTagline').innerText = `"${org.description}"`;
        document.getElementById('orgDescription').innerText = org.description;
        document.getElementById('orgMemberCount').innerText = org.memberCount;
        document.getElementById('orgLogo').innerText = org.logo;
        document.getElementById('orgEmail').innerText = org.email;
        document.getElementById('orgEmail').href = `mailto:${org.email}`;
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