import { supabase } from "../src/lib/supabaseClient.js";

document.addEventListener('DOMContentLoaded', function() {
  

  const form = document.getElementById('resetPasswordForm');
  const passwordInput = document.getElementById('password');
  const message = document.getElementById('message');
  const togglePassword = document.getElementById('togglePassword');

  togglePassword?.addEventListener('click', function () {
    const isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';
    togglePassword.textContent = isHidden ? 'Hide' : 'Show';
  });

  // Verify if a session was successfully recovered from the URL hash
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      console.log("Ready to receive new password.");
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = passwordInput.value;

    if (newPassword.length < 6) {
       message.textContent = "Password must be at least 6 characters.";
       message.style.color = "red";
       return;
    }

    message.textContent = "Updating password...";
    message.style.color = "blue";

    const { data, error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      message.textContent = "Error: " + error.message;
      message.style.color = "red";
    } else {
      message.textContent = "Password updated successfully! Redirecting to login...";
      message.style.color = "green";
      setTimeout(() => {
        supabase.auth.signOut().then(() => window.location.href = 'login.html');
      }, 2000);
    }
  });
});