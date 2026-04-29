import { supabase, supabaseAdmin } from './supabase.js';
import { ADMIN_EMAIL, getDisplayName, getSessionUser, signOutToLogin } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {

    // ── NAV AUTH STATE ──
    const currentUser     = await getSessionUser();
    const userFullName    = currentUser ? getDisplayName(currentUser) : '';
    const signedAsText    = document.getElementById('signed-as-text');
    const userNameDisplay = document.getElementById('user-name-display');
    const signUpLink      = document.getElementById('sign-up-link');
    const signOutBtn      = document.getElementById('sign-out-btn');

    if (signedAsText && userNameDisplay && signUpLink && signOutBtn) {
        if (userFullName) {
            signedAsText.style.display    = 'inline-block';
            userNameDisplay.style.display = 'inline-block';
            userNameDisplay.textContent   = userFullName;
            signUpLink.style.display      = 'none';
            signOutBtn.style.display      = 'inline-block';
        }
        signOutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await signOutToLogin();
        });
    }

    // ── PASSWORD TOGGLE ──
    function setupPasswordToggle(passwordInputId, toggleIconId) {
        const passwordInput = document.getElementById(passwordInputId);
        const toggleIcon    = document.getElementById(toggleIconId);
        if (!passwordInput || !toggleIcon) return;
        toggleIcon.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('bi-eye');
            this.classList.toggle('bi-eye-slash');
        });
    }
    setupPasswordToggle('signInPassword',  'toggleSignInPassword');
    setupPasswordToggle('signUpPassword',  'toggleSignUpPassword');

    // ── PASSWORD STRENGTH ──
    function checkPasswordStrength(password) {
        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password)) score++;
        return score;
    }

    const signUpPasswordInput = document.getElementById('signUpPassword');
    const strengthFill        = document.querySelector('#password-strength-indicator-bar .strength-fill');
    if (signUpPasswordInput && strengthFill) {
        signUpPasswordInput.addEventListener('input', () => {
            const password = signUpPasswordInput.value;
            const score    = checkPasswordStrength(password);
            let strengthLevel = '', strengthWidth = 0;
            if (password.length === 0) { strengthLevel = ''; strengthWidth = 0; }
            else if (score <= 2)       { strengthLevel = 'weak';     strengthWidth = 33.3; }
            else if (score <= 4)       { strengthLevel = 'moderate'; strengthWidth = 66.6; }
            else                       { strengthLevel = 'strong';   strengthWidth = 100;  }
            strengthFill.style.width = strengthWidth + '%';
            strengthFill.setAttribute('data-strength', strengthLevel);
        });
    }

    // ── SIGN UP ──
    const signUpForm = document.getElementById('signUpForm');
    if (signUpForm) {
        signUpForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            const fullNameInput = document.getElementById('signUpFullName');
            const emailInput    = document.getElementById('signUpEmail');
            const passwordInput = document.getElementById('signUpPassword');

            if (!fullNameInput || !emailInput || !passwordInput) {
                alert('Form fields are missing. Please refresh and try again.');
                return;
            }

            const fullName = fullNameInput.value.trim();
            const email    = emailInput.value.trim();
            const password = passwordInput.value;

            if (!fullName || !email || !password) { alert('Please fill in all fields.'); return; }
            if (checkPasswordStrength(password) < 3) {
                alert('Please create a stronger password (use uppercase, lowercase, numbers, or symbols).');
                return;
            }

            try {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: fullName } }
                });

                if (error) { alert('Sign up failed: ' + error.message); return; }

                // Email confirmation required
                if (data.user && !data.session) {
                    // Still write to profiles so admin can see them even before confirmation
                    await supabase.from('profiles').upsert({
                        id:        data.user.id,
                        email:     email,
                        full_name: fullName,
                    }, { onConflict: 'id' });
                    await supabaseAdmin.from('Students').upsert({
                        email,
                        full_name: fullName,
                    }, { onConflict: 'email' });

                    alert('Account created! Please check your email to confirm your account, then sign in.');
                    window.location.href = 'sign_in.html';
                    return;
                }

                // Session exists (email confirmation disabled)
                if (data.session) {
                    await supabase.from('profiles').upsert({
                        id:        data.user.id,
                        email:     email,
                        full_name: fullName,
                    }, { onConflict: 'id' });
                    await supabaseAdmin.from('Students').upsert({
                        email,
                        full_name: fullName,
                    }, { onConflict: 'email' });

                    alert('Account created! Welcome to NUnite.');
                    window.location.href = 'Index.html';
                    return;
                }

                alert('Something went wrong. Please try signing in.');
                window.location.href = 'sign_in.html';

            } catch (err) {
                alert('Unexpected error: ' + err.message);
            }
        });
    }

    // ── SIGN IN ──
    const signInForm = document.getElementById('signInForm');
    if (signInForm) {
        signInForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            const emailInput    = document.getElementById('signInEmail');
            const passwordInput = document.getElementById('signInPassword');
            if (!emailInput || !passwordInput) {
                alert('Form fields are missing. Please refresh and try again.');
                return;
            }

            const email    = emailInput.value.trim();
            const password = passwordInput.value;
            if (!email || !password) { alert('Please fill in both fields.'); return; }

            // All roles sign in through Supabase Auth. Role is resolved from email/leaders table.
            try {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) { alert('Sign in failed: ' + error.message); return; }

                const fullName = data.user?.user_metadata?.full_name || data.user?.email || 'User';

                // Also ensure profile row exists (in case they signed up before this fix)
                await supabase.from('profiles').upsert({
                    id:        data.user.id,
                    email:     email,
                    full_name: fullName,
                }, { onConflict: 'id' });

                window.location.href = email === ADMIN_EMAIL ? 'admindash.html' : 'Index.html';

            } catch (err) {
                alert('Unexpected error: ' + err.message);
            }
        });
    }

});
