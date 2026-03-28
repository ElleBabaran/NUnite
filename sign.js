import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const SUPABASE_URL = 'https://jivdnqxtijzlbtasubnc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppdmRucXh0aWp6bGJ0YXN1Ym5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzY5MTAsImV4cCI6MjA5MDI1MjkxMH0.vVBR7ZQ6rk8gDWYon8D6Nmf0syT_P-gVcJrWyu_j0u0';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


document.addEventListener('DOMContentLoaded', () => {

    const userFullName = localStorage.getItem('userFullName');
    const signedAsText = document.getElementById('signed-as-text');
    const userNameDisplay = document.getElementById('user-name-display');
    const signUpLink = document.getElementById('sign-up-link');
    const signOutBtn = document.getElementById('sign-out-btn');

    if (userFullName) {
        if (signedAsText && userNameDisplay && signUpLink && signOutBtn) {
            signedAsText.style.display = 'inline-block';
            userNameDisplay.style.display = 'inline-block';
            userNameDisplay.textContent = userFullName;
            signUpLink.style.display = 'none';
            signOutBtn.style.display = 'inline-block';
        }
    }

    if (signOutBtn) {
        signOutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('userFullName');
           
            window.location.href = 'sign_in.html'; 
        });
    }

    function setupPasswordToggle(passwordInputId, toggleIconId) {
        const passwordInput = document.getElementById(passwordInputId);
        const toggleIcon = document.getElementById(toggleIconId);

        if (passwordInput && toggleIcon) {
            toggleIcon.addEventListener('click', function() {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);

                this.classList.toggle('bi-eye');
                this.classList.toggle('bi-eye-slash');
            });
        }
    }

    setupPasswordToggle('signInPassword', 'toggleSignInPassword');

    setupPasswordToggle('signUpPassword', 'toggleSignUpPassword');

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

            let strengthLevel = "";
            let strengthWidth = 0;

            if (password.length === 0) {
                strengthLevel = "";
                strengthWidth = 0;
            } else if (score <= 2) { 
                strengthLevel = "weak";
                strengthWidth = 33.3;
            } else if (score <= 4) { 
                strengthLevel = "moderate";
                strengthWidth = 66.6;
            } else { 
                strengthLevel = "strong";
                strengthWidth = 100;
            }

            strengthFill.style.width = `${strengthWidth}%`;
            strengthFill.setAttribute('data-strength', strengthLevel);
        });
    }

    const signUpForm = document.getElementById('signUpForm');
    if (signUpForm) {
        signUpForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            const fullName = document.getElementById('signUpFullName').value;
            const email = document.getElementById('signUpEmail').value;
            const password = signUpPasswordInput.value; 

            if (fullName && email && password) {
                const passwordStrengthScore = checkPasswordStrength(password);
                if (passwordStrengthScore >= 4) {
                   
                   const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: fullName } }
                });
                    if (error) { alert(error.message); return; }
                    alert('Account created!');
                    window.location.href = 'Index.html';  
                } else {
                    alert('Please create a stronger password (at least 4 criteria met).');
                }
            } else {
                alert('Please fill in all fields.');
            }
        });
    }

const signInForm = document.getElementById('signInForm');
const signInPasswordInput = document.getElementById('signInPassword') || document.getElementById('signUpPassword');
if (signInForm) {
    signInForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const email = document.getElementById('signInEmail').value;
        const password = signInPasswordInput.value;

        if (email && password) {
            if (email === 'admin@nunite.com') {
                if (password === 'adminpassword123') {
                    alert('Admin Sign In successful!');
                    window.location.href = "Index.html";
                } else {
                    alert('Incorrect password. Please try again.');
                }
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) { alert(error.message); return; }
                window.location.href = 'Index.html';
            }
        } else {
            alert('Please fill in both fields.');
        }
    });
}

});