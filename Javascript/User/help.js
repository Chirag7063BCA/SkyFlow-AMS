/* SkyFlow AMS - Help Center Script */
async function loadComponent(url, id) {
  try {
    const res = await fetch(url);
    if (res.ok) document.getElementById(id).innerHTML = await res.text();
  } catch (e) { console.error(e); }
}

async function initHelpPage() {
  await loadComponent('../globalcomp/navbar.html', 'navbar-container');
  await loadComponent('../globalcomp/footer.html', 'footer-container');
  if (typeof updateNavbarUI === 'function') updateNavbarUI();

  const logo = document.querySelector('.navbar-logo');
  if (logo) logo.href = '../index.html';
  const logoImg = document.getElementById('navbarLogoImg');
  if (logoImg) logoImg.src = '../../../images/navbar logo.gif';

  const links = { '#hero': '../index.html#hero', '#flights': '../index.html#flights', 'mybookings/bookings.html': '../mybookings/bookings.html', 'help/help.html': '#' };
  Object.entries(links).forEach(([sel, href]) => {
    const el = document.querySelector(`.nav-link[href="${sel}"]`);
    if (el) { el.href = href; el.classList.toggle('active', href === '#'); }
  });

  ensureAuthDrawer();
  handleScrollState();
}

function handleScrollState() {
  const header = document.querySelector('.site-header');
  if (header) {
    header.classList.toggle('scrolled', window.scrollY > window.innerHeight - 80);
  }
}

function ensureAuthDrawer() {
  if (document.getElementById('signupDrawer')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div id="signupDrawer" class="signup-drawer">
      <div id="drawerOverlay" class="drawer-overlay"></div>
      <div class="drawer-panel">
        <div class="drawer-header">
          <div class="drawer-brand"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 15.5L11.5 3l-1.8 8.2L21 9.5 8.5 21l2.3-8.5L3 15.5Z" fill="#2563eb"/></svg><h2 id="drawerTitle">Welcome Back</h2></div>
          <button type="button" id="closeDrawerBtn" class="close-btn">&times;</button>
        </div>
        <div class="auth-tabs">
          <button type="button" id="signinTab" class="tab-btn active" onclick="switchTab('signin')">Sign In</button>
          <button type="button" id="signupTab" class="tab-btn" onclick="switchTab('signup')">Sign Up</button>
        </div>
        <form id="signinForm" class="auth-form">
          <div class="form-group"><label>Email Address</label><input type="email" id="signinEmail" placeholder="name@example.com" required></div>
          <div class="form-group"><label>Password</label><input type="password" id="signinPassword" placeholder="••••••••" required></div>
          <button type="submit" class="submit-btn">Sign In</button>
        </form>
        <form id="signupForm" class="auth-form" style="display: none;">
          <div class="form-group"><label>Full Name</label><input type="text" id="fullName" placeholder="John Doe" required></div>
          <div class="form-group"><label>Email Address</label><input type="email" id="signupEmail" placeholder="name@example.com" required></div>
          <div class="form-group"><label>Password</label><input type="password" id="signupPassword" placeholder="At least 6 characters" required minlength="6"></div>
          <button type="submit" class="submit-btn">Create Account</button>
        </form>
        <div class="divider"><span>OR</span></div>
        <button type="button" class="google-btn" onclick="handleGoogleLogin()">
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/></svg>
          <span>Continue with Google</span>
        </button>
      </div>
    </div>`);
}

document.addEventListener('DOMContentLoaded', () => {
  initHelpPage();
  window.addEventListener('scroll', handleScrollState);

  const form = document.getElementById('helpForm');
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = document.getElementById('submitBtn');
      btn.disabled = true; btn.textContent = 'Sending...';
      try {
        await fetch('https://formsubmit.co/ajax/contact.webdevit@gmail.com', { method: 'POST', body: new FormData(this), headers: { 'Accept': 'application/json' } });
      } catch (err) {}
      btn.textContent = 'Form Submitted ✓';
      btn.style.backgroundColor = '#10b981';
      this.reset();
    });
  }
});
