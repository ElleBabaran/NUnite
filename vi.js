import { supabase, supabaseAdmin } from './supabase.js';
import { getCurrentRole, getDisplayName } from './auth.js';

let organizations = [];
let currentOrg = null;
let authState = { user: null, role: 'guest', leader: null };

async function updateJoinButtonState(orgId) {
    const joinBtn = document.querySelector('.btn-join');
    if (!joinBtn || !authState.user) return;

    const { data: existingJoin } = await supabase
        .from('joins')
        .select('status')
        .eq('org_id', orgId)
        .eq('email', authState.user.email)
        .maybeSingle();

    if (existingJoin?.status === 'approved') {
        joinBtn.innerHTML = '<i class="fa-solid fa-check text-xs"></i>Already Joined';
        joinBtn.disabled = true;
        joinBtn.style.opacity = '0.6';
        joinBtn.style.cursor = 'not-allowed';
    } else if ((existingJoin?.status || '') === 'pending') {
        joinBtn.innerHTML = '<i class="fa-solid fa-clock text-xs"></i>Application Pending';
        joinBtn.disabled = true;
        joinBtn.style.opacity = '0.6';
        joinBtn.style.cursor = 'not-allowed';
    }
}

async function loadOrganizations() {
    const { data, error } = await supabase.from('organizations').select('*').order('name');
    if (error) {
        console.error('loadOrganizations error:', error);
        return [];
    }
    return data || [];
}

document.addEventListener('DOMContentLoaded', async () => {
    authState = await getCurrentRole();
    organizations = await loadOrganizations();

    const orgId = new URLSearchParams(window.location.search).get('id');
    const org = organizations.find(o => String(o.id) === String(orgId));
    currentOrg = org;

    if (!org) return;

    document.getElementById('orgName').innerText = org.name;
    document.getElementById('orgNameAbout').innerText = org.name;
    document.getElementById('orgCategory').innerText = org.category || '';
    document.getElementById('orgCategoryBadge').innerText = org.category || 'General';
    document.getElementById('orgTagline').innerText = `"${org.description || ''}"`;
    document.getElementById('orgDescription').innerText = org.full_description || org.description || '';

    const { count } = await supabase
        .from('joins')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'approved');
    document.getElementById('orgMemberCount').innerText = count || 0;

    const email = org.email || org.contact_email || 'contact@national-u.edu.ph';
    document.getElementById('orgEmail').innerText = email;
    document.getElementById('orgEmail').href = `mailto:${email}`;

    const logoEl = document.getElementById('orgLogo');
    if (org.logo_url) {
        logoEl.innerHTML = `<img src="${org.logo_url}" alt="${org.name}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`;
        logoEl.style.fontSize = '0';
    } else {
        logoEl.innerText = org.logo_emoji || '🏫';
    }

    await updateJoinButtonState(orgId);
});

window.checkLogin = async function(action) {
    const modal = document.getElementById('infoModal');
    const content = document.getElementById('modalContent');
    const loginGate = document.getElementById('loginGate');
    const orgId = new URLSearchParams(window.location.search).get('id');
    const org = currentOrg || organizations.find(o => String(o.id) === String(orgId));

    modal.classList.remove('hidden');

    if (!authState.user) {
        loginGate.classList.remove('hidden');
        content.style.filter = 'blur(4px)';
        content.innerHTML = `
            <h3 class="info-title">Locked Content</h3>
            <p>To see the joining process and contact details for this organization, please sign in.</p>`;
        return;
    }

    loginGate.classList.add('hidden');
    content.style.filter = 'none';

    if (action !== 'join') {
        content.innerHTML = `
            <h3 class="info-title">Contact Information</h3>
            <div style="margin-top:20px;">
                <div style="display:flex; align-items:center; gap:10px; padding:10px; background:#f8fafc; border-radius:10px; margin-bottom:15px;">
                    <i class="fa-solid fa-user" style="color:#6366f1;"></i>
                    <span style="color:#1e1b4b;font-weight:700;">Contact Person:</span>
                    <span style="color:#334155;font-weight:500;">${org.contact_person || 'TBD'}</span>
                </div>
                <a href="mailto:${org.email || org.contact_email || ''}" style="display:flex; align-items:center; gap:10px; text-decoration:none; color:#1e1b4b; padding:10px; background:#f8fafc; border-radius:10px;">
                    <i class="fa-solid fa-envelope" style="color:#4f46e5;"></i>
                    <span style="color:#1e1b4b;font-weight:700;">Email:</span>
                    <span style="color:#334155;font-weight:500;">${org.email || org.contact_email || 'contact@national-u.edu.ph'}</span>
                </a>
            </div>`;
        return;
    }

    if (authState.role === 'admin') {
        content.innerHTML = `<h3 class="info-title">Admin Account</h3><p style="font-size:13px;color:#64748b;margin-top:12px;">Admin accounts cannot apply to organizations.</p>`;
        return;
    }

    if (String(authState.leader?.org_id || '') === String(orgId)) {
        content.innerHTML = `<h3 class="info-title">You're the Leader!</h3><p style="font-size:13px;color:#64748b;margin-top:12px;">You are the student leader of <strong>${org.name}</strong>. Leaders don't need to apply as members.</p>`;
        return;
    }

    const { data: existingJoin } = await supabase
        .from('joins')
        .select('*')
        .eq('org_id', orgId)
        .eq('email', authState.user.email)
        .maybeSingle();

    if (existingJoin?.status === 'approved') {
        content.innerHTML = `<h3 class="info-title">You're Already a Member!</h3><p style="font-size:13px;color:#64748b;margin-top:12px;">You are already an approved member of <strong>${org.name}</strong>.</p>`;
    } else if ((existingJoin?.status || '') === 'pending') {
        content.innerHTML = `<h3 class="info-title">Application Pending</h3><p style="font-size:13px;color:#64748b;margin-top:12px;">Your application to <strong>${org.name}</strong> is still being reviewed.</p>`;
    } else {
        content.innerHTML = `
            <h3 class="info-title">Apply for ${org.name}</h3>
            <p style="font-size:13px;color:#a5b4fc;margin-top:6px;">Tell the officers why you'd like to join.</p>
            <textarea class="join-textarea" placeholder="I want to join because..."></textarea>
            <button onclick="submitApp()" class="modal-btn btn-primary">Submit Application</button>`;
    }
};

window.submitApp = async function() {
    if (!authState.user) {
        alert('Please sign in first!');
        return;
    }

    const orgId = new URLSearchParams(window.location.search).get('id');
    const orgName = document.getElementById('orgName').innerText;
    const reason = document.querySelector('textarea') ? document.querySelector('textarea').value.trim() : '';

    const { data: existing } = await supabase
        .from('joins')
        .select('id, status')
        .eq('org_id', orgId)
        .eq('email', authState.user.email)
        .maybeSingle();

    if (existing) {
        if (existing.status === 'approved') {
            alert('You are already a member of this organization.');
        } else if ((existing.status || 'pending') === 'pending') {
            alert('Your application is still pending.');
        } else {
            alert('You already have an application record for this organization.');
        }
        return;
    }

    const { error } = await supabaseAdmin.from('joins').insert({
        org_id: parseInt(orgId, 10),
        org_name: orgName,
        name: getDisplayName(authState.user),
        email: authState.user.email,
        status: 'pending',
        reason,
    });

    if (error) {
        alert('Error submitting application: ' + error.message);
        return;
    }

    alert('Application sent to Student Leader!');
    await updateJoinButtonState(orgId);
    window.closeModal();
};

window.closeModal = function() {
    document.getElementById('infoModal').classList.add('hidden');
};
