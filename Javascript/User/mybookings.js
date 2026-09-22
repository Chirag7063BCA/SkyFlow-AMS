/* ==========================================================================
   SkyFlow AMS - My Bookings Controller
   File: Javascript/User/mybookings.js
   Description: Handles component loading, category tab filtering, stat card clicks,
                and empty state rendering for the user's bookings page.
   ========================================================================== */

async function loadBookingComponent(url, id) {
  try {
    const res = await fetch(url);
    if (res.ok) {
      const container = document.getElementById(id);
      if (container) container.innerHTML = await res.text();
    }
  } catch (err) {
    console.error(`Error loading component ${url}:`, err);
  }
}

function setupBookingFilters() {
  const filterBtns = document.querySelectorAll('.mb-filter');
  const ticketCards = document.querySelectorAll('.mb-ticket-card');
  const statCards = document.querySelectorAll('.mb-stat-card');
  const container = document.getElementById('mbTicketsContainer');

  function applyFilter(targetFilter) {
    filterBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === targetFilter);
    });

    let visibleCount = 0;
    ticketCards.forEach(card => {
      const match = targetFilter === 'all' || card.dataset.status === targetFilter;
      card.style.display = match ? 'flex' : 'none';
      card.style.opacity = match ? '1' : '0';
      if (match) visibleCount++;
    });

    let emptyEl = document.getElementById('mb-empty-state');
    if (visibleCount === 0) {
      if (!emptyEl) {
        emptyEl = document.createElement('div');
        emptyEl.id = 'mb-empty-state';
        emptyEl.className = 'mb-empty-state';
        emptyEl.innerHTML = `
          <div class="mb-empty-icon">📭</div>
          <h3 style="text-transform: capitalize;">No ${targetFilter} bookings</h3>
          <p>You currently do not have any bookings listed under this category.</p>`;
        if (container) container.appendChild(emptyEl);
      } else {
        emptyEl.style.display = 'block';
        const h3 = emptyEl.querySelector('h3');
        if (h3) h3.textContent = `No ${targetFilter} bookings`;
      }
    } else if (emptyEl) {
      emptyEl.style.display = 'none';
    }
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.filter) applyFilter(btn.dataset.filter);
    });
  });

  statCards.forEach(card => {
    card.addEventListener('click', () => {
      if (card.dataset.filter) applyFilter(card.dataset.filter);
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([
    loadBookingComponent('../globalcomp/navbar.html', 'navbar-container'),
    loadBookingComponent('../globalcomp/footer.html', 'footer-container')
  ]);
  setupBookingFilters();
  if (typeof initSkyFlowPage === 'function') {
    initSkyFlowPage('bookings');
  } else if (typeof updateNavbarUI === 'function') {
    updateNavbarUI();
  }
});
