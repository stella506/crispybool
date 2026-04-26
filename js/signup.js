import { supabase } from "../src/lib/supabaseClient.js";

document.addEventListener('DOMContentLoaded', function () {
 

  // --- CAPTURE REFERRAL FROM URL ---
  const urlParams = new URLSearchParams(window.location.search);
  const refFromUrl = urlParams.get('ref');

  if (refFromUrl) {
    localStorage.setItem('referral', refFromUrl);
  }

  // --- AUTO-FILL & VALIDATE REFERRAL ---
async function handleReferral() {
  const urlParams = new URLSearchParams(window.location.search);
  const refFromUrl = urlParams.get('ref');

  if (!refFromUrl) return;

  try {
    // Check if username exists in database
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', refFromUrl)
      .single();

    if (error || !data) {
      console.warn('Invalid referral link');
      return;
    }

    // Save valid referral
    localStorage.setItem('referral', refFromUrl);

    // Auto-fill input field (if it exists)
    if (referralInput) {
      referralInput.value = refFromUrl;
      referralInput.readOnly = true; // optional (locks it)
    }

  } catch (err) {
    console.error('Referral check failed:', err);
  }
}

// Run it
handleReferral();

  // --- FORM ELEMENTS ---
  const form = document.querySelector('.registration-form form');
  if (!form) {
    console.warn('Signup form not found.');
    return;
  }

  const emailInput = document.getElementById('email');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const referralInput = document.getElementById('referral');
  const acceptInput = document.getElementById('accept');
  const togglePassword = document.getElementById('togglePassword');

  // --- PASSWORD TOGGLE ---
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function (e) {
      e.preventDefault();

      const isHidden = passwordInput.type === 'password';
      passwordInput.type = isHidden ? 'text' : 'password';
      this.textContent = isHidden ? 'Hide' : 'Show';
    });
  }

  // --- EMAIL VALIDATION ---
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // --- MESSAGE ELEMENT ---
  let messageEl = document.getElementById('signup-message');
  if (!messageEl) {
    messageEl = document.createElement('p');
    messageEl.id = 'signup-message';
    messageEl.style.fontWeight = '500';
    messageEl.style.textAlign = 'center';
    messageEl.style.marginBottom = '15px';
    messageEl.style.whiteSpace = 'pre-line'; // Preserves formatting for multiple errors
    form.prepend(messageEl);
  }

  function displayMessage(text, isError) {
    messageEl.textContent = text;
    messageEl.style.color = isError ? 'red' : 'green';
  }

  // --- FORM SUBMISSION ---
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    messageEl.textContent = ''; // Clear previous messages

    const errors = [];
    const emailValue = emailInput.value.trim();
    const usernameValue = usernameInput.value.trim();
    const passwordValue = passwordInput.value;

    // Get referral from BOTH sources:
    const referralFromStorage = localStorage.getItem('referral');
    const referralFromInput = referralInput ? referralInput.value.trim() : '';

    // Priority: URL/localStorage > manual input
    const finalReferral = referralFromStorage || referralFromInput || null;

    // --- VALIDATION ---
    if (!usernameValue) errors.push('Username is required.');
    else if (usernameValue.length < 3) errors.push('Username must be at least 3 characters.');

    if (!emailValue) errors.push('Email is required.');
    else if (!isValidEmail(emailValue)) errors.push('Please enter a valid email.');

    if (!passwordValue) errors.push('Password is required.');
    else if (passwordValue.length < 6) errors.push('Password must be at least 6 characters.');

    if (!acceptInput.checked) errors.push('You must agree to the terms and conditions.');

    if (errors.length > 0) {
      displayMessage('Please fix the following errors:\n\n' + errors.join('\n'), true);
      return;
    }

    try {
      // --- SIGN UP USER ---
      const { data, error } = await supabase.auth.signUp({
        email: emailValue,
        password: passwordValue
      });

      if (error) throw error;

      const user = data.user;

      if (!user) {
        displayMessage('Signup successful! Please check your email to confirm your account.', false);
        return;
      }

      // --- INSERT INTO PROFILES ---
      const profilePayload = {
        id: user.id,
        // user_id: user.id, // keep consistency with your schema
        email: emailValue,
        username: usernameValue,
        referred_by: finalReferral // ✅ CORRECT COLUMN
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([profilePayload]);

      if (profileError) {
        console.error(profileError);
        displayMessage('Account created but profile failed. Contact support.', true);
        return;
      }

      // --- CLEAR REFERRAL AFTER USE ---
      localStorage.removeItem('referral');

      // --- FORCE LOGOUT ---
      await supabase.auth.signOut();

      displayMessage('Registration successful! Redirecting to login...', false);
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);

    } catch (err) {
      console.error(err);
      displayMessage('Signup failed: ' + err.message, true);
    }
  });
});