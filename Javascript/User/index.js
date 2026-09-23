/* SkyFlow AMS - Index Page Initialization & Dynamic Router */

async function loadComponent(url, id) {
  try {
    const res = await fetch(url);
    if (!res.ok) return;
    const container = document.getElementById(id);
    if (container) container.innerHTML = await res.text();
  } catch (e) {
    console.warn(`[SkyFlow] Failed loading component ${url}:`, e);
  }
}

const components = [
  ['globalcomp/navbar.html', 'navbar-container'],
  ['Landingcomp/hero.html', 'hero-container'],
  ['Landingcomp/destination.html', 'destination-container'],
  ['Landingcomp/deals.html', 'deals-container'],
  ['Landingcomp/wanderlust.html', 'wanderlust-container'],
  ['flightscomp/flights.html', 'flights-container'],
  ['globalcomp/footer.html', 'footer-container']
];

window.componentsLoadedPromise = Promise.all(
  components.map(([url, id]) => loadComponent(url, id))
).catch(() => {});

function setupDestinationSlider() {
  const grid = document.getElementById('destinationGrid');
  const prevBtn = document.getElementById('destPrevBtn');
  const nextBtn = document.getElementById('destNextBtn');
  const wrapper = document.querySelector('.destination-slider-wrapper');

  if (!grid || !prevBtn || !nextBtn || !wrapper) return;

  const originalCards = Array.from(grid.querySelectorAll('.destination-card:not(.is-clone)'));
  if (originalCards.length < 3) return;

  grid.querySelectorAll('.is-clone').forEach(c => c.remove());
  originalCards.slice(0, 3).forEach(card => {
    const clone = card.cloneNode(true);
    clone.classList.add('is-clone');
    grid.appendChild(clone);
  });

  const allCards = Array.from(grid.querySelectorAll('.destination-card'));
  let currentIndex = 0;
  let isAnimating = false;

  const getStepCount = () => (window.innerWidth <= 640 ? 1 : window.innerWidth <= 992 ? 2 : 3);
  const getStepPx = () => {
    const first = allCards[0], second = allCards[1];
    return (first && second) ? (second.offsetLeft - first.offsetLeft) : (first ? first.offsetWidth + 24 : 320);
  };

  const updateSlide = (animated = true) => {
    grid.style.transition = animated ? 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)' : 'none';
    grid.style.transform = `translateX(-${currentIndex * getStepPx()}px)`;
  };

  const goToNext = () => {
    if (isAnimating) return;
    isAnimating = true;
    currentIndex += getStepCount();
    updateSlide(true);

    if (currentIndex >= 6) {
      setTimeout(() => {
        currentIndex = 0;
        updateSlide(false);
        grid.offsetHeight;
        isAnimating = false;
      }, 520);
    } else {
      setTimeout(() => { isAnimating = false; }, 520);
    }
  };

  const goToPrev = () => {
    if (isAnimating) return;
    isAnimating = true;
    const step = getStepCount();
    if (currentIndex <= 0) {
      currentIndex = 6;
      updateSlide(false);
      grid.offsetHeight;
      setTimeout(() => {
        currentIndex = 6 - step;
        updateSlide(true);
        setTimeout(() => { isAnimating = false; }, 520);
      }, 20);
    } else {
      currentIndex = Math.max(0, currentIndex - step);
      updateSlide(true);
      setTimeout(() => { isAnimating = false; }, 520);
    }
  };

  nextBtn.onclick = (e) => { e.preventDefault(); goToNext(); };
  prevBtn.onclick = (e) => { e.preventDefault(); goToPrev(); };

  let startX = 0, isDragging = false;
  const onStart = (x) => { if (!isAnimating) { startX = x; isDragging = true; } };
  const onEnd = (x) => {
    if (!isDragging) return;
    isDragging = false;
    const diff = x - startX;
    if (diff < -35) goToNext();
    else if (diff > 35) goToPrev();
  };

  wrapper.addEventListener('touchstart', (e) => e.touches.length && onStart(e.touches[0].clientX), { passive: true });
  wrapper.addEventListener('touchend', (e) => e.changedTouches.length && onEnd(e.changedTouches[0].clientX));
  wrapper.addEventListener('mousedown', (e) => { onStart(e.clientX); wrapper.style.cursor = 'grabbing'; });
  wrapper.addEventListener('mouseup', (e) => { wrapper.style.cursor = 'grab'; onEnd(e.clientX); });
  wrapper.addEventListener('mouseleave', () => { if (isDragging) { isDragging = false; wrapper.style.cursor = 'grab'; } });
  window.addEventListener('resize', () => updateSlide(false));

  updateSlide(false);
}

function handleRouteView() {
  const isFlights = window.location.hash === '#flights';
  const heroView = document.getElementById('hero-view');
  const flightsView = document.getElementById('flights-view');

  if (heroView) heroView.style.display = isFlights ? 'none' : 'block';
  if (flightsView) flightsView.style.display = isFlights ? 'block' : 'none';

  if (typeof initSkyFlowPage === 'function') {
    initSkyFlowPage(isFlights ? 'flights' : 'home');
  }

  if (isFlights && typeof window.triggerFlightsRefresh === 'function') {
    window.triggerFlightsRefresh();
  }

  const navToggle = document.getElementById('nav-toggle');
  if (navToggle) navToggle.checked = false;

  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}

document.addEventListener('click', (e) => {
  if (e.target.closest('a[href="#flights"]')) {
    if (window.location.hash === '#flights') handleRouteView();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }
});

function ensureTestimonialLoop() {
  const track = document.querySelector('.testimonial-track');
  if (track) {
    track.style.animation = 'none';
    track.offsetHeight;
    track.style.animation = 'slideTestimonials 16s cubic-bezier(0.25, 1, 0.5, 1) infinite';
  }
}

async function initApp() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  await window.componentsLoadedPromise;
  ensureTestimonialLoop();
  setupDestinationSlider();

  if (typeof initSkyFlowPage === 'function') {
    initSkyFlowPage(window.location.hash === '#flights' ? 'flights' : 'home');
  }

  if (window.location.hash === '#flights' && typeof window.triggerFlightsRefresh === 'function') {
    window.triggerFlightsRefresh();
  }

  handleRouteView();
  window.addEventListener('hashchange', handleRouteView);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
