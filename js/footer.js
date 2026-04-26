
import { supabase } from "../src/lib/supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
  // =========================
  // LOAD FOOTER HTML
  // =========================
  const footerContainer = document.getElementById("footer-container");

  if (footerContainer) {
    const res = await fetch("footer.html");
    const data = await res.text();
    footerContainer.innerHTML = data;
  }

  // =========================
  // SUPABASE SETUP
  // =========================
  // const supabaseUrl = "https://optbolceuicpwtjukqtm.supabase.co";
  // const supabaseKey = "sb_publishable_vVmSGew-fMH1cF9UD-KB-w_fxswx49K";
  // const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

  // =========================
  // HANDLE AUTH LINKS
  // =========================
  const { data: { session } } = await supabase.auth.getSession();

  const footerLinks = document.getElementById("footer-links");

  if (!footerLinks) return;

  if (session) {
    // Logged in
    footerLinks.innerHTML = `
      <li><a href="index.html">Home</a></li>
      <li><a href="about.html">About Us</a></li>
      <li><a href="faq.html">FAQ</a></li>
      <li><a href="terms.html">Terms</a></li>
      <li><a href="support.html">Support</a></li>
      <li><a href="dashboard.html">Dashboard</a></li>
      <li><a href="#" id="logout-btn">Logout</a></li>
    `;

    // Logout
    setTimeout(() => {
      const logoutBtn = document.getElementById("logout-btn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
          await supabase.auth.signOut();
          window.location.href = "login.html";
        });
      }
    }, 100);

  } else {
    // Logged out
    footerLinks.innerHTML = `
      <li><a href="index.html">Home</a></li>
      <li><a href="about.html">About Us</a></li>
      <li><a href="faq.html">FAQ</a></li>
      <li><a href="terms.html">Terms</a></li>
      <li><a href="support.html">Support</a></li>
      <li><a href="signup.html">Sign Up</a></li>
      <li><a href="login.html">Login</a></li>
    `;
  }
});