// Import Supabase client at module level (not inside DOMContentLoaded)
import { supabase } from "../src/lib/supabaseClient.js";

document.addEventListener('DOMContentLoaded', function() {
  // --- FORM ELEMENTS ---
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const message = document.getElementById('message');
  const togglePassword = document.getElementById('togglePassword');
  const registerBtn = document.getElementById('registerBtn');


  if (!loginForm || !emailInput || !passwordInput || !message) {
    console.warn('Login script: missing required form elements.');
    return;
  }

  // --- HELPER FUNCTIONS ---
  function displayMessage(text, color) {
    message.textContent = text;
    message.style.color = color;
    // message.style.fontWeight = 'bold';
  }

  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // --- PASSWORD TOGGLE ---
  togglePassword?.addEventListener('click', function () {
    const isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';
    togglePassword.textContent = isHidden ? 'Hide' : 'Show';
  });

  // --- REDIRECT TO SIGNUP ---
  registerBtn?.addEventListener('click', function() {
    window.location.href = 'signup.html';
  });

  // --- LOGIN FORM SUBMIT ---
  loginForm.addEventListener('submit', async function(event) {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // --- VALIDATION ---
    if (!email) return displayMessage('Please enter your email address.', 'red');
    if (!isValidEmail(email)) return displayMessage('Please enter a valid email address.', 'red');
    if (!password) return displayMessage('Please enter your password.', 'red');

    // --- SUPABASE AUTHENTICATION ---
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        displayMessage('Login failed: ' + error.message, 'red');
        return;
      }

      if (!data.session) {
        displayMessage('Login failed: No session returned.', 'red');
        return;
      }

      // Optionally save session to localStorage
      localStorage.setItem('supabase_session', JSON.stringify(data.session));

      displayMessage('Login successful! Redirecting...', 'green');

      // Fetch user profile to check role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        displayMessage('Failed to fetch user profile: ' + profileError.message, 'red');
        return;
      }

      if (profile.role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'dashboard.html';
      }

    } catch (err) {
      console.error(err);
      displayMessage('An unexpected error occurred. Try again.', 'red');
    }
  });
});