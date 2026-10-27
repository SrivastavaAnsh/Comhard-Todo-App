/**
 * Comhard TaskFlow - Auth Page Controller
 * Handles sign-in, sign-up, magic-link, and password-reset UI flows.
 * On successful auth → redirects to index.html (the main app).
 */

import {
  signInWithEmail,
  signUpWithEmail,
  signInWithMagicLink,
  resetPassword,
  getSession,
  onAuthStateChange,
} from "./auth.js";
import * as sb from "./supabase.js";
const isSupabaseConfigured = sb.isSupabaseConfigured ?? Boolean(sb.supabase);

// ---- Theme ----
const THEME_KEY = "comhard_theme_v1";
let currentTheme = localStorage.getItem(THEME_KEY) || "dark";
applyTheme(currentTheme);

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const btn = document.getElementById("auth-theme-toggle");
  if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
}

document.getElementById("auth-theme-toggle")?.addEventListener("click", () => {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, currentTheme);
  applyTheme(currentTheme);
});

// Check if Supabase credentials are configured
if (!isSupabaseConfigured) {
  const signinMsg = document.getElementById("signin-msg");
  if (signinMsg) {
    signinMsg.className = "auth-message error";
    signinMsg.textContent = "Supabase environment variables not configured. Copy .env.example to .env with your credentials and restart Vite.";
  }
}

// ---- Session guard: if already logged in, go to app ----
(async () => {
  try {
    const session = await getSession();
    if (session) {
      window.location.href = "/";
    }
  } catch (_) {
    // Ignore — env variables may not be set yet
  }
})();

// Also listen for auth state changes (e.g. magic link redirect)
onAuthStateChange((event, session) => {
  if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
    window.location.href = "/";
  }
});

// ---- Panel Management ----
const PANELS = ["signin", "signup", "magic", "forgot"];

function showPanel(name) {
  PANELS.forEach((p) => {
    const panel = document.getElementById(`panel-${p}`);
    if (panel) panel.classList.toggle("active", p === name);
  });
}

function showTabsSection(visible) {
  document.querySelector(".auth-tabs").style.display = visible ? "flex" : "none";
}

// Tab buttons
document.getElementById("tab-signin")?.addEventListener("click", () => {
  setActiveTab("signin");
  showPanel("signin");
});
document.getElementById("tab-signup")?.addEventListener("click", () => {
  setActiveTab("signup");
  showPanel("signup");
});

function setActiveTab(name) {
  document.querySelectorAll(".auth-tab-btn").forEach((b) => {
    b.classList.toggle("active", b.id === `tab-${name}`);
    b.setAttribute("aria-selected", b.id === `tab-${name}` ? "true" : "false");
  });
}

// Special sub-panels (no tab bar)
document.getElementById("btn-magic-link")?.addEventListener("click", () => {
  showTabsSection(false);
  showPanel("magic");
  const emailEl = document.getElementById("signin-email");
  const magicEl = document.getElementById("magic-email");
  if (emailEl && magicEl) magicEl.value = emailEl.value;
});

document.getElementById("btn-back-from-magic")?.addEventListener("click", () => {
  showTabsSection(true);
  showPanel("signin");
  setActiveTab("signin");
});

document.getElementById("btn-forgot-password")?.addEventListener("click", () => {
  showTabsSection(false);
  showPanel("forgot");
  const emailEl = document.getElementById("signin-email");
  const forgotEl = document.getElementById("forgot-email");
  if (emailEl && forgotEl) forgotEl.value = emailEl.value;
});

document.getElementById("btn-back-from-forgot")?.addEventListener("click", () => {
  showTabsSection(true);
  showPanel("signin");
  setActiveTab("signin");
});

// ---- Message Display ----
function showMsg(id, text, type = "error") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = `auth-message visible is-${type}`;
}

function clearMsg(id) {
  const el = document.getElementById(id);
  if (el) {
    el.className = "auth-message";
    el.textContent = "";
  }
}

// ---- Loading State ----
function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.classList.toggle("is-loading", loading);
  btn.disabled = loading;
}

// ---- Sign In ----
document.getElementById("form-signin")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMsg("signin-msg");

  const email = document.getElementById("signin-email").value.trim();
  const password = document.getElementById("signin-password").value;

  if (!email || !password) {
    showMsg("signin-msg", "Please enter your email and password.", "error");
    return;
  }

  setLoading("btn-signin", true);
  try {
    await signInWithEmail(email, password);
    // onAuthStateChange will redirect — but fallback:
    window.location.href = "/";
  } catch (err) {
    showMsg("signin-msg", err.message || "Sign in failed. Please try again.", "error");
  } finally {
    setLoading("btn-signin", false);
  }
});

// ---- Sign Up ----
document.getElementById("form-signup")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMsg("signup-msg");

  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const confirm = document.getElementById("signup-password-confirm").value;

  if (!email) {
    showMsg("signup-msg", "Please enter your email address.", "error");
    return;
  }
  if (password.length < 6) {
    showMsg("signup-msg", "Password must be at least 6 characters.", "error");
    return;
  }
  if (password !== confirm) {
    showMsg("signup-msg", "Passwords do not match.", "error");
    return;
  }

  setLoading("btn-signup", true);
  try {
    const data = await signUpWithEmail(email, password);
    if (data?.session) {
      window.location.href = "/";
      return;
    }

    // Try signing in immediately (works if email confirmations are disabled or auto-confirmed)
    try {
      const signInRes = await signInWithEmail(email, password);
      if (signInRes?.session) {
        window.location.href = "/";
        return;
      }
    } catch (_) {
      // Email confirmation required by Supabase project settings
    }

    showMsg(
      "signup-msg",
      "Account created! Please check your email inbox to verify your account, or sign in below.",
      "success"
    );

    // Pre-fill sign-in email and switch to Sign In after 2s
    const signInEmailInput = document.getElementById("signin-email");
    if (signInEmailInput) signInEmailInput.value = email;
    setTimeout(() => {
      setActiveTab("signin");
      showPanel("signin");
      showMsg("signin-msg", "Account created! Enter your password to sign in (or confirm via email if required).", "info");
    }, 2000);

  } catch (err) {
    showMsg("signup-msg", err.message || "Sign up failed. Please try again.", "error");
  } finally {
    setLoading("btn-signup", false);
  }
});

// ---- Magic Link ----
document.getElementById("form-magic")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMsg("magic-msg");

  const email = document.getElementById("magic-email").value.trim();
  if (!email) {
    showMsg("magic-msg", "Please enter your email address.", "error");
    return;
  }

  setLoading("btn-send-magic", true);
  try {
    await signInWithMagicLink(email);
    showMsg(
      "magic-msg",
      `✉️ Magic link sent to ${email}. Check your inbox and click the link to sign in.`,
      "success"
    );
  } catch (err) {
    showMsg("magic-msg", err.message || "Failed to send magic link.", "error");
  } finally {
    setLoading("btn-send-magic", false);
  }
});

// ---- Forgot Password ----
document.getElementById("form-forgot")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMsg("forgot-msg");

  const email = document.getElementById("forgot-email").value.trim();
  if (!email) {
    showMsg("forgot-msg", "Please enter your email address.", "error");
    return;
  }

  setLoading("btn-reset-password", true);
  try {
    await resetPassword(email);
    showMsg(
      "forgot-msg",
      `✅ Password reset link sent to ${email}. Check your email.`,
      "success"
    );
  } catch (err) {
    showMsg("forgot-msg", err.message || "Failed to send reset email.", "error");
  } finally {
    setLoading("btn-reset-password", false);
  }
});

// ---- Password Strength ----
document.getElementById("signup-password")?.addEventListener("input", (e) => {
  const val = e.target.value;
  const bar = document.getElementById("password-strength-bar");
  const label = document.getElementById("password-strength-label");
  if (!bar || !label) return;

  bar.className = "password-strength-bar";
  if (!val) { label.textContent = ""; return; }

  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;

  const levels = [
    { cls: "strength-weak",   text: "Weak" },
    { cls: "strength-fair",   text: "Fair" },
    { cls: "strength-good",   text: "Good" },
    { cls: "strength-strong", text: "Strong" },
  ];
  const lvl = levels[Math.max(0, score - 1)];
  bar.classList.add(lvl.cls);
  label.textContent = `Password strength: ${lvl.text}`;
});
