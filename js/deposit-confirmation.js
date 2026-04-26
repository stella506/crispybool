import { supabase } from "../src/lib/supabaseClient.js";

document.addEventListener('DOMContentLoaded', () => {
    const depositDetailsContainer = document.getElementById('deposit-details');
    const confirmationMessage = document.getElementById('confirmation-message');
    const spinner = document.getElementById('confirmation-spinner'); // Assumes this element exists
    const detailsWrapper = document.getElementById('deposit-details-wrapper'); // Assumes this element exists

    // --- Start in Loading State ---
    if (spinner) spinner.style.display = 'block';
    if (detailsWrapper) detailsWrapper.style.display = 'none';
    confirmationMessage.textContent = 'Confirming your transaction on the blockchain...';
    confirmationMessage.style.color = 'var(--text-secondary)';

    // --- Simulate Confirmation Delay for Better UX ---
    setTimeout(() => {
        if (spinner) spinner.style.display = 'none';
        if (detailsWrapper) detailsWrapper.style.display = 'block';
        
        confirmationMessage.textContent = 'Please wait while our system confirms your deposit...';
        confirmationMessage.style.color = 'var(--success)';

        const depositDetails = JSON.parse(sessionStorage.getItem('depositDetails'));

        if (depositDetails && depositDetailsContainer) {
            const planName = depositDetails.plan.charAt(0).toUpperCase() + depositDetails.plan.slice(1);
            depositDetailsContainer.innerHTML = `
                <p><strong>Plan:</strong> ${planName} Plan</p>
                <p><strong>Payment Method:</strong> ${depositDetails.method}</p>
                <p><strong>Daily ROI:</strong> ${depositDetails.roi}%</p>
                <p><strong>Contract Duration:</strong> ${depositDetails.duration} Day(s)</p>
                <p><strong>Amount:</strong> $${depositDetails.amount.toFixed(2)}</p>
                <p><strong>Expected Total Profit:</strong> $${depositDetails.profit.toFixed(2)}</p>
                <p><strong>Transaction ID:</strong> ${depositDetails.transactionId}</p>
            `;
        }
    }, 2500); // 2.5-second simulated delay
});