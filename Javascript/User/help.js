// Dynamically load HTML component partials
async function loadHelpComponent(url, id) {
  try {
    const res = await fetch(url);
    if (res.ok) {
      const container = document.getElementById(id);
      if (container) {
        container.innerHTML = await res.text();
        if (id === 'navbar-container' && typeof initSkyFlowPage === 'function') {
          initSkyFlowPage('help');
        }
      }
    }
  } catch (err) {
    console.error(`Error loading help component ${url}:`, err);
  }
}

// Help Center Page Initialization
async function initHelpPage() {
  await Promise.all([
    loadHelpComponent('../globalcomp/navbar.html', 'navbar-container'),
    loadHelpComponent('../globalcomp/footer.html', 'footer-container')
  ]);

  if (typeof initSkyFlowPage === 'function') {
    initSkyFlowPage('help');
  }
}

// Support Desk Form Handler
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initHelpPage();
    setupHelpFormHandler();
  });
} else {
  initHelpPage();
  setupHelpFormHandler();
}
