import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://jivdnqxtijzlbtasubnc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppdmRucXh0aWp6bGJ0YXN1Ym5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzY5MTAsImV4cCI6MjA5MDI1MjkxMH0.vVBR7ZQ6rk8gDWYon8D6Nmf0syT_P-gVcJrWyu_j0u0';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {

    // ── NAV AUTH STATE (only applies to Index.html nav elements) ──────────────
    const userFullName = localStorage.getItem('userFullName');
    const signedAsText = document.getElementById('signed-as-text');
    const userNameDisplay = document.getElementById('user-name-display');
    const signUpLink = document.getElementById('sign-up-link');
    const signOutBtn = document.getElementById('sign-out-btn');

    // Guard: only run if these nav elements actually exist on the page
    if (signedAsText && userNameDisplay && signUpLink && signOutBtn) {
        if (userFullName) {
            signedAsText.style.display = 'inline-block';
            userNameDisplay.style.display = 'inline-block';
            userNameDisplay.textContent = userFullName;
            signUpLink.style.display = 'none';
            signOutBtn.style.display = 'inline-block';
        }
        signOutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('userFullName');
            localStorage.removeItem('isAdmin');
            window.location.href = 'Index.html';
        });
    }

    // ── PASSWORD TOGGLE ───────────────────────────────────────────────────────
    function setupPasswordToggle(passwordInputId, toggleIconId) {
        const passwordInput = document.getElementById(passwordInputId);
        const toggleIcon = document.getElementById(toggleIconId);
        if (!passwordInput || !toggleIcon) return;

        toggleIcon.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('bi-eye');
            this.classList.toggle('bi-eye-slash');
        });
    }

    setupPasswordToggle('signInPassword', 'toggleSignInPassword');
    setupPasswordToggle('signUpPassword', 'toggleSignUpPassword');

    // ── PASSWORD STRENGTH ─────────────────────────────────────────────────────
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
    const strengthFill = document.querySelector('#password-strength-indicator-bar .strength-fill');

    if (signUpPasswordInput && strengthFill) {
        signUpPasswordInput.addEventListener('input', () => {
            const password = signUpPasswordInput.value;
            const score = checkPasswordStrength(password);
            let strengthLevel = '';
            let strengthWidth = 0;

            if (password.length === 0) {
                strengthLevel = '';
                strengthWidth = 0;
            } else if (score <= 2) {
                strengthLevel = 'weak';
                strengthWidth = 33.3;
            } else if (score <= 4) {
                strengthLevel = 'moderate';
                strengthWidth = 66.6;
            } else {
                strengthLevel = 'strong';
                strengthWidth = 100;
            }

            strengthFill.style.width = `${strengthWidth}%`;
            strengthFill.setAttribute('data-strength', strengthLevel);
        });
    }

    // ── SIGN UP ───────────────────────────────────────────────────────────────
    const signUpForm = document.getElementById('signUpForm');
    if (signUpForm) {
        signUpForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            const fullNameInput = document.getElementById('signUpFullName');
            const emailInput = document.getElementById('signUpEmail');
            const passwordInput = document.getElementById('signUpPassword');

            if (!fullNameInput || !emailInput || !passwordInput) {
                alert('Form fields are missing. Please refresh and try again.');
                return;
            }

            const fullName = fullNameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (!fullName || !email || !password) {
                alert('Please fill in all fields.');
                return;
            }

            const passwordStrengthScore = checkPasswordStrength(password);
            if (passwordStrengthScore < 3) {
                alert('Please create a stronger password (use uppercase, lowercase, numbers, or symbols).');
                return;
            }

            try {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: fullName } }
                });

                if (error) {
                    alert('Sign up failed: ' + error.message);
                    return;
                }

                // If Supabase returns a user but no session, email confirmation is required
                if (data.user && !data.session) {
                    alert('Account created! Please check your email to confirm your account, then sign in.');
                    window.location.href = 'sign_in.html';
                    return;
                }

                // If session exists, email confirmation is disabled — log them in directly
                if (data.session) {
                    localStorage.setItem('userFullName', fullName);
                    localStorage.removeItem('isAdmin');
                    alert('Account created! Welcome to NUnite.');
                    window.location.href = 'Index.html';
                    return;
                }

                // Fallback
                alert('Something went wrong. Please try signing in.');
                window.location.href = 'sign_in.html';

            } catch (err) {
                alert('Unexpected error: ' + err.message);
            }
        });
    }

    // ── SIGN IN ───────────────────────────────────────────────────────────────
    const signInForm = document.getElementById('signInForm');
    if (signInForm) {
        signInForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            const emailInput = document.getElementById('signInEmail');
            const passwordInput = document.getElementById('signInPassword');

            if (!emailInput || !passwordInput) {
                alert('Form fields are missing. Please refresh and try again.');
                return;
            }

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (!email || !password) {
                alert('Please fill in both fields.');
                return;
            }

            // Admin shortcut
            if (email === 'admin@nunite.com') {
                if (password === 'adminpassword123') {
                    localStorage.setItem('isAdmin', 'true');
                    localStorage.setItem('userFullName', 'Admin');
                    alert('Admin Sign In successful!');
                    window.location.href = 'admindash.html';
                } else {
                    alert('Incorrect password. Please try again.');
                }
                return;
            }

            // Regular user sign in
            try {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });

                if (error) {
                    alert('Sign in failed: ' + error.message);
                    return;
                }

                const fullName = data.user?.user_metadata?.full_name || data.user?.email || 'User';
                localStorage.setItem('userFullName', fullName);
                localStorage.removeItem('isAdmin');
                window.location.href = 'Index.html';
            } catch (err) {
                alert('Unexpected error: ' + err.message);
            }
        });
    }

});