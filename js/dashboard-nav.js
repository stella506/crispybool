import { supabase } from "../src/lib/supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {

  // ============================
  // INIT SUPABASE
  // ============================
  

  const navbarContainer = document.getElementById("navbar-container");

  try {
    // ============================
    // LOAD NAVBAR
    // ============================
    const response = await fetch("dashboard-nav.html");
    const html = await response.text();

    navbarContainer.innerHTML = html;

    // ============================
    // ELEMENTS (AFTER LOAD)
    // ============================
    const hamburger = document.getElementById("hamburger");
    const navLinks = document.getElementById("navLinks");
    const links = document.querySelectorAll(".nav-links a");

    const navLogin = document.getElementById("nav-login");
    const navSignup = document.getElementById("nav-signup");
    const navLogout = document.getElementById("nav-logout");
    const logoutBtn = document.getElementById("logoutBtn");

    // ============================
    // ACTIVE LINK
    // ============================
    const currentPage = window.location.pathname.split("/").pop();

    links.forEach(link => {
      if (link.getAttribute("href") === currentPage) {
        link.classList.add("active");
      }
    });

    // ============================
    // HAMBURGER TOGGLE
    // ============================
    if (hamburger && navLinks) {
      hamburger.addEventListener("click", () => {
        navLinks.classList.toggle("active");
        hamburger.classList.toggle("active");

        const expanded = hamburger.getAttribute("aria-expanded") === "true";
        hamburger.setAttribute("aria-expanded", !expanded);
      });
    }

    // Close menu when link is clicked (mobile UX)
    links.forEach(link => {
      link.addEventListener("click", () => {
        if (navLinks && hamburger) {
          navLinks.classList.remove("active");
          hamburger.classList.remove("active");
          hamburger.setAttribute("aria-expanded", "false");
        }
      });
    });

    // ============================
    // AUTH STATE CHECK
    // ============================
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      // USER LOGGED IN
      if (navLogin) navLogin.style.display = "none";
      if (navSignup) navSignup.style.display = "none";
      if (navLogout) navLogout.style.display = "inline-block";
    } else {
      // USER NOT LOGGED IN
      if (navLogin) navLogin.style.display = "inline-block";
      if (navSignup) navSignup.style.display = "inline-block";
      if (navLogout) navLogout.style.display = "none";
    }

    // ============================
    // LOGOUT
    // ============================
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        const { error } = await supabase.auth.signOut();

        if (error) {
          console.error("Logout error:", error.message);
          return;
        }

        localStorage.removeItem("supabase_session");

        window.location.href = "login.html";
      });
    }

  } catch (error) {
    console.error("Navbar Error:", error);
  }
});