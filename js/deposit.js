
import { supabase } from "../src/lib/supabaseClient.js";

// -------------------------------
// GLOBAL NOTIFICATION SYSTEM
// -------------------------------
window.showNotification = function(message, type = "info") {
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

  // Force browser reflow to guarantee smooth initial slide-in transition
  void notification.offsetWidth;
  notification.classList.add("show");

  // Automatically dismiss and cleanly remove from DOM
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 400); 
  }, 4000);
};

document.addEventListener('DOMContentLoaded', async () => {



  const depositForm = document.getElementById('depositForm');
  const amountInput = document.getElementById('depositAmount');
  const planSelect = document.getElementById('plans');
  const methodSelect = document.getElementById('deposit-options');
  const durationSelect = document.getElementById('contract-duration');
  const walletDisplayContainer = document.getElementById('wallet-display-container');

  const balanceValueEl = document.getElementById('balanceValue');
  const profitValueEl = document.getElementById('profitValue');
  const profitDisplayEl = document.getElementById('profit-display');
  const submitBtn = document.getElementById('deposit-submit-btn');

  // Calendar elements
  const toggleCalendarBtn = document.getElementById('toggle-calendar-btn');
  const calendarContainer = document.getElementById('earnings-calendar-container');
  const calendarGrid = document.getElementById('earnings-calendar-grid');
  let isCalendarVisible = false;

  // -------------------------------
  // MODERN PLAN CARDS LOGIC
  // -------------------------------
  const planCards = document.querySelectorAll('.plan-card');
  
  planCards.forEach(card => {
    // Handle click
    card.addEventListener('click', () => selectPlanCard(card));
    
    // Handle keyboard (Enter/Space)
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectPlanCard(card);
      }
    });
  });

  function selectPlanCard(card) {
    planCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    
    planSelect.value = card.dataset.value;
    
    const event = new Event('change');
    planSelect.dispatchEvent(event);
  }

  // -------------------------------
  // EARNINGS CALENDAR RENDER LOGIC
  // -------------------------------
  function renderEarningsCalendar(amount, roi, duration, planName) {
    if (!calendarGrid) return;
    calendarGrid.innerHTML = ''; // Prevent duplicate nodes

    const dailyProfit = amount * (roi / 100);
    const fragment = document.createDocumentFragment();

    for (let i = 1; i <= duration; i++) {
      const cumulativeProfit = dailyProfit * i;
      const isFinalDay = (i === duration);

      const card = document.createElement('div');
      card.className = `earning-card ${isFinalDay ? 'final-day' : ''}`;
      card.style.animationDelay = `${(i - 1) * 0.03}s`; // Staggered fade-in

      card.innerHTML = `
        <div class="earning-day">Day ${i}</div>
        <div class="earning-capital">Capital: $${amount.toFixed(2)}</div>
        <div class="earning-profit">+$${cumulativeProfit.toFixed(2)}</div>
        <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px;">${planName} Plan</div>
        ${isFinalDay ? `<div style="font-size: 0.75rem; color: var(--success); font-weight: 700; margin-top: 6px;">Total Return</div>` : ''}
      `;
      fragment.appendChild(card);
    }
    calendarGrid.appendChild(fragment);
  }

  // -------------------------------
  // AUTH (FIXED)
  // -------------------------------
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    window.location.replace('login.html');
    return;
  }

  const user = session.user;

  // -------------------------------
  // HELPERS
  // -------------------------------
  const formatCurrency = num => '$' + Number(num).toFixed(2);

  const walletAddresses = {
    BTC: "bc1q4yyz5gpsyqsgxnm7ec2llngafa374z9a8yuxlm",
    ETH: "0x4ed7728b43c5623c580e6b06ee1c959af4a177f7",
    BNB: "0x4ed7728b43c5623c580e6b06ee1c959af4a177f7",
    USDT: "0x4ed7728b43c5623c580e6b06ee1c959af4a177f7"
  };

  const networkWarnings = {
    BTC: "Send only BTC to this address",
    ETH: "Send only ETH (ERC20 compatible networks not supported here)",
    BNB: "Send only BNB (BEP20)",
    USDT: "Send only USDT (ERC20)"
  };

  const planRanges = {
    basic: { min: 100, max: 999 },
    standard: { min: 1000, max: 9999 },
    advance: { min: 10000, max: 49999 },
    premium: { min: 50000, max: Infinity }
  };

  const planROIs = {
    basic: 6.5,
    standard: 14.5,
    advance: 21.5,
    premium: 28.5
  };

  const durationNames = {
    1: "daily contract (1 day)",
    7: "weekly contract (7 days)",
    30: "monthly contract (30 days)"
  };

  // -------------------------------
  // FETCH BALANCES
  // -------------------------------
  async function fetchAndDisplayBalances() {
    const { data, error } = await supabase
      .from('profiles')
      .select('balance, profit_balance')
      .eq('id', user.id)
      .single();

    if (error) return;

    balanceValueEl.textContent = formatCurrency(data.balance || 0);
    profitValueEl.textContent = formatCurrency(data.profit_balance || 0);
  }

  await fetchAndDisplayBalances();

  // -------------------------------
  // PROFIT CALCULATION & INLINE NOTIFICATIONS
  // -------------------------------
  let calculationTimeout;
  let errorTimeout;
  let messageSequence = 0;

  function showInlineMessage(text, color, autoHide = false) {
    clearTimeout(errorTimeout);
    const currentSeq = ++messageSequence;

    const isCurrentlyHidden = profitDisplayEl.classList.contains('fade-out') || profitDisplayEl.textContent.trim() === '';

    // Begin fade-out of current text
    if (!isCurrentlyHidden) {
      profitDisplayEl.classList.add('fade-out');
    }

    // If already hidden, transition instantly; otherwise wait for CSS fade-out to finish (300ms)
    const delay = isCurrentlyHidden ? 0 : 300;

    setTimeout(() => {
      if (currentSeq !== messageSequence) return; // Abort if user typed again quickly

      profitDisplayEl.textContent = text;
      profitDisplayEl.style.color = color;
      
      // Force browser reflow to reliably trigger the CSS transition if delay was 0
      if (delay === 0) void profitDisplayEl.offsetWidth;
      profitDisplayEl.classList.remove('fade-out');

      if (autoHide) {
        errorTimeout = setTimeout(() => {
          if (currentSeq === messageSequence) {
            profitDisplayEl.classList.add('fade-out');
          }
        }, 1500); // Auto-hide after roughly 1.5 seconds visibility
      }
    }, delay);
  }

  function updateProfitDisplay() {
    const amount = parseFloat(amountInput.value);
    const plan = planSelect.value;
    const method = methodSelect.value;
    const durationStr = durationSelect.value;

    clearTimeout(calculationTimeout);

    // Hide calendar mechanisms safely during recalculation or invalid inputs
    if (toggleCalendarBtn) toggleCalendarBtn.style.display = 'none';
    if (calendarContainer && isCalendarVisible) {
      calendarContainer.style.display = 'none';
    }

    if (!amount || isNaN(amount) || !plan || !method || !durationStr) {
      showInlineMessage('Please fill in all fields (Method, Duration, Plan, and Amount) to see your deposit summary.', 'var(--danger)', true);
      return;
    }

    const range = planRanges[plan];
    if (range && (amount < range.min || amount > range.max)) {
      const maxDisplay = range.max === Infinity ? 'unlimited' : `$${range.max}`;
      showInlineMessage(`Amount must be between $${range.min} and ${maxDisplay} as per the selected plan.`, 'var(--danger)', true);
      return;
    }

    // Enter "Calculating..." state
    showInlineMessage('Calculating...', 'var(--warning)', false);

    calculationTimeout = setTimeout(() => {
      const duration = parseInt(durationStr);
      const roi = planROIs[plan];
      const dailyProfit = amount * (roi / 100);
      const totalProfit = dailyProfit * duration;
      
      const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
      const durationText = durationNames[duration];

      const summaryText = `You have selected the ${planName} Plan with a ${roi}% daily return. A deposit of $${amount.toFixed(2)} using ${method} for a ${durationText} will yield a total profit of $${totalProfit.toFixed(2)}.`;
      
      showInlineMessage(summaryText, 'var(--success)', false);
      
      // Bind valid data to the toggle button and expose it
      if (toggleCalendarBtn) {
        toggleCalendarBtn.style.display = 'inline-block';
        toggleCalendarBtn.dataset.amount = amount;
        toggleCalendarBtn.dataset.roi = roi;
        toggleCalendarBtn.dataset.duration = duration;
        toggleCalendarBtn.dataset.plan = planName;
        
        if (isCalendarVisible) {
          renderEarningsCalendar(amount, roi, duration, planName);
          calendarContainer.style.display = 'block';
        }
      }
    }, 2000);
  }

  amountInput.addEventListener('input', updateProfitDisplay);
  planSelect.addEventListener('change', updateProfitDisplay);
  methodSelect.addEventListener('change', updateProfitDisplay);
  durationSelect.addEventListener('change', updateProfitDisplay);

  // Calendar Toggle Listener
  if (toggleCalendarBtn) {
    toggleCalendarBtn.addEventListener('click', () => {
      isCalendarVisible = !isCalendarVisible;
      if (isCalendarVisible) {
        const amt = parseFloat(toggleCalendarBtn.dataset.amount);
        const r = parseFloat(toggleCalendarBtn.dataset.roi);
        const d = parseInt(toggleCalendarBtn.dataset.duration);
        const p = toggleCalendarBtn.dataset.plan;
        
        renderEarningsCalendar(amt, r, d, p);
        calendarContainer.style.display = 'block';
        toggleCalendarBtn.textContent = 'Hide Earnings Breakdown';
      } else {
        calendarContainer.style.display = 'none';
        toggleCalendarBtn.textContent = 'View Earnings Breakdown';
      }
    });
  }

  // -------------------------------
  // DYNAMIC WALLET ADDRESS & COPY
  // -------------------------------
  function updateWalletAddress(coin) {
    if (coin && walletAddresses[coin]) {
        const address = walletAddresses[coin];
        const warning = networkWarnings[coin];
        walletDisplayContainer.innerHTML = `
            <div class="deposit-address">
                <p id="walletAddress">${address}</p>
                <button id="copyWalletBtn" class="copy-btn" type="button">Copy</button>
            </div>
            <p class="network-warning-text">${warning}</p>
        `;
    } else {
        walletDisplayContainer.innerHTML = `<p class="deposit-address-placeholder">Select a coin to view deposit address</p>`;
    }
  }

  methodSelect.addEventListener('change', () => updateWalletAddress(methodSelect.value));

  walletDisplayContainer.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'copyWalletBtn') {
        const addressEl = document.getElementById('walletAddress');
        if (addressEl) {
            navigator.clipboard.writeText(addressEl.textContent).then(() => {
                e.target.textContent = 'Copied!';
                setTimeout(() => { e.target.textContent = 'Copy'; }, 2000);
            }).catch(err => {
                console.error('Failed to copy: ', err);
                showNotification('Failed to copy address', 'error');
            });
        }
    }
  });

  updateWalletAddress(methodSelect.value); // Set initial state

  // -------------------------------
  // SUBMIT
  // -------------------------------
  depositForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Disable button to prevent multiple submissions
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    const amount = parseFloat(amountInput.value);
    const plan = planSelect.value;
    const method = methodSelect.value;
    const durationStr = durationSelect.value;
    const txId = document.getElementById('transaction-id').value;

    if (!amount || !plan || !method || !txId || !durationStr) {
      showNotification('Fill all fields correctly', 'warning');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm Deposit';
      return;
    }

    // Map and validate duration string to DB value
    const durationMap = { "1": "daily", "7": "weekly", "30": "monthly" };
    const contractDurationDb = durationMap[durationStr];
    
    if (!contractDurationDb) {
      showNotification('Invalid contract duration selected', 'warning');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm Deposit';
      return;
    }

    const range = planRanges[plan];
    if (range && (amount < range.min || amount > range.max)) {
      showNotification(`Amount must be between $${range.min} and $${range.max}`, 'warning');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm Deposit';
      return;
    }

    // -------------------------------
    // INSERT TRANSACTION
    // -------------------------------
    const { error } = await supabase
      .from('transactions')
      .insert([{
        user_id: user.id,
        type: 'Deposit',
        amount: amount,
        method: method,
        status: 'Pending',
        tx_id: txId,
        plan: plan, // Add plan information to transaction
        contract_duration: contractDurationDb
      }]);

    if (error) {
      console.error(error);
      showNotification('Failed to submit deposit', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm Deposit';
      return;
    }

    const duration = parseInt(durationStr);
    const roi = planROIs[plan];
    const dailyProfit = amount * (roi / 100);
    const totalProfit = dailyProfit * duration;

    sessionStorage.setItem('depositDetails', JSON.stringify({
      plan,
      amount,
      roi,
      duration,
      profit: totalProfit,
      method,
      transactionId: txId
    }));

    showNotification('Deposit submitted. Awaiting confirmation.', 'success');

    depositForm.reset();
    planCards.forEach(c => c.classList.remove('active'));
    profitDisplayEl.innerHTML = '';

    if (toggleCalendarBtn) toggleCalendarBtn.style.display = 'none';
    if (calendarContainer) calendarContainer.style.display = 'none';
    isCalendarVisible = false;
    if (toggleCalendarBtn) toggleCalendarBtn.textContent = 'View Earnings Breakdown';

    window.location.href = 'deposit-confirmation.html';
  });

});