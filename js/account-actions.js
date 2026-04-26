
import { supabase } from "../src/lib/supabaseClient.js";

document.addEventListener('DOMContentLoaded', async () => {
  

  // --- UI ELEMENT SELECTORS ---
  const userBadge = document.getElementById('userBadge');
  const balanceDisplay = document.getElementById('balanceDisplay');
  const logoutBtn = document.getElementById('logoutBtn');
  const settingsForm = document.getElementById('settingsForm');
  const transactionHistoryContainer = document.getElementById('transactionHistoryList');

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // --- DATABASE & API CALLS ---

  async function fetchAccountData() {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      window.location.href = 'login.html';
      return null;
    }

    const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profileError) {
      console.error('Profile fetch error:', profileError);
      window.location.href = 'login.html';
      return null;
    }

    const { data: transactions, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (transactionError) {
      console.error('Transaction fetch error:', transactionError);
      return { ...user, ...profile, transactions: [] };
    }

    return { ...user, ...profile, transactions: transactions || [] };
  }

  async function updateProfileInDatabase(profileData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { username, email } = profileData;
    let successMessage = "Account details updated successfully.";

    const { error: usernameError } = await supabase.from('profiles').update({ username }).eq('id', user.id);
    if (usernameError) return { success: false, error: usernameError.message };

    if (email !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email });
      if (emailError) {
        return { success: false, error: `Username updated, but email update failed: ${emailError.message}` };
      }
      await supabase.from('profiles').update({ email }).eq('id', user.id);
      successMessage = "Username updated. A confirmation email has been sent to your new address to verify the email change.";
    }

    const updatedUser = await fetchAccountData();
    return { success: true, user: updatedUser, message: successMessage };
  }

  // --- UI RENDERING ---

  function populateUI(userData) {
    if (userBadge) {
      userBadge.textContent = userData.username || userData.email;
    }
    if (balanceDisplay) {
      balanceDisplay.textContent = '$' + Number(userData.balance).toFixed(2);
    }
    if (settingsForm) {
      document.getElementById('settingsEmail').value = userData.email || '';
      document.getElementById('settingsUsername').value = userData.username || '';
    }
    if (transactionHistoryContainer) {
      renderTransactions(userData.transactions);
    }
  }

  // Renders the transaction history in a table format--

  function renderTransactions(transactions) {
    const recentTransactions = transactions; // Already sorted from DB

    if (recentTransactions.length === 0) {
      transactionHistoryContainer.innerHTML = '<p style="text-align:center; padding: 20px;">No transactions yet.</p>';
    } else {
      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.textAlign = 'left';
      table.innerHTML = '<thead style="border-bottom: 2px solid #ddd;"><tr><th style="padding:10px;">Date</th><th style="padding:10px;">Type</th><th style="padding:10px;">Amount</th><th style="padding:10px;">Status</th></tr></thead><tbody></tbody>';
      const tbody = table.querySelector('tbody');
      recentTransactions.forEach(tx => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #eee';
        const isDeposit = tx.type === 'Deposit';
        const typeColor = isDeposit ? '#2196F3' : '#f44336';
        const statusText = tx.status || 'Successful';
        const statusColor = statusText.toLowerCase().includes('pending') ? '#ff9800' : '#4CAF50';
        const txDate = new Date(tx.created_at).toLocaleDateString();

        row.innerHTML = `<td style="padding:10px;">${txDate}</td><td style="padding:10px; font-weight:600; color:${typeColor};">${tx.type}</td><td style="padding:10px;">$${Number(tx.amount).toFixed(2)}</td><td style="padding:10px; font-weight:500; color:${statusColor};">${statusText}</td>`;
        tbody.appendChild(row);
      });
      transactionHistoryContainer.innerHTML = ''; // Clear previous content
      transactionHistoryContainer.appendChild(table);
    }
  }

  // --- EVENT LISTENERS ---

  if (settingsForm) {
    settingsForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const email = document.getElementById('settingsEmail').value.trim();
      const username = document.getElementById('settingsUsername').value.trim();

      if (!isValidEmail(email) || username.length < 3) {
        alert('Please fill in valid details: a valid email and a username of at least 3 characters.');
        return;
      }

      // Professional UX: Disable button and show loading state
      const submitBtn = settingsForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';

      const profileData = { email, username };
      const result = await updateProfileInDatabase(profileData);

      if (result.success) {
        alert(result.message || 'Account details updated successfully.');
        if (result.user) {
          populateUI(result.user);
        }
      } else {
        alert('Failed to update account details: ' + (result.error || 'Please try again.'));
      }

      // Restore button state
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (event) => {
      event.preventDefault();
      await supabase.auth.signOut();
      localStorage.removeItem('supabase_session');
      window.location.href = 'index.html';
    });
  }

  // --- INITIALIZATION ---
  async function initialize() {
    const userData = await fetchAccountData();
    if (!userData) {
      // If fetching fails or user is not authenticated, redirect to login
      return;
    }
    populateUI(userData);
  }

  initialize();
});