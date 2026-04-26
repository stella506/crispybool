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
      .select('balance, profit_balance')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Balance fetch error:', error);
      return;
    }

    currentAccountBalance = data.balance || 0;
    currentProfitBalance = data.profit_balance || 0;

    accountBalanceDisplay.textContent = formatCurrency(currentAccountBalance);
    profitBalanceDisplay.textContent = formatCurrency(currentProfitBalance);
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

    if (!amount || !method || !address) {
      showNotification('Fill all fields', 'warning');
      return;
    }

    // Validate minimum withdrawal amount

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

    // INSERT
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert([{
        user_id: user.id,
        type: type === 'account' ? 'Withdrawal (Account)' : 'Withdrawal (Profit)',
        amount,
        method,
        address,
        status: 'Pending',
        tx_id: 'W-' + Date.now() // Generate a transaction ID in case the table requires it
      }]);

    if (transactionError) {
      console.error('Withdrawal insert error:', transactionError);
      showNotification(`Transaction failed: ${transactionError.message}. Please check your database settings.`, 'error');
      withdrawBtn.disabled = false;
      withdrawBtn.textContent = 'Withdraw Now';
      return;
    }

    showNotification('Withdrawal submitted', 'success');

    withdrawalForm.reset();
    if (withdrawAmountInput) withdrawAmountInput.classList.remove('input-error');
    withdrawBtn.disabled = false;
    withdrawBtn.textContent = 'Withdraw Now';

    await fetchAndDisplayBalances();
    await loadWithdrawalHistory();
  });

  // -------------------------------
  // INIT
  // -------------------------------
  await fetchAndDisplayBalances();
  await loadWithdrawalHistory();

});