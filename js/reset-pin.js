import { supabase } from "../src/lib/supabaseClient.js";

function showNotification(message, type = "success") {
  const container = document.getElementById("notification-container");
  const notification = document.createElement("div");
  notification.className = `custom-notification ${type}`;
  notification.textContent = message;
  container.appendChild(notification);
  setTimeout(() => notification.remove(), 4000);
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('resetPinForm');
  const btn = document.getElementById('resetBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPin = document.getElementById('newPin').value;
    const confirmPin = document.getElementById('confirmPin').value;

    if (newPin !== confirmPin) {
      showNotification('PINs do not match', 'error');
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      showNotification('PIN must be exactly 4 digits', 'error');
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      showNotification('Invalid or missing reset token', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Processing...';

    try {
      const response = await fetch('https://optbolceuicpwtjukqtm.supabase.co/functions/v1/request-pin-reset' , {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPin })
      });

      let responseData = null;
      try {
        responseData = await response.json();
      } catch (parseErr) {
        if (!response.ok) {
          throw new Error(`Server error (${response.status})`);
        }
      }

      if (!response.ok || (responseData && responseData.success === false)) {
        throw new Error(responseData?.error || responseData?.message || 'Failed to reset PIN');
      }

      showNotification('PIN reset successful! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = 'withdraw.html';
      }, 2000);
    } catch (err) {
      showNotification(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Reset PIN';
    }
  });
});