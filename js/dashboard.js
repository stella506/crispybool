import { supabase } from "../src/lib/supabaseClient.js";

document.addEventListener('DOMContentLoaded', async function () {
  // --- SUPABASE SETUP ---
  

  // --- FAST AUTH CHECK ---
  const localSession = localStorage.getItem('supabase_session');
  if (!localSession) {
    window.location.replace('login.html');
    return;
  }

  // --- ELEMENTS ---
  const userDisplay = document.getElementById('usernameDisplay');
  const balanceValue = document.getElementById('balanceValue');
  const profitValue = document.getElementById('profitBalanceValue');
  const bonusValue = document.getElementById('bonusBalanceValue');
  const transactionHistory = document.getElementById('transactionHistory');

  const depositBtn = document.getElementById('depositBtn');
  const withdrawBtn = document.getElementById('withdrawBtn');
  const accountSettingsBtn = document.getElementById('accountSettingsBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  const referralCodeInput = document.getElementById('referralCodeInput');
  const copyReferralBtn = document.getElementById('copyReferralBtn');

  const referralListContainer = document.getElementById('referralList');
  const referralCountBadge = document.getElementById('referralCountBadge');

  let currentUser = null;

  // --- HELPERS ---
  function formatCurrency(number) {
    return '$' + Number(number || 0).toFixed(2);
  }

  function generateReferralLink(username) {
    const baseUrl = window.location.origin;
    return `${baseUrl}/crispybool/index.html?ref=${username}`;
  }

  // --- FETCH DASHBOARD DATA ---
  async function fetchDashboardData() {
    try {
      // 1️⃣ AUTH USER
      if (!currentUser) {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          localStorage.removeItem('supabase_session');
          window.location.replace('login.html');
          return;
        }
        currentUser = user;
      }

      // 2️⃣ PROFILE
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, balance, profit_balance, bonus_balance, email')
        .eq('id', currentUser.id)
        .single();

      if (profileError || !profile) {
        console.error('Profile error:', profileError);
        return;
      }

      // 3️⃣ TRANSACTIONS
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(5);

      profile.transactions = txError ? [] : transactions;
      profile.transactionError = !!txError;

      // 4️⃣ REFERRALS
      const { data: referrals, error: refError } = await supabase
        .from('profiles')
        .select('username, email, created_at')
        .eq('referred_by', profile.username)
        .order('created_at', { ascending: false });

      profile.referrals = refError ? [] : referrals;
      profile.referralError = !!refError;

      // 5️⃣ UPDATE UI
      updateDashboardUI(profile);

    } catch (err) {
      console.error('Dashboard error:', err);
    }
  }

  // --- UPDATE UI ---
  function updateDashboardUI(data) {
    if (!data) return;

    // --- BASIC INFO ---
    userDisplay.textContent = data.username || 'User';
    balanceValue.textContent = formatCurrency(data.balance);
    profitValue.textContent = formatCurrency(data.profit_balance);
    if (bonusValue) bonusValue.textContent = formatCurrency(data.bonus_balance);

    // 🔥 --- REFERRAL LINK (UPDATED FEATURE) ---
    if (referralCodeInput) {
      const referralLink = generateReferralLink(data.username);
      referralCodeInput.value = referralLink;
    }

  
    if (transactionHistory) {
      if (data.transactionError) {
        transactionHistory.innerHTML = '<div class="history-empty">Failed to load transactions.</div>';
      } else if (!data.transactions.length) {
        transactionHistory.innerHTML = '<div class="history-empty">No transactions yet.</div>';
      } else {
        const html = data.transactions.map(tx => {
          const statusLower = (tx.status || '').toLowerCase().trim();
          let statusClass = 'status-pending';
          
          if (statusLower.includes('success')) {
            statusClass = 'status-success';
          } else if (statusLower.includes('fail') || statusLower.includes('cancel') || statusLower.includes('rejected')) {
            statusClass = 'status-failed';
          } else if (statusLower.includes('pending')) {
            statusClass = 'status-pending';
          }
          
          return `
            <tr class="transaction-row">
              <td class="tx-type">${tx.type}</td>
              <td class="tx-amount">$${Number(tx.amount).toFixed(2)}</td>
              <td class="tx-date">${new Date(tx.created_at).toLocaleDateString()}</td>
              <td class="tx-status ${statusClass}"><span class="status-badge">${tx.status}</span></td>
            </tr>
          `;
        }).join('');

        transactionHistory.innerHTML = `
          <div class="transaction-table-container">
            <table class="transaction-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>${html}</tbody>
            </table>
          </div>
        `;
      }
    }

    // 🔥 --- REFERRAL LIST ---
    if (referralListContainer) {
      if (data.referralError) {
        referralListContainer.innerHTML = '<p style="color:red;">Failed to load referrals.</p>';
        return;
      }

      const refs = data.referrals || [];

      // Update count
      if (referralCountBadge) {
        referralCountBadge.textContent = refs.length;
      }

      if (!refs.length) {
        referralListContainer.innerHTML = `
          <div class="referral-empty-state">
            <h3>No Referrals Yet</h3>
            <p>Share your referral link to start earning.</p>
          </div>
        `;
        return;
      }

      const avatarColors = ['avatar-green', 'avatar-blue', 'avatar-purple', 'avatar-orange'];

      referralListContainer.innerHTML = refs.map((user, index) => {
        const initials = user.username.substring(0, 2).toUpperCase();
        const avatarClass = avatarColors[index % avatarColors.length];
        const joinDate = new Date(user.created_at).toLocaleDateString();

        return `
          <div class="referral-item">
            <div class="referral-avatar ${avatarClass}">${initials}</div>
            <div>
              <strong>${user.username}</strong><br>
              <small>${user.email}</small><br>
              <small>Joined: ${joinDate}</small>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // --- COPY REFERRAL LINK ---
  copyReferralBtn?.addEventListener('click', () => {
    if (!referralCodeInput.value) return;

    navigator.clipboard.writeText(referralCodeInput.value)
      .then(() => {
        copyReferralBtn.textContent = 'Copied!';
        setTimeout(() => copyReferralBtn.textContent = 'Copy', 2000);
      })
      .catch(err => console.error('Copy failed:', err));
  });

  // --- LOGOUT ---
  logoutBtn?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('supabase_session');
    window.location.replace('login.html');
  });

  // --- NAVIGATION ---
  depositBtn?.addEventListener('click', () => window.location.href = 'deposit.html');
  withdrawBtn?.addEventListener('click', () => window.location.href = 'withdrawal.html');
  accountSettingsBtn?.addEventListener('click', () => window.location.href = 'account-settings.html');

  // --- AUTO REFRESH ---
  setInterval(fetchDashboardData, 5000);

  // --- INIT ---
  fetchDashboardData();
});