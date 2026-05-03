import { supabase } from "../src/lib/supabaseClient.js";

document.addEventListener('DOMContentLoaded', () => {
  // Locate the support form or its container based on existing CSS classes
  const supportForm = document.querySelector('.support-form form') || document.querySelector('.support-form');
  if (!supportForm) return;

  supportForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Safely query inputs 
    const nameInput = supportForm.querySelector('input[name="name"], #name, .name-input');
    const emailInput = supportForm.querySelector('input[name="email"], #email, input[type="email"]');
    const descInput = supportForm.querySelector('textarea[name="description"], #description, textarea');
    const submitBtn = supportForm.querySelector('.submit-btn, button[type="submit"]');

    // Create inline success message container if it doesn't exist
    let successMessageEl = supportForm.querySelector('.inline-success-message');
    if (!successMessageEl) {
      successMessageEl = document.createElement('p');
      successMessageEl.className = 'inline-success-message';
      successMessageEl.style.backgroundColor = '#dcfce7';
      successMessageEl.style.color = '#166534';
      successMessageEl.style.padding = '12px 16px';
      successMessageEl.style.borderRadius = '6px';
      successMessageEl.style.marginBottom = '16px';
      successMessageEl.style.display = 'none';
      supportForm.prepend(successMessageEl);
    }

    if (!nameInput || !emailInput || !descInput) {
      console.error('Support form fields missing in DOM.');
      alert('Form configuration error. Please contact support directly.');
      return;
    }

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const description = descInput.value.trim();

    successMessageEl.style.display = 'none';

    if (!name || !email || !description) {
      alert('Please fill out all fields before submitting.');
      return;
    }

    const originalBtnText = submitBtn ? submitBtn.textContent : 'Submit';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
    }

    try {
      const { error } = await supabase
        .from('support')
        .insert([{ name, email, description }]);

      if (error) throw error;

      // Show inline success notification
      successMessageEl.textContent = 'Your support request has been submitted successfully.';
      successMessageEl.style.display = 'block';
      setTimeout(() => {
        successMessageEl.style.display = 'none';
      }, 5000);
      
      if (supportForm.tagName === 'FORM') supportForm.reset();
      else { nameInput.value = ''; emailInput.value = ''; descInput.value = ''; }
    } catch (err) {
      console.error('Support submission error:', err);
      alert(err.message || 'Failed to submit the request. Please try again.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    }
  });
});