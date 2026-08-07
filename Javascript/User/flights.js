// ── Load data ───────────────────────────
const fetchJson = async (url, fallback) => fetch(url).then(r => r.json()).catch(() => fallback);
const loadFlights = () => fetchJson('../../Data/flights.json', []);
const loadAirports = () => fetchJson('../../Data/airports.json', []);

const POPULAR_AIRPORTS = [
  { city: 'London', name: 'Heathrow Airport', iata: 'LHR', country: 'United Kingdom' },
  { city: 'New York', name: 'John F Kennedy Intl', iata: 'JFK', country: 'United States' },
  { city: 'Tokyo', name: 'Haneda Airport', iata: 'HND', country: 'Japan' },
  { city: 'Dubai', name: 'Dubai Intl', iata: 'DXB', country: 'United Arab Emirates' },
  { city: 'Singapore', name: 'Changi Airport', iata: 'SIN', country: 'Singapore' },
  { city: 'New Delhi', name: 'Indira Gandhi Intl', iata: 'DEL', country: 'India' },
  { city: 'Mumbai', name: 'Chhatrapati Shivaji Intl', iata: 'BOM', country: 'India' },
  { city: 'Sydney', name: 'Sydney Airport', iata: 'SYD', country: 'Australia' }
];

const getCode = (val) => {
  if (!val) return '';
  const match = val.match(/\(([^)]+)\)$/);
  if (match) return match[1].toLowerCase().trim();
  return val.split(',')[0].toLowerCase().trim();
};
const getVal = (id) => document.getElementById(id)?.value.trim() || '';

// ── UI Helpers ────────────────────────────────
const buildCard = (f, i) => `
  <article class="flight-card" style="animation-delay: ${i * 0.08}s">
    <div class="card-top">
      <div><p class="card-airline">${f.flightNumber} · ${f.airline}</p>
      <h3 class="card-route">${f.originCity} → ${f.destinationCity}</h3></div>
      <div class="card-time"><strong>${f.departureTime} – ${f.arrivalTime}</strong><span>${f.duration}</span></div>
    </div>
    <div class="card-meta">
      <span class="pill">${f.fromAirportCode} → ${f.toAirportCode}</span>
      <span class="pill">${f.nonStop ? 'Non-stop' : '1 stop'}</span>
      <span class="pill ${f.status.toLowerCase().replace(/\s+/g, '-')}">${f.status}</span>
      <span class="card-price">${f.fare}</span>
    </div>
  </article>`;

let hasUserSearched = false;

function renderCards(flights) {
  const grid = document.getElementById('flightsGrid'), msg = document.getElementById('resultsMsg');
  if (!grid) return;
  if (!flights.length) {
    grid.innerHTML = `
      <div style="text-align: center; padding: 3.5rem 1.5rem; background: #fff; border-radius: 16px; border: 1px solid rgba(0,0,0,0.06); box-shadow: 0 4px 16px rgba(0,0,0,0.03);">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
        <h3 style="font-size: 1.25rem; font-weight: 800; color: #1e293b; margin-bottom: 0.4rem;">No Flights Found</h3>
        <p style="color: #64748b; font-size: 0.95rem; max-width: 420px; margin: 0 auto;">No flights match your search criteria. Try searching for different cities, airports, or dates.</p>
      </div>
    `;
    if (msg) msg.textContent = 'No results.';
    return;
  }
  grid.innerHTML = flights.map(buildCard).join('');
  if (msg) msg.textContent = `${flights.length} flight${flights.length > 1 ? 's' : ''} found · ${flights.filter(f => f.status.toLowerCase() !== 'scheduled').length} live`;
}

// ── Core Filtering ─────────────────────
function applyFilters(allFlights, forceSearch = false) {
  if (forceSearch) hasUserSearched = true;

  const isFV = document.getElementById('flights-view')?.style.display === 'block';
  const term = getVal('flightSearch').toLowerCase();
  const from = getCode(getVal(isFV && document.getElementById('fsbFrom') ? 'fsbFrom' : 'departureFrom'));
  const to = getCode(getVal(isFV && document.getElementById('fsbTo') ? 'fsbTo' : 'goingTo'));
  const nonStop = document.getElementById('nonStop')?.checked;
  const maxPrice = parseInt(getVal('priceRange') || '5000', 10);
  const getChecked = (cls) => Array.from(document.querySelectorAll(cls)).map(el => el.value);
  const stops = getChecked('.stop-filter:checked').map(Number);
  const airlines = getChecked('.airline-filter:checked');

  const hasSearchText = term || from || to;

  // If search fields are empty, prompt user to enter a city/airport
  if (!hasSearchText) {
    const grid = document.getElementById('flightsGrid'), msg = document.getElementById('resultsMsg');
    if (grid) {
      grid.innerHTML = `
        <div style="text-align: center; padding: 3.5rem 1.5rem; background: #fff; border-radius: 16px; border: 1px solid rgba(0,0,0,0.06); box-shadow: 0 4px 16px rgba(0,0,0,0.03);">
          <div style="margin-bottom: 0.75rem;">
            <img src="../../images/navbar logo.gif" alt="SkyFlow GIF" style="height: 55px; width: auto; object-fit: contain; display: inline-block;">
          </div>
          <h3 style="font-size: 1.25rem; font-weight: 800; color: #1e293b; margin-bottom: 0.4rem;">Search for a Flight</h3>
          <p style="color: #64748b; font-size: 0.95rem; max-width: 440px; margin: 0 auto;">Please enter a departure or destination city (e.g. <strong>London</strong>, <strong>Istanbul</strong>, <strong>Riyadh</strong>, <strong>Tokyo</strong>) in the search fields above.</p>
        </div>
      `;
    }
    if (msg) msg.textContent = 'Please enter origin or destination city.';
    const titleEl = document.getElementById('flightsTitle');
    if (titleEl) titleEl.innerHTML = 'SEARCH <span class="flights-title-accent">FLIGHTS</span>';
    const noteEl = document.getElementById('flightsNote');
    if (noteEl) noteEl.innerHTML = 'Enter your travel details above to search.';
    return;
  }

  const results = allFlights.filter(f => {
    const txt = `${f.flightNumber} ${f.airline} ${f.originCity} ${f.destinationCity} ${f.fromAirportCode} ${f.toAirportCode} ${f.status}`.toLowerCase();
    const stp = f.nonStop ? 0 : 1;
    const fare = parseInt(f.fare.replace(/[^0-9]/g, ''), 10) || 0;
    
    return (!term || txt.includes(term)) &&
           (!from || f.originCity.toLowerCase().includes(from) || f.fromAirportCode.toLowerCase().includes(from) || from.includes(f.originCity.toLowerCase())) &&
           (!to || f.destinationCity.toLowerCase().includes(to) || f.toAirportCode.toLowerCase().includes(to) || to.includes(f.destinationCity.toLowerCase())) &&
           (!nonStop || f.nonStop) && (fare <= maxPrice) &&
           (!stops.length || stops.includes(stp) || (stp > 1 && stops.includes(2))) &&
           (!airlines.length || airlines.includes(f.airline));
  });

  const titleEl = document.getElementById('flightsTitle');
  if (titleEl) {
    titleEl.innerHTML = results.length 
      ? 'MATCHING <span class="flights-title-accent">FLIGHTS</span>' 
      : 'NO <span class="flights-title-accent">FLIGHTS</span>';
  }
  const noteEl = document.getElementById('flightsNote');
  if (noteEl) {
    noteEl.innerHTML = results.length
      ? `${results.length} match${results.length === 1 ? '' : 'es'} found.` 
      : `No flights found matching your search. Try different cities or dates.`;
  }

  renderCards(results);
}

// ── Autocomplete ────────────────────────────
function setupAutocomplete(inputId, dropdownId, airports, allFlights) {
  const input = document.getElementById(inputId), dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;
  let activeIndex = -1, suggestions = [];

  const render = (query) => {
    const q = query.toLowerCase();
    suggestions = query ? airports.filter(a => `${a.city} ${a.name} ${a.iata} ${a.country}`.toLowerCase().includes(q)).slice(0, 10) : POPULAR_AIRPORTS;
    activeIndex = -1;
    dropdown.innerHTML = suggestions.length ? suggestions.map((a, i) => {
      const hl = str => query ? str.replace(new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\\]{}]/g, '\\\\$&')})`, 'gi'), '<span class="autocomplete-highlight">$1</span>') : str;
      return `<div class="autocomplete-option" data-index="${i}"><div class="autocomplete-option-icon">✈</div>
        <div class="autocomplete-option-info"><span class="autocomplete-option-city">${hl(a.city||'')}, ${a.country||''}</span><span class="autocomplete-option-airport">${hl(a.name||'')}</span></div>
        <span class="autocomplete-option-badge">${hl(a.iata||'')}</span></div>`;
    }).join('') : '<div style="padding: 1rem; color: #49769f; text-align: center;">No matches</div>';
    dropdown.classList.add('show');
  };

  const select = (idx) => {
    if (suggestions[idx]) {
      input.value = `${suggestions[idx].city}, ${suggestions[idx].country || ''} (${suggestions[idx].iata})`;
      dropdown.classList.remove('show');
      applyFilters(allFlights, true);
    }
  };

  input.addEventListener('focus', () => { document.querySelectorAll('.autocomplete-dropdown').forEach(d => d !== dropdown && d.classList.remove('show')); render(input.value.trim()); });
  input.addEventListener('input', () => render(input.value.trim()));
  dropdown.addEventListener('click', e => select(e.target.closest('.autocomplete-option')?.dataset.index));
  
  input.addEventListener('keydown', e => {
    if (!dropdown.classList.contains('show')) return ['ArrowDown', 'ArrowUp'].includes(e.key) && render(input.value.trim());
    if (e.key === 'Escape') return dropdown.classList.remove('show'), input.blur();
    if (e.key === 'Enter') return e.preventDefault(), select(Math.max(0, activeIndex));
    if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
      e.preventDefault();
      activeIndex = (activeIndex + (e.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length;
      dropdown.querySelectorAll('.autocomplete-option').forEach((opt, idx) => {
        opt.classList.toggle('active', idx === activeIndex);
        if (idx === activeIndex) opt.scrollIntoView({ block: 'nearest' });
      });
    }
  });
}

// ── Calendar Picker Helper ─────────────────
function setupCalendarPicker(inputId, dropdownId, allFlights) {
  const input = document.getElementById(inputId), dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;

  const MONTH_NAMES = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  const FULL_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let viewDate = new Date(2026, 7, 1);

  const parseFormattedDate = (val) => {
    if (!val) return null;
    const parts = val.split(', ');
    const dateStr = parts.length > 1 ? parts[1] : val;
    const tokens = dateStr.trim().split(/\s+/);
    if (tokens.length < 3) return null;
    const dayNum = parseInt(tokens[0], 10);
    const mIdx = MONTH_SHORT.findIndex(m => m.toLowerCase() === tokens[1].toLowerCase());
    if (mIdx === -1 || isNaN(dayNum)) return null;
    const yearNum = tokens[2].length === 2 ? 2000 + parseInt(tokens[2], 10) : parseInt(tokens[2], 10);
    return new Date(yearNum, mIdx, dayNum);
  };

  const renderCalendar = () => {
    const selectedDate = parseFormattedDate(input.value);
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let html = `
      <div class="cal-header">
        <button type="button" class="cal-nav-btn prev-month">&lsaquo;</button>
        <span class="cal-title">${FULL_MONTH_NAMES[month]} ${year}</span>
        <button type="button" class="cal-nav-btn next-month">&rsaquo;</button>
      </div>
      <div class="cal-weekdays">
        <span class="cal-weekday">Su</span>
        <span class="cal-weekday">Mo</span>
        <span class="cal-weekday">Tu</span>
        <span class="cal-weekday">We</span>
        <span class="cal-weekday">Th</span>
        <span class="cal-weekday">Fr</span>
        <span class="cal-weekday">Sa</span>
      </div>
      <div class="cal-days-grid">
    `;

    for (let i = 0; i < firstDay; i++) {
      html += `<div class="cal-day empty"></div>`;
    }

    const curSelYear = selectedDate ? selectedDate.getFullYear() : -1;
    const curSelMonth = selectedDate ? selectedDate.getMonth() : -1;
    const curSelDay = selectedDate ? selectedDate.getDate() : -1;

    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = (curSelYear === year && curSelMonth === month && curSelDay === day);
      html += `<div class="cal-day ${isSelected ? 'selected' : ''}" data-day="${day}">${day}</div>`;
    }

    html += `</div>`;
    dropdown.innerHTML = html;

    dropdown.querySelector('.prev-month')?.addEventListener('click', (e) => {
      e.stopPropagation();
      viewDate.setMonth(viewDate.getMonth() - 1);
      renderCalendar();
    });

    dropdown.querySelector('.next-month')?.addEventListener('click', (e) => {
      e.stopPropagation();
      viewDate.setMonth(viewDate.getMonth() + 1);
      renderCalendar();
    });

    dropdown.querySelectorAll('.cal-day[data-day]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const d = parseInt(el.dataset.day, 10);
        const chosenDate = new Date(year, month, d);
        const dayName = DAYS_SHORT[chosenDate.getDay()];
        const monthName = MONTH_SHORT[month];
        const yr2Digit = String(year).slice(-2);
        input.value = `${dayName}, ${d} ${monthName} ${yr2Digit}`;
        dropdown.classList.remove('show');
        applyFilters(allFlights, true);
      });
    });
  };

  const openDropdown = (e) => {
    e.stopPropagation();
    document.querySelectorAll('.autocomplete-dropdown').forEach(d => d !== dropdown && d.classList.remove('show'));
    const parsed = parseFormattedDate(input.value);
    if (parsed) viewDate = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
    renderCalendar();
    dropdown.classList.add('show');
  };

  input.addEventListener('click', openDropdown);
  input.parentElement?.addEventListener('click', (e) => {
    if (e.target.id === 'fsbReturnClear' || e.target.closest('#fsbReturnClear')) return;
    if (e.target !== input && !dropdown.contains(e.target)) openDropdown(e);
  });
}

// ── Travellers Menu Helper ─────────────────
function setupTravellersMenu(inputId, dropdownId, allFlights) {
  const input = document.getElementById(inputId), dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;

  const renderTravellersMenu = () => {
    const currentVal = parseInt(input.value, 10) || 1;
    let html = `<div class="autocomplete-header">SELECT TRAVELLERS (MAX 10)</div>`;

    for (let i = 1; i <= 10; i++) {
      const isActive = i === currentVal;
      const label = i === 1 ? '1 Adult' : `${i} Adults`;
      const desc = i === 1 ? 'Single passenger' : (i === 10 ? 'Maximum group booking (10 persons)' : `${i} Passengers booking`);
      const badge = i === 10 ? '10 Max' : `${i} ${i === 1 ? 'Person' : 'Persons'}`;

      html += `
        <div class="traveller-option ${isActive ? 'active' : ''}" data-count="${i}">
          <div class="traveller-info">
            <div class="traveller-icon">${i === 1 ? '👤' : '👥'}</div>
            <div>
              <div class="traveller-label">${label}</div>
              <div class="traveller-sub">${desc}</div>
            </div>
          </div>
          <span class="traveller-badge">${badge}</span>
        </div>
      `;
    }

    dropdown.innerHTML = html;

    dropdown.querySelectorAll('.traveller-option').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const count = parseInt(el.dataset.count, 10);
        input.value = count === 1 ? '1 Adult' : `${count} Adults`;
        dropdown.classList.remove('show');
        applyFilters(allFlights, true);
      });
    });
  };

  const openDropdown = (e) => {
    e.stopPropagation();
    document.querySelectorAll('.autocomplete-dropdown').forEach(d => d !== dropdown && d.classList.remove('show'));
    renderTravellersMenu();
    dropdown.classList.add('show');
  };

  input.addEventListener('click', openDropdown);
  input.parentElement?.addEventListener('click', (e) => {
    if (e.target !== input && !dropdown.contains(e.target)) openDropdown(e);
  });
}

// ── Init & Events ──────────────────────────
async function init() {
  const [allFlights, allAirports] = await Promise.all([loadFlights(), loadAirports()]);
  
  const af = document.getElementById('airlineFilters');
  if (af) af.innerHTML = [...new Set(allFlights.map(f => f.airline))].sort().map(a => `<label class="checkbox-label"><input type="checkbox" class="airline-filter" value="${a}"> ${a}</label>`).join('');

  applyFilters(allFlights, false);
  ['departureFrom', 'goingTo', 'fsbFrom', 'fsbTo'].forEach(id => setupAutocomplete(id, id+'Dropdown', allAirports, allFlights));
  
  setupCalendarPicker('fsbDepart', 'fsbDepartDropdown', allFlights);
  setupCalendarPicker('fsbReturn', 'fsbReturnDropdown', allFlights);
  setupTravellersMenu('fsbTravellers', 'fsbTravellersDropdown', allFlights);

  document.getElementById('fsbReturnClear')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const retInput = document.getElementById('fsbReturn');
    if (retInput) retInput.value = '';
    applyFilters(allFlights, true);
  });

  document.getElementById('searchBtn')?.addEventListener('click', () => {
    ['From', 'To'].forEach(f => {
      const fsb = document.getElementById('fsb'+f), hero = document.getElementById(f === 'From' ? 'departureFrom' : 'goingTo');
      if (fsb && hero) fsb.value = hero.value;
    });
    applyFilters(allFlights, true);
    if (document.getElementById('hero-view')) document.getElementById('hero-view').style.display = 'none';
    if (document.getElementById('flights-view')) document.getElementById('flights-view').style.display = 'block';
    document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#flights'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.getElementById('fsbSearchBtn')?.addEventListener('click', () => applyFilters(allFlights, true));
  document.getElementById('fsbFrom')?.addEventListener('input', () => applyFilters(allFlights, true));
  document.getElementById('fsbTo')?.addEventListener('input', () => applyFilters(allFlights, true));
  document.getElementById('flightSearch')?.addEventListener('input', () => applyFilters(allFlights, true));
  document.getElementById('nonStop')?.addEventListener('change', () => applyFilters(allFlights, true));
  document.addEventListener('click', e => !e.target.closest('.flight-field') && document.querySelectorAll('.autocomplete-dropdown').forEach(d => d.classList.remove('show')));

  const swap = (fid, tid) => { const a=document.getElementById(fid), b=document.getElementById(tid); if(a&&b) [a.value, b.value] = [b.value, a.value]; applyFilters(allFlights, true); };
  document.getElementById('swapBtn')?.addEventListener('click', () => swap('departureFrom', 'goingTo'));
  document.getElementById('fsbSwap')?.addEventListener('click', () => swap('fsbFrom', 'fsbTo'));

  document.getElementById('priceRange')?.addEventListener('input', e => { const pv = document.getElementById('priceValue'); if(pv) pv.textContent = `$${e.target.value}`; applyFilters(allFlights, true); });
  document.addEventListener('change', e => (e.target.matches('.stop-filter, .airline-filter')) && applyFilters(allFlights, true));

  document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', e => {
    const href = link.getAttribute('href');
    if (['#hero', '#flights'].includes(href)) {
      e.preventDefault();
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      if (document.getElementById('nav-toggle')) document.getElementById('nav-toggle').checked = false;
      const isHero = href === '#hero';
      if (document.getElementById('hero-view')) document.getElementById('hero-view').style.display = isHero ? 'block' : 'none';
      if (document.getElementById('flights-view')) {
        document.getElementById('flights-view').style.display = isHero ? 'none' : 'block';
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (!href.startsWith('#')) {
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    }
  }));
}

init();

