import { supabase } from "../src/lib/supabaseClient.js";

// -------------------------------
// GLOBAL NOTIFICATION SYSTEM
// -------------------------------
// Inject required CSS styles to ensure notifications display correctly 
// (Fixes the issue where styles were missing if deposit.css wasn't loaded)
if (!document.getElementById('withdraw-notification-styles')) {
  const style = document.createElement('style');
  style.id = 'withdraw-notification-styles';
  style.textContent = `
    #notification-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    }
    .custom-notification {
      min-width: 280px;
      max-width: 380px;
      padding: 14px 20px;
      border-radius: 8px;
      background: var(--card-bg, #ffffff);
      color: var(--text-primary, #0f172a);
      font-size: 0.95rem;
      font-weight: 600;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
      pointer-events: auto;
      transform: translateX(120%);
      opacity: 0;
      transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease;
      display: flex;
      align-items: center;
      border-left: 4px solid transparent;
    }
    .custom-notification.show {
      transform: translateX(0);
      opacity: 1;
    }
    .custom-notification.success { border-left-color: var(--success, #10b981); }
    .custom-notification.error { border-left-color: var(--danger, #ef4444); }
    .custom-notification.warning { border-left-color: var(--warning, #f59e0b); }
    .custom-notification.info { border-left-color: var(--primary, #1e3a5f); }
    
    .input-error {
      border-color: #ef4444 !important;
      background: rgba(254, 226, 226, 0.3) !important;
      box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.5), 0 0 0 4px rgba(239, 68, 68, 0.15) !important;
    }
    .shake {
      animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
    }
    @keyframes shake {
      10%, 90% { transform: translate3d(-1px, 0, 0); }
      20%, 80% { transform: translate3d(2px, 0, 0); }
      30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
      40%, 60% { transform: translate3d(4px, 0, 0); }
    }
  `;
  document.head.appendChild(style);
}

// Guarantee correct global function assignment
window.showNotification = function(message, type = "info", duration = 4000) {
  let container = document.getElementById("notification-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "notification-container";
    document.body.appendChild(container);
  }

  const notification = document.createElement("div");
  notification.className = `custom-notification ${type}`;
  notification.textContent = message;

  container.appendChild(notification);

  void notification.offsetWidth;
  notification.classList.add("show");

  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 400); 
  }, duration);
};

document.addEventListener('DOMContentLoaded', async () => {

  

  const withdrawalForm = document.getElementById('withdrawalForm');
  const withdrawalHistory = document.getElementById('withdrawalHistory');
  const withdrawBtn = document.getElementById('withdraw-btn');
  const withdrawAmountInput = document.getElementById('withdrawAmount');

  const accountBalanceDisplay = document.getElementById('accountBalanceDisplay');
  const profitBalanceDisplay = document.getElementById('profitBalanceDisplay');

  let currentAccountBalance = 0;
  let currentProfitBalance = 0;
  let hasPin = false;

  // Dynamically add PIN field to the withdrawal form
  if (withdrawalForm && withdrawBtn) {
    const pinGroup = document.createElement('div');
    pinGroup.className = 'form-group';
    pinGroup.innerHTML = `
      <label for="withdrawPin" style="display:flex; justify-content:space-between; align-items:center;">
        Withdrawal PIN 
        <a href="#" id="forgotPinLink" style="font-size:0.8rem; color:var(--primary, #1e3a5f); text-decoration:underline;">Forgot PIN?</a>
      </label>
      <input type="password" id="withdrawPin" placeholder="Enter 4-digit PIN" maxlength="4" pattern="\\d{4}" required autocomplete="new-password">
    `;
    withdrawalForm.insertBefore(pinGroup, withdrawBtn);
  }

  // Handle Forgot PIN click
  document.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'forgotPinLink') {
      e.preventDefault();
      const link = e.target;
      if (link.style.opacity === '0.5') return;
      
      link.style.opacity = '0.5';
      link.textContent = 'Sending...';

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Session expired. Please log in again.');
        }

        const response = await fetch('https://optbolceuicpwtjukqtm.supabase.co/functions/v1/request-pin-reset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ email: session.user.email })
        });

        let responseData = null;
        try {
          responseData = await response.json();
          console.log('[DEBUG] Full backend response:', responseData);
        } catch (parseErr) {
          if (!response.ok) {
            throw new Error(`Server error (${response.status})`);
          }
        }

        if (!response.ok || (responseData && responseData.success === false)) {
          let errorMsg = responseData?.message || responseData?.error;
          if (typeof errorMsg === 'object') {
            errorMsg = errorMsg.message || JSON.stringify(errorMsg);
          }
          throw new Error(errorMsg || JSON.stringify(responseData) || 'Failed to request reset');
        }

        showNotification('Reset link sent to your email', 'success');
      } catch (err) {
        console.error('PIN reset request error:', err);
        showNotification(err.message || 'Could not send reset email', 'error');
      } finally {
        setTimeout(() => {
          link.style.opacity = '1';
          link.textContent = 'Forgot PIN?';
        }, 3000);
      }
    }
  });

  // Create Set PIN Modal
  function showPinSetupModal() {
    if (document.getElementById('pinSetupModal')) return;

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'pinSetupModal';
    modalOverlay.style.position = 'fixed';
    modalOverlay.style.top = '0';
    modalOverlay.style.left = '0';
    modalOverlay.style.width = '100%';
    modalOverlay.style.height = '100%';
    modalOverlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
    modalOverlay.style.display = 'flex';
    modalOverlay.style.justifyContent = 'center';
    modalOverlay.style.alignItems = 'center';
    modalOverlay.style.zIndex = '10000';
    modalOverlay.style.backdropFilter = 'blur(5px)';
    
    modalOverlay.innerHTML = `
      <div style="background: var(--card-bg, #fff); padding: 32px; border-radius: 16px; width: 90%; max-width: 420px; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
        <h2 style="margin-top: 0; color: var(--primary, #1e3a5f); font-size: 1.5rem; text-align: center;">Security Setup</h2>
        <p style="color: var(--text-secondary, #64748b); font-size: 0.95rem; text-align: center; margin-bottom: 24px;">Please set up a 4-digit security PIN before making withdrawals.</p>
        <form id="setPinForm" style="display: flex; flex-direction: column; gap: 16px;">
          <div class="form-group" style="margin:0;">
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-primary, #0f172a);">Enter PIN</label>
            <input type="password" id="newPin" maxlength="4" pattern="\\d{4}" required style="width: 100%; padding: 14px 16px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 1.1rem; text-align: center; letter-spacing: 5px;" placeholder="••••" autocomplete="new-password">
          </div>
          <div class="form-group" style="margin:0;">
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-primary, #0f172a);">Confirm PIN</label>
            <input type="password" id="confirmPin" maxlength="4" pattern="\\d{4}" required style="width: 100%; padding: 14px 16px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 1.1rem; text-align: center; letter-spacing: 5px;" placeholder="••••" autocomplete="new-password">
          </div>
          <button type="submit" id="setPinBtn" style="margin-top: 10px; width: 100%; padding: 14px; background: linear-gradient(135deg, #d1af7e 30%, #6a040f 100%); color: #fff; border: none; border-radius: 10px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: all 0.3s ease;">Set PIN</button>
        </form>
      </div>
    `;
    
    document.body.appendChild(modalOverlay);

    document.getElementById('setPinForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const pin1 = document.getElementById('newPin').value;
      const pin2 = document.getElementById('confirmPin').value;
      const btn = document.getElementById('setPinBtn');

      if (pin1 !== pin2) {
        showNotification("PINs do not match", "error");
        return;
      }
      if (!/^\d{4}$/.test(pin1)) {
        showNotification("PIN must be exactly 4 digits", "warning");
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Processing...';

      try {
        // --- 1. Authenticate user session ---
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Session expired. Please log in again.');
        }
        
        // --- 2. Call the Supabase Edge Function ---
        const response = await fetch('https://optbolceuicpwtjukqtm.supabase.co/functions/v1/set-pin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ pin: pin1 })
        });

        // --- 3. Robust JSON Parsing ---
        let responseData = null;
        try {
          responseData = await response.json();
        } catch (parseErr) {
          console.error('Non-JSON response from Edge Function:', parseErr);
          if (!response.ok) {
            throw new Error('Unable to set PIN. Edge Function returned an invalid response.');
          }
        }

        // --- 4. Handle Edge Function Response Properly ---
        if (!response.ok || (responseData && responseData.success === false)) {
          throw new Error(responseData?.message || responseData?.error || 'Unable to set PIN. Please try again.');
        }

        // --- 5. Success Flow ---
        showNotification(responseData?.message || "PIN set successfully", "success");
        hasPin = true;
        
        // Clear input fields after success
        document.getElementById('newPin').value = '';
        document.getElementById('confirmPin').value = '';

        // Close PIN modal only on success
        modalOverlay.style.opacity = '0';
        modalOverlay.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
          if(modalOverlay.parentNode) document.body.removeChild(modalOverlay);
        }, 300);
      } catch (err) {
        // --- 6. Robust Error Handling ---
        showNotification(err.message || 'Network failure or Edge Function downtime.', "error");
        btn.disabled = false;
        btn.textContent = 'Set PIN';
      }
    });
  }

  // -------------------------------
  // AUTH
  // -------------------------------
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    window.location.replace('login.html');
    return;
  }

  const user = userData.user;

  // -------------------------------
  // HELPERS
  // -------------------------------
  const formatCurrency = num => '$' + Number(num).toFixed(2);

  // -------------------------------
  // FETCH BALANCES
  // -------------------------------
  async function fetchAndDisplayBalances() {
    const { data, error } = await supabase
      .from('profiles')
      .select('balance, profit_balance, withdrawal_pin')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Balance fetch error:', error);
      return;
    }

    currentAccountBalance = data.balance || 0;
    currentProfitBalance = data.profit_balance || 0;
    hasPin = !!data.withdrawal_pin;

    accountBalanceDisplay.textContent = formatCurrency(currentAccountBalance);
    profitBalanceDisplay.textContent = formatCurrency(currentProfitBalance);

    if (!hasPin) {
      showPinSetupModal();
    }
  }

  // -------------------------------
  // LOAD WITHDRAWAL HISTORY
  // -------------------------------
  async function loadWithdrawalHistory() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .like('type', 'Withdrawal%')
      .order('created_at', { ascending: false });

    withdrawalHistory.innerHTML = '';

    if (error) {
      withdrawalHistory.innerHTML = '<p>Error loading history</p>';
      return;
    }

    if (!data || data.length === 0) {
      withdrawalHistory.innerHTML = '<p>No withdrawals yet</p>';
      return;
    }

    data.forEach(tx => {
      const div = document.createElement('div');
      div.innerHTML = `
        <p><strong>$${tx.amount}</strong> - ${tx.method}</p>
        <p>${tx.status}</p>
      `;
      withdrawalHistory.appendChild(div);
    });
  }

  // -------------------------------
  // INPUT VALIDATION (DEBOUNCED)
  // -------------------------------
  let validationTimeout;
  let inlineHideTimeout;

  function showInlineValidation(text) {
    let inlineEl = document.getElementById('withdraw-inline-msg');
    if (!inlineEl) {
      inlineEl = document.createElement('p');
      inlineEl.id = 'withdraw-inline-msg';
      inlineEl.style.color = 'var(--danger, #ef4444)';
      inlineEl.style.fontSize = '0.85rem';
      inlineEl.style.fontWeight = '500';
      inlineEl.style.margin = '8px 0 0 0';
      inlineEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      inlineEl.style.opacity = '0';
      inlineEl.style.transform = 'translateY(-8px)';
      inlineEl.style.pointerEvents = 'none';
      inlineEl.style.display = 'block';
      
      if (withdrawAmountInput && withdrawAmountInput.parentNode) {
        withdrawAmountInput.parentNode.appendChild(inlineEl);
      }
    }

    clearTimeout(inlineHideTimeout);
    inlineEl.textContent = text;
    
    void inlineEl.offsetWidth; // Force browser reflow for smooth transition
    
    inlineEl.style.opacity = '1';
    inlineEl.style.transform = 'translateY(0)';

    inlineHideTimeout = setTimeout(() => {
      inlineEl.style.opacity = '0';
      inlineEl.style.transform = 'translateY(-8px)';
    }, 2000);
  }

  if (withdrawAmountInput) {
    withdrawAmountInput.addEventListener('input', (e) => {
      clearTimeout(validationTimeout);
      clearTimeout(inlineHideTimeout);
      withdrawAmountInput.classList.remove('input-error');
      
      let inlineEl = document.getElementById('withdraw-inline-msg');
      if (inlineEl) {
        inlineEl.style.opacity = '0';
        inlineEl.style.transform = 'translateY(-8px)';
      }

      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val < 10 && e.target.value.trim() !== '') {
        validationTimeout = setTimeout(() => {
          withdrawAmountInput.classList.add('input-error');
          showInlineValidation('Minimum withdrawal is $10');
        }, 2000);
      }
    });
  }

  // -------------------------------
  // SUBMIT
  // -------------------------------
  withdrawalForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const method = document.getElementById('withdrawalMethod').value;
    const address = document.getElementById('withdrawalAddress').value;
    const type = document.getElementById('withdrawalType').value;
    const pinInput = document.getElementById('withdrawPin');
    const txId = 'W-' + Date.now();
    const pin = pinInput ? pinInput.value : '';

    if (!amount || !method || !address || !pin) {
      showNotification('Fill all fields', 'warning');
      return;
    }

    // Validate minimum withdrawal amount

    if (!/^\d{4}$/.test(pin)) {
      if (pinInput) {
        pinInput.classList.add('input-error', 'shake');
        setTimeout(() => pinInput.classList.remove('shake'), 500);
      }
      showInlineValidation('PIN must be exactly 4 digits');
      return;
    }

    if (amount < 10) {
      if (withdrawAmountInput) {
        withdrawAmountInput.classList.add('input-error', 'shake');
        setTimeout(() => withdrawAmountInput.classList.remove('shake'), 500);
      }
      showInlineValidation('Minimum withdrawal is $10');
      return;
      
    }

    // Validate address is not empty and has reasonable length
    if (address.trim().length < 26) {
      showNotification('Please enter a valid wallet address', 'warning');
      return;
    }

    if (type === 'account' && amount > currentAccountBalance) {
      showNotification('Insufficient account balance', 'error');
      return;
    }

    if (type === 'profit' && amount > currentProfitBalance) {
      showNotification('Insufficient profit balance', 'error');
      return;
    }

    withdrawBtn.disabled = true;
    withdrawBtn.textContent = 'Processing...';

    // Call backend API for secure withdrawal with PIN
    try {
      // --- 1. Authenticate user session ---
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expired. Please log in again.');
      }
      
      // --- 2. Send Withdrawal Request ---
      const response = await fetch('https://optbolceuicpwtjukqtm.supabase.co/functions/v1/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          amount,
          method,
          address,
          type: type === 'account' ? 'Withdrawal (Account)' : 'Withdrawal (Profit)',
          pin,
          tx_id: txId
        })
      });

      // --- 3. Robust JSON Parsing ---
      let responseData = null;
      let rawText = '';
      try {
        rawText = await response.text();
        responseData = JSON.parse(rawText);
      } catch (parseErr) {
        console.error('Non-JSON response from server. Raw text:', rawText);
        if (!response.ok) {
          throw new Error(`Server error (${response.status}): ${rawText.substring(0, 100)}...`);
        }
      }

      // --- 4. Handle Response ---
      if (!response.ok || (responseData && responseData.success === false)) {
        throw new Error(responseData?.error || responseData?.message || `Backend Error: ${response.status}`);
      }
    } catch (err) {
      // --- 5. Error Handling ---
      console.error('Withdrawal API error:', err);
      showNotification(err.message || 'Network failure. Please try again.', 'error');
      withdrawBtn.disabled = false;
      withdrawBtn.textContent = 'Withdraw Now';
      if (pinInput) {
        pinInput.value = '';
      }
      return;
    }

    showNotification('Withdrawal submitted', 'success');

    // Store details for confirmation page
    sessionStorage.setItem('withdrawalDetails', JSON.stringify({
      amount,
      method,
      address,
      type: type === 'account' ? 'Withdrawal (Account)' : 'Withdrawal (Profit)',
      transactionId: txId
    }));

    withdrawBtn.textContent = 'Redirecting...';
    setTimeout(() => {
      window.location.href = 'withdrawal-confirmation.html';
    }, 3000);
  });

  // -------------------------------
  // INIT
  // -------------------------------
  await fetchAndDisplayBalances();
  await loadWithdrawalHistory();

});