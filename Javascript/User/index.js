/* SkyFlow AMS - Index Page Initialization & Dynamic Component Router */

function setupDestinationSlider() {
  const grid = document.getElementById('destinationGrid');
  const prevBtn = document.getElementById('destPrevBtn');
  const nextBtn = document.getElementById('destNextBtn');
  const wrapper = document.querySelector('.destination-slider-wrapper');

  if (!grid || !prevBtn || !nextBtn || !wrapper) return;

  const originalCards = Array.from(grid.querySelectorAll('.destination-card:not(.is-clone)'));
  if (originalCards.length < 3) return;

  // Remove any previously created clones
  grid.querySelectorAll('.is-clone').forEach(c => c.remove());

  // Clone first 3 cards and append to the end for seamless forward loop back to Sahara Dawn
  originalCards.slice(0, 3).forEach(card => {
    const clone = card.cloneNode(true);
    clone.classList.add('is-clone');
    grid.appendChild(clone);
  });

  const allCards = Array.from(grid.querySelectorAll('.destination-card'));
  let currentIndex = 0;
  let isAnimating = false;

  const getStepCount = () => {
    if (window.innerWidth <= 640) return 1;
    if (window.innerWidth <= 992) return 2;
    return 3;
  };

  const getStepPx = () => {
    const firstCard = allCards[0];
    const secondCard = allCards[1];
    if (firstCard && secondCard) {
      return secondCard.offsetLeft - firstCard.offsetLeft;
    }
    return firstCard ? firstCard.offsetWidth + 24 : 320;
  };

  const updateSlide = (animated = true) => {
    if (!animated) {
      grid.style.transition = 'none';
    } else {
      grid.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
    }

    const stepPx = getStepPx();
    const shiftPx = currentIndex * stepPx;
    grid.style.transform = `translateX(-${shiftPx}px)`;
  };

  const goToNext = () => {
    if (isAnimating) return;
    isAnimating = true;

    const step = getStepCount();
    currentIndex += step;
    updateSlide(true);

    // When reaching cloned Sahara Dawn at the end, seamlessly snap back to real Sahara Dawn at index 0
    if (currentIndex >= 6) {
      setTimeout(() => {
        currentIndex = 0;
        updateSlide(false);
        grid.offsetHeight; // force reflow
        isAnimating = false;
      }, 520);
    } else {
      setTimeout(() => {
        isAnimating = false;
      }, 520);
    }
  };

  const goToPrev = () => {
    if (isAnimating) return;
    isAnimating = true;

    const step = getStepCount();
    if (currentIndex <= 0) {
      // Jump instantly to cloned Sahara Dawn position, then smoothly slide left
      currentIndex = 6;
      updateSlide(false);
      grid.offsetHeight; // force reflow

      setTimeout(() => {
        currentIndex = 6 - step;
        updateSlide(true);
        setTimeout(() => {
          isAnimating = false;
        }, 520);
      }, 20);
    } else {
      currentIndex = Math.max(0, currentIndex - step);
      updateSlide(true);
      setTimeout(() => {
        isAnimating = false;
      }, 520);
    }
  };

  nextBtn.onclick = (e) => {
    e.preventDefault();
    goToNext();
  };

  prevBtn.onclick = (e) => {
    e.preventDefault();
    goToPrev();
  };

  // Touch Swipe Support (Mobile & Tablet)
  let startX = 0;
  let currentX = 0;
  let isSwiping = false;

  wrapper.addEventListener('touchstart', (e) => {
    if (!e.touches.length || isAnimating) return;
    startX = e.touches[0].clientX;
    currentX = startX;
    isSwiping = true;
  }, { passive: true });

  wrapper.addEventListener('touchmove', (e) => {
    if (!isSwiping || !e.touches.length) return;
    currentX = e.touches[0].clientX;
  }, { passive: true });

  wrapper.addEventListener('touchend', () => {
    if (!isSwiping) return;
    isSwiping = false;
    const diffX = currentX - startX;
    if (diffX < -35) {
      goToNext();
    } else if (diffX > 35) {
      goToPrev();
    }
  });

  // Mouse Drag Support (Desktop)
  let isMouseDown = false;
  wrapper.addEventListener('mousedown', (e) => {
    if (isAnimating) return;
    isMouseDown = true;
    startX = e.clientX;
    currentX = startX;
    wrapper.style.cursor = 'grabbing';
  });

  wrapper.addEventListener('mousemove', (e) => {
    if (!isMouseDown) return;
    currentX = e.clientX;
  });

  wrapper.addEventListener('mouseup', (e) => {
    if (!isMouseDown) return;
    isMouseDown = false;
    wrapper.style.cursor = 'grab';
    const diffX = currentX - startX;
    if (diffX < -35) {
      goToNext();
    } else if (diffX > 35) {
      goToPrev();
    }
  });

  wrapper.addEventListener('mouseleave', () => {
    if (isMouseDown) {
      isMouseDown = false;
      wrapper.style.cursor = 'grab';
    }
  });

  window.addEventListener('resize', () => updateSlide(false));

  updateSlide(false);
}

function handleRouteView() {
  const hash = window.location.hash;
  const heroView = document.getElementById('hero-view');
  const flightsView = document.getElementById('flights-view');

  if (hash === '#flights') {
    if (heroView) heroView.style.display = 'none';
    if (flightsView) flightsView.style.display = 'block';
    if (typeof initSkyFlowPage === 'function') initSkyFlowPage('flights');
    if (typeof window.triggerFlightsRefresh === 'function') {
      window.triggerFlightsRefresh();
    }
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

function initApp() {
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  // Initialize destination cards slider with cloned infinite loop
  setupDestinationSlider();

  // Handle initial view based on route hash
  handleRouteView();

  // Listen for hash changes
  window.addEventListener('hashchange', handleRouteView);

  // Trigger flight list refresh if starting on #flights route
  if (window.location.hash === '#flights' && typeof window.triggerFlightsRefresh === 'function') {
    window.triggerFlightsRefresh();
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
