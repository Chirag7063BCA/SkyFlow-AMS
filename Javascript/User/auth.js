/* SkyFlow AMS - Authentication & Google OAuth Logic */
const GOOGLE_CLIENT_ID = "630801472891-mqjmbt925glbg0do6qd3ei9c2adsuvei.apps.googleusercontent.com";

// 1. Drawer Controls & Tab Switcher
function openDrawer(tab = 'signin') {
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

// 2. Google OAuth 2.0 Login Handler
function handleGoogleLogin() {
  if (window.location.protocol === 'file:') {
    loginUser({ name: "Raghav Chhabra", email: "raghav.chhabra111@gmail.com" });
    return;
  }

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
            .then(u => loginUser({ name: u.name || u.email.split('@')[0], email: u.email, picture: u.picture }));
        }
      }
    });
    client.requestAccessToken();
  }
}

// 3. User Session & Dynamic Navbar Profile Avatar
function loginUser(userData) {
  localStorage.setItem('skyflow_user', JSON.stringify(userData));
  updateNavbarUI();
  closeDrawer();
}

function logoutUser() {
  localStorage.removeItem('skyflow_user');
  updateNavbarUI();
}

function updateNavbarUI() {
  const user = JSON.parse(localStorage.getItem('skyflow_user') || 'null');
  const navActions = document.getElementById('navActions');
  if (!navActions) return;

  if (user) {
    const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
    const avatar = user.picture
      ? `<img src="${user.picture}" class="user-avatar-img" alt="User">`
      : `<div class="user-avatar-circle">${initial}</div>`;

    navActions.innerHTML = `
      <div class="user-profile-menu" id="userProfileMenu">
        <button type="button" class="user-avatar-btn" id="userAvatarBtn">${avatar}</button>
        <div class="user-dropdown-menu" id="userDropdownMenu">
          <div class="user-dropdown-header">
            <div class="user-dropdown-avatar">${initial}</div>
            <div class="user-dropdown-details">
              <span class="user-dropdown-name">${user.name}</span>
              <span class="user-dropdown-email">${user.email}</span>
            </div>
          </div>
          <div class="user-dropdown-divider"></div>
          <a href="#" class="user-dropdown-link" onclick="window.location.href='../mybookings/bookings.html'; return false;">My Bookings</a>
          <button type="button" class="user-dropdown-link logout-btn" id="logoutBtn">Sign Out</button>
        </div>
      </div>`;
  } else {
    navActions.innerHTML = `<a href="#" class="btn-signin" id="openSignupBtn"><span>Sign In / Join</span></a>`;
  }
}

// 4. Global Navbar Scroll Transition
function handleGlobalNavbarScroll() {
  const header = document.querySelector('.site-header');
  if (header) {
    header.classList.toggle('scrolled', window.scrollY > (window.innerHeight - 80));
  }
}
window.addEventListener('scroll', handleGlobalNavbarScroll);

// 5. Global Event Delegation
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
  updateNavbarUI();

  document.getElementById('signinForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signinEmail').value.trim();
    loginUser({ name: email.split('@')[0], email: email });
  });

  document.getElementById('signupForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('fullName')?.value.trim() || 'Traveler';
    const email = document.getElementById('signupEmail')?.value.trim() || 'user@example.com';
    loginUser({ name: name, email: email });
  });
});
