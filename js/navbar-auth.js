import { supabase } from "../src/lib/supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
  

  try {
    // ============================
    // LOAD NAVBAR
    // ============================
    const res = await fetch("navbar.html");
    const data = await res.text();
    document.getElementById("navbar-container").innerHTML = data;

    // ============================
    // ELEMENTS
    // ============================
    const hamburger = document.getElementById("hamburger");
    const navLinks = document.getElementById("nav-links");
    const overlay = document.getElementById("nav-overlay");

    const navSignup = document.getElementById("nav-signup");
    const navLogin = document.getElementById("nav-login");
    const navDashboard = document.getElementById("nav-dashboard");
    const navLogout = document.getElementById("nav-logout");
    const logoutBtn = document.getElementById("logoutHomeBtn");

    // ============================
    // MOBILE MENU TOGGLE
    // ============================
    if (hamburger && navLinks && overlay) {
      hamburger.addEventListener("click", () => {
        navLinks.classList.toggle("active");
        hamburger.classList.toggle("active");
        overlay.classList.toggle("active");

        document.body.classList.toggle("no-scroll");

        const expanded = hamburger.getAttribute("aria-expanded") === "true";
        hamburger.setAttribute("aria-expanded", !expanded);
      });

      // CLOSE ON OVERLAY CLICK
      overlay.addEventListener("click", () => {
        navLinks.classList.remove("active");
        hamburger.classList.remove("active");
        overlay.classList.remove("active");
        document.body.classList.remove("no-scroll");
      });

      // CLOSE ON LINK CLICK
      navLinks.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
          navLinks.classList.remove("active");
          hamburger.classList.remove("active");
          overlay.classList.remove("active");
          document.body.classList.remove("no-scroll");
        });
      });
    }

    // ============================
    // AUTH STATE
    // ============================
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      navSignup.style.display = "none";
      navLogin.style.display = "none";
      navDashboard.style.display = "list-item";
      navLogout.style.display = "list-item";
    } else {
      navSignup.style.display = "list-item";
      navLogin.style.display = "list-item";
      navDashboard.style.display = "none";
      navLogout.style.display = "none";
    }

// ============================
// ACTIVE PAGE HIGHLIGHT
// ============================
const currentPath = window.location.pathname.split("/").pop();

document.querySelectorAll(".nav-links a").forEach(link => {
  const linkPath = link.getAttribute("href").split("/").pop();

  if (linkPath === currentPath) {
    link.classList.add("active");
  }
});

    // ============================
    // LOGOUT
    // ============================
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
        window.location.href = "login.html";
      });
    }

  } catch (error) {
    console.error("Navbar Error:", error);
  }
});

