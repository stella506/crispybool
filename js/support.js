// Support form validation and submission
import { supabase } from "../src/lib/supabaseClient.js";

document.addEventListener('DOMContentLoaded', function() {
  const supportForm = document.getElementById('supportForm');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const messageInput = document.getElementById('message');
  const nameError = document.getElementById('nameError');
  const emailError = document.getElementById('emailError');
  const messageError = document.getElementById('messageError');
  const submitBtn = document.querySelector('.submit-btn');

  // Validation functions
  function validateName(name) {
    if (!name.trim()) {
      return 'Full name is required.';
    }
    if (name.trim().length < 2) {
      return 'Full name must be at least 2 characters long.';
    }
    if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
      return 'Full name can only contain letters and spaces.';
    }
    return '';
  }

  function validateEmail(email) {
    if (!email.trim()) {
      return 'Email address is required.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return 'Please enter a valid email address.';
    }
    return '';
  }

  function validateMessage(message) {
    if (!message.trim()) {
      return 'Message is required.';
    }
    if (message.trim().length < 10) {
      return 'Message must be at least 10 characters long.';
    }
    return '';
  }

  // Real-time validation
  nameInput.addEventListener('input', function() {
    const error = validateName(this.value);
    nameError.textContent = error;
    this.classList.toggle('error', !!error);
  });

  emailInput.addEventListener('input', function() {
    const error = validateEmail(this.value);
    emailError.textContent = error;
    this.classList.toggle('error', !!error);
  });

  messageInput.addEventListener('input', function() {
    const error = validateMessage(this.value);
    messageError.textContent = error;
    this.classList.toggle('error', !!error);
  });

  // Form submission
  supportForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const nameValue = nameInput.value;
    const emailValue = emailInput.value;
    const messageValue = messageInput.value;

    const nameErrorMsg = validateName(nameValue);
    const emailErrorMsg = validateEmail(emailValue);
    const messageErrorMsg = validateMessage(messageValue);

    // Display errors
    nameError.textContent = nameErrorMsg;
    emailError.textContent = emailErrorMsg;
    messageError.textContent = messageErrorMsg;

    // Add error classes
    nameInput.classList.toggle('error', !!nameErrorMsg);
    emailInput.classList.toggle('error', !!emailErrorMsg);
    messageInput.classList.toggle('error', !!messageErrorMsg);

    // If no errors, submit the form
    if (!nameErrorMsg && !emailErrorMsg && !messageErrorMsg) {
      // Disable submit button to prevent multiple submissions
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      // Simulate form submission (replace with actual submission logic)
      setTimeout(function() {
        // Show success message
        submitBtn.textContent = '✓ Message Sent Successfully!';
        submitBtn.style.background = '#4CAF50';

        // Reset form
        setTimeout(function() {
          supportForm.reset();
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Message';
          submitBtn.style.background = '#ff6f61';

          // Clear error messages
          nameError.textContent = '';
          emailError.textContent = '';
          messageError.textContent = '';
          nameInput.classList.remove('error');
          emailInput.classList.remove('error');
          messageInput.classList.remove('error');
        }, 3000);
      }, 2000);
    } else {
      // Scroll to first error
      const firstError = document.querySelector('.error-message:not(:empty)');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  });

  // Add CSS for error state
  const style = document.createElement('style');
  style.textContent = `
    .form-group input.error,
    .form-group textarea.error {
      border-color: #ff6f61 !important;
      background: rgba(255, 111, 97, 0.1) !important;
    }
  `;
  document.head.appendChild(style);
});