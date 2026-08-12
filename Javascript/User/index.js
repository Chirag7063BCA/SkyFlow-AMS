/* SkyFlow AMS - Index Page Initialization & Dynamic Component Router */

async function loadComponent(url, containerId) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load ${url}`);
    const html = await response.text();
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = html;
  } catch (error) {
    console.error('Error loading component:', error);
  }
}

function handleRouteView() {
  const hash = window.location.hash;
  const heroView = document.getElementById('hero-view');
  const flightsView = document.getElementById('flights-view');

  if (hash === '#flights') {
    if (heroView) heroView.style.display = 'none';
    if (flightsView) flightsView.style.display = 'block';
    if (typeof initSkyFlowPage === 'function') initSkyFlowPage('flights');
  } else {
    if (heroView) heroView.style.display = 'block';
    if (flightsView) flightsView.style.display = 'none';
    if (typeof initSkyFlowPage === 'function') initSkyFlowPage('home');
  }

  const navToggle = document.getElementById('nav-toggle');
  if (navToggle) {
    navToggle.checked = false;
  }
}

async function initApp() {
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  // Load global components
  await loadComponent('globalcomp/navbar.html', 'navbar-container');
  await loadComponent('globalcomp/footer.html', 'footer-container');

  // Load main page contents (hero and flights sections)
  try {
    const heroResponse = await fetch('Landingcomp/hero.html');
    if (!heroResponse.ok) throw new Error('Failed to load hero section');
    const heroHtml = await heroResponse.text();

    const flightsResponse = await fetch('flightscomp/flights.html');
    if (!flightsResponse.ok) throw new Error('Failed to load flights section');
    const flightsHtml = await flightsResponse.text();

    const appContent = document.getElementById('app-content');
    if (appContent) {
      appContent.innerHTML = `
        <div id="hero-view">${heroHtml}</div>
        <div id="flights-view" style="display: none;">${flightsHtml}</div>
      `;
    }

    // Handle initial view based on route hash
    handleRouteView();

    // Listen for hash changes
    window.addEventListener('hashchange', handleRouteView);

    // Load flights script to wire up search filters and render flights
    if (!document.getElementById('flights-script')) {
      const script = document.createElement('script');
      script.id = 'flights-script';
      script.src = '../../Javascript/User/flights.js';
      document.body.appendChild(script);
    }
  } catch (error) {
    console.error('Error loading main page content:', error);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
