import { supabase } from "../src/lib/supabaseClient.js";

document.addEventListener('DOMContentLoaded', function() {
  

  const form = document.getElementById('forgotPasswordForm');
  const emailInput = document.getElementById('email');
  const message = document.getElementById('message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();

    message.textContent = "Sending reset link...";
    message.style.color = "green";

    // Dynamically point back to the reset-password page based on the current domain
    const redirectUrl = window.location.href.replace('forgot-password.html', 'reset-password.html');

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      message.textContent = "Error: " + error.message;
      message.style.color = "red";
    } else {
      message.textContent = "Password reset link sent! Please check your email inbox.";
      message.style.color = "green";
    }
  });
});