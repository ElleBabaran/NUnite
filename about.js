import { getCurrentRole, getDisplayName, signOutToLogin } from './auth.js';

let authState = { user: null, role: 'guest', leader: null };

async function updateAuthDropdown() {
    const dropdown = document.getElementById('authDropdown');
    if (!dropdown) return;

    authState = await getCurrentRole();
    if (authState.user) {
        const displayName = authState.role === 'admin' ? 'Admin' : getDisplayName(authState.user);
        dropdown.innerHTML = `
            <div class="px-4 py-2 border-b border-slate-100">
                <p class="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Signed in as</p>
                <p class="text-sm font-bold text-slate-800 truncate">${displayName}</p>
            </div>
            ${authState.role === 'admin' ? `<a href="admindash.html" class="block px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-colors">Admin Dashboard</a>` : ''}
            ${authState.role === 'leader' ? `<a href="leaderdash.html" class="block px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-colors">Leader Dashboard</a>` : ''}
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

window.toggleAuthMenu = async function() {
    const dropdown = document.getElementById('authDropdown');
    await updateAuthDropdown();
    dropdown.classList.toggle('hidden');
    window.onclick = function(event) {
        if (!event.target.closest('button')) dropdown.classList.add('hidden');
    };
};

document.addEventListener('DOMContentLoaded', async () => {
    await updateAuthDropdown();
    const animElements = document.querySelectorAll('.anim-fade-in');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            entry.target.classList.toggle('is-visible', entry.isIntersecting);
        });
    }, { threshold: 0.25 });
    animElements.forEach(element => observer.observe(element));
});
