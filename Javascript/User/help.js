/* ==========================================================================
   SkyFlow AMS - Help Center Script
   File: Javascript/User/help.js
   Description: Handles dynamic component loading for Help Center, scroll header
                transitions, and AJAX Support Desk query submission.
   ========================================================================== */

/**
 * 1. Component Loader Utility
 * Dynamically loads HTML header & footer partials into the page containers.
 */
async function loadHelpComponent(url, id) {
  try {
    const res = await fetch(url);
    if (res.ok) {
      const container = document.getElementById(id);
      if (container) container.innerHTML = await res.text();
    }
  } catch (err) {
    console.error(`Error loading help component ${url}:`, err);
  }
}

/**
 * 2. Help Center Page Initialization
 * Fetches Navbar & Footer, activates current route in navigation, and syncs auth state.
 */
async function initHelpPage() {
  await Promise.all([
    loadHelpComponent('../globalcomp/navbar.html', 'navbar-container'),
    loadHelpComponent('../globalcomp/footer.html', 'footer-container')
  ]);

  // Trigger global page initialization from auth.js to bind nav routes & user session
  if (typeof initSkyFlowPage === 'function') {
    initSkyFlowPage('help');
  }
}

/**
 * 3. Support Desk Form Handler (FormSubmit AJAX Integration)
 * Processes user support queries asynchronously with loading state feedback.
 */
function setupHelpFormHandler() {
  const form = document.getElementById('helpForm');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    if (!btn) return;

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
      const response = await fetch('https://formsubmit.co/ajax/9f3ce484957278cedbeac133e0580292', {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });
      const result = await response.json();

      if (response.ok && (result.success === 'true' || result.success === true)) {
        btn.textContent = 'Form Submitted ✓';
        btn.style.backgroundColor = '#10b981';
        form.reset();
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = originalText;
          btn.style.backgroundColor = '';
        }, 4000);
      } else {
        alert(result.message || 'Submission failed. Please ensure the site is served via HTTP/HTTPS server.');
        btn.disabled = false;
        btn.textContent = originalText;
      }
    } catch (err) {
      alert('Network error while submitting support query. Please try again.');
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

/* 4. Execute Page Setup on DOM Ready */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initHelpPage();
    setupHelpFormHandler();
  });
} else {
  initHelpPage();
  setupHelpFormHandler();
}
