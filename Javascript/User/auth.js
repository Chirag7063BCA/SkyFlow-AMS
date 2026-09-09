/* SkyFlow AMS - Shared Authentication, Navbar & Component Logic */
const GOOGLE_CLIENT_ID = "630801472891-mqjmbt925glbg0do6qd3ei9c2adsuvei.apps.googleusercontent.com";

// 1. Dynamic Injection of Auth Drawer if missing
function ensureAuthDrawer() {
  if (document.getElementById('signupDrawer')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div id="signupDrawer" class="signup-drawer">
      <div id="drawerOverlay" class="drawer-overlay"></div>
      <div class="drawer-panel">
        <div class="drawer-header">
          <div class="drawer-brand">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 15.5L11.5 3l-1.8 8.2L21 9.5 8.5 21l2.3-8.5L3 15.5Z" fill="#2563eb"/>
            </svg>
            <h2 id="drawerTitle">Welcome Back</h2>
          </div>
          <button type="button" id="closeDrawerBtn" class="close-btn">&times;</button>
        </div>
        <div class="auth-tabs">
          <button type="button" id="signinTab" class="tab-btn active" onclick="switchTab('signin')">Sign In</button>
          <button type="button" id="signupTab" class="tab-btn" onclick="switchTab('signup')">Sign Up</button>
        </div>
        <form id="signinForm" class="auth-form">
          <div class="form-group">
            <label for="signinEmail">Email Address</label>
            <input type="email" id="signinEmail" placeholder="name@example.com" required>
          </div>
          <div class="form-group">
            <label for="signinPassword">Password</label>
            <input type="password" id="signinPassword" placeholder="••••••••" required>
          </div>
          <div class="form-options">
            <label class="remember-me">
              <input type="checkbox" id="rememberMe">
              <span>Remember me</span>
            </label>
            <a href="#" class="forgot-link" onclick="alert('Password reset link sent to your email!'); return false;">Forgot password?</a>
          </div>
          <button type="submit" class="submit-btn">Sign In</button>
        </form>
        <form id="signupForm" class="auth-form" style="display: none;">
          <div class="form-group">
            <label for="fullName">Full Name</label>
            <input type="text" id="fullName" placeholder="John Doe" required>
          </div>
          <div class="form-group">
            <label for="signupEmail">Email Address</label>
            <input type="email" id="signupEmail" placeholder="name@example.com" required>
          </div>
          <div class="form-group">
            <label for="signupPassword">Password</label>
            <input type="password" id="signupPassword" placeholder="At least 6 characters" required minlength="6">
          </div>
          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <input type="password" id="confirmPassword" placeholder="Re-enter password" required minlength="6">
          </div>
          <button type="submit" class="submit-btn">Create Account</button>
        </form>
        <div class="divider"><span>OR</span></div>
        <button type="button" class="google-btn" onclick="handleGoogleLogin()">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          <span>Continue with Google</span>
        </button>
        <p id="authSwitchFooter" class="footer-text">
          Don't have an account? <a href="#" onclick="switchTab('signup'); return false;">Create account</a>
        </p>
        <div class="admin-panel-access">
          <button type="button" class="admin-access-btn" onclick="promptAdminPin()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>Admin Panel</span>
          </button>
        </div>
      </div>
    </div>`);
  bindFormListeners();
}

function promptAdminPin() {
  const pin = prompt("Enter Admin Access PIN:");
  if (pin === null) return;
  if (pin.trim() === "6969") {
    const isSubdir = window.location.pathname.includes('/help/') ||
                     window.location.pathname.includes('/mybookings/') ||
                     window.location.pathname.includes('/Track%20Flight/') ||
                     window.location.pathname.includes('/Track Flight/');
    const adminUrl = isSubdir ? '../../Admin/index.html' : '../Admin/index.html';
    window.location.href = adminUrl;
  } else {
    alert("Incorrect PIN! Access denied.");
  }
}

function bindFormListeners() {
  document.getElementById('signinForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signinEmail')?.value.trim();
    if (email) loginUser({ name: email.split('@')[0], email: email });
  });

  document.getElementById('signupForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('fullName')?.value.trim() || 'Traveler';
    const email = document.getElementById('signupEmail')?.value.trim() || 'user@example.com';
    loginUser({ name: name, email: email });
  });
}

// 2. Drawer Controls & Tab Switcher
function openDrawer(tab = 'signin') {
  ensureAuthDrawer();
  const drawer = document.getElementById('signupDrawer');
  if (drawer) {
    drawer.classList.add('active');
    switchTab(tab);
  }
}

function closeDrawer() {
  const drawer = document.getElementById('signupDrawer');
  if (drawer) {
    drawer.classList.remove('active');
  }
}

function switchTab(mode) {
  const isSignIn = mode === 'signin';
  document.getElementById('signinTab')?.classList.toggle('active', isSignIn);
  document.getElementById('signupTab')?.classList.toggle('active', !isSignIn);

  const signinForm = document.getElementById('signinForm');
  const signupForm = document.getElementById('signupForm');
  const drawerTitle = document.getElementById('drawerTitle');

  if (signinForm) signinForm.style.display = isSignIn ? 'flex' : 'none';
  if (signupForm) signupForm.style.display = isSignIn ? 'none' : 'flex';
  if (drawerTitle) drawerTitle.textContent = isSignIn ? 'Welcome Back' : 'Create Account';
}

function ensureGoogleScript(callback) {
  if (window.google?.accounts?.oauth2) {
    if (callback) callback();
    return;
  }
  if (!document.getElementById('google-gsi-script')) {
    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => { if (callback) callback(); };
    document.head.appendChild(script);
  } else {
    let checkCount = 0;
    const interval = setInterval(() => {
      checkCount++;
      if (window.google?.accounts?.oauth2) {
        clearInterval(interval);
        if (callback) callback();
      } else if (checkCount > 30) {
        clearInterval(interval);
      }
    }, 100);
  }
}

// 3. Google OAuth 2.0 Login Handler
function handleGoogleLogin() {
  if (window.location.protocol === 'file:') {
    loginUser({ name: "Raghav Chhabra", email: "raghav.chhabra111@gmail.com" });
    return;
  }

  ensureGoogleScript(() => {
    if (window.google?.accounts?.oauth2) {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'email profile openid',
        callback: (res) => {
          if (res?.access_token) {
            fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${res.access_token}` }
            })
              .then(r => r.json())
              .then(u => loginUser({ name: u.name || u.email.split('@')[0], email: u.email, picture: u.picture }))
              .catch(() => loginUser({ name: "Raghav Chhabra", email: "raghav.chhabra111@gmail.com" }));
          }
        }
      });
      client.requestAccessToken();
    } else {
      loginUser({ name: "Raghav Chhabra", email: "raghav.chhabra111@gmail.com" });
    }
  });
}

// 4. User Session & Dynamic Navbar Profile Avatar
function loginUser(userData) {
  localStorage.setItem('skyflow_user', JSON.stringify(userData));
  updateNavbarUI();
  closeDrawer();
  window.dispatchEvent(new Event('skyflow_auth_changed'));
}

function logoutUser() {
  localStorage.removeItem('skyflow_user');
  updateNavbarUI();
  window.dispatchEvent(new Event('skyflow_auth_changed'));
}

function updateNavbarUI() {
  let user = null;
  try {
    const raw = localStorage.getItem('skyflow_user');
    if (raw && raw !== 'undefined' && raw !== 'null') {
      user = JSON.parse(raw);
    }
  } catch (e) {
    user = null;
  }

  const navActions = document.getElementById('navActions');
  if (!navActions) return;

  const isSubdir = window.location.pathname.includes('/help/') ||
                   window.location.pathname.includes('/mybookings/') ||
                   window.location.pathname.includes('/Track%20Flight/') ||
                   window.location.pathname.includes('/Track Flight/');
  const myBookingsPath = isSubdir ? '../mybookings/mybookings.html' : 'mybookings/mybookings.html';

  if (user && (user.name || user.email)) {
    const initial = (user.name && typeof user.name === 'string' && user.name.length > 0)
      ? user.name.charAt(0).toUpperCase()
      : 'U';
    const avatar = user.picture
      ? `<img src="${user.picture}" class="user-avatar-img" alt="User">`
      : `<div class="user-avatar-circle">${initial}</div>`;

    const isMyBookingsPage = window.location.pathname.includes('/mybookings/');
    const bookingsHref = isMyBookingsPage ? '#' : myBookingsPath;

    navActions.innerHTML = `
      <div class="user-profile-menu" id="userProfileMenu">
        <button type="button" class="user-avatar-btn" id="userAvatarBtn">${avatar}</button>
        <div class="user-dropdown-menu" id="userDropdownMenu">
          <div class="user-dropdown-header">
            <div class="user-dropdown-avatar">${initial}</div>
            <div class="user-dropdown-details">
              <span class="user-dropdown-name">${user.name || 'User'}</span>
              <span class="user-dropdown-email">${user.email || ''}</span>
            </div>
          </div>
          <div class="user-dropdown-divider"></div>
          <a href="${bookingsHref}" class="user-dropdown-link">My Bookings</a>
          <button type="button" class="user-dropdown-link logout-btn" id="logoutBtn">Sign Out</button>
        </div>
      </div>`;
  } else {
    navActions.innerHTML = `
      <a href="#" class="btn-signin" id="openSignupBtn" onclick="openDrawer(); return false;">
        <svg class="btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span>Sign In / Join</span>
      </a>`;
  }
}

// 5. Global Page Initializer (Navbar, Footer, Routes, Logo, Drawer)
function initSkyFlowPage(activeRoute = 'home') {
  ensureAuthDrawer();
  
  const isSubdir = window.location.pathname.includes('/help/') ||
                   window.location.pathname.includes('/mybookings/') ||
                   window.location.pathname.includes('/Track%20Flight/') ||
                   window.location.pathname.includes('/Track Flight/') ||
                   window.location.pathname.includes('/AI_Assistence/');

  // Fix logo image src
  const logoImg = document.getElementById('navbarLogoImg');
  if (logoImg) {
    logoImg.src = isSubdir ? '../../../images/navbar logo.gif' : '../../images/navbar logo.gif';
  }

  // Define route mapping for all links
  const routes = isSubdir ? {
    home:     '../index.html#home',
    flights:  '../index.html#flights',
    track:    '../Track%20Flight/trackFlight.html',
    bookings: '../mybookings/mybookings.html',
    offers:   '../AI_Assistence/AI_Assistence.html',
    ai:       '../AI_Assistence/AI_Assistence.html',
    help:     '../help/help.html'
  } : {
    home:     '#home',
    flights:  '#flights',
    track:    'Track%20Flight/trackFlight.html',
    bookings: 'mybookings/mybookings.html',
    offers:   'AI_Assistence/AI_Assistence.html',
    ai:       'AI_Assistence/AI_Assistence.html',
    help:     'help/help.html'
  };

  // Patch all navigation and logo links
  document.querySelectorAll('a[data-route]').forEach(link => {
    const route = link.dataset.route;
    if (routes[route] !== undefined) {
      link.href = routes[route];
    }
  });

  const logoLink = document.querySelector('.navbar-logo');
  if (logoLink) {
    logoLink.href = isSubdir ? '../index.html' : 'index.html';
  }

  // Activate current route in navbar
  document.querySelectorAll('.nav-link').forEach(l => {
    const route = l.dataset.route;
    l.classList.toggle('active', route === activeRoute);
  });

  // Update sign-in / user profile state
  updateNavbarUI();
}

// 6. Global Navbar Scroll Transition
function handleGlobalNavbarScroll() {
  const header = document.querySelector('.site-header');
  if (header) {
    header.classList.toggle('scrolled', window.scrollY > (window.innerHeight - 80));
  }
}
window.addEventListener('scroll', handleGlobalNavbarScroll);

// 7. Global Event Delegation
document.addEventListener('click', (e) => {
  if (e.target.closest('.btn-signin') || e.target.closest('#openSignupBtn')) {
    e.preventDefault();
    openDrawer('signin');
  }

  if (e.target.closest('#closeDrawerBtn') || e.target.closest('.close-btn') || e.target.closest('#drawerOverlay')) {
    e.preventDefault();
    closeDrawer();
  }

  if (e.target.closest('#userAvatarBtn')) {
    e.preventDefault();
    document.getElementById('userDropdownMenu')?.classList.toggle('active');
  } else if (!e.target.closest('#userProfileMenu')) {
    document.getElementById('userDropdownMenu')?.classList.remove('active');
  }

  if (e.target.closest('#logoutBtn')) {
    e.preventDefault();
    logoutUser();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeDrawer();
});

document.addEventListener('DOMContentLoaded', () => {
  handleGlobalNavbarScroll();
  ensureAuthDrawer();
  updateNavbarUI();
});
