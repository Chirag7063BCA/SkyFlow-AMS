/**
 * SkyFlow AMS - Flights Page Logic (Simplified & Lightweight)
 */

window.CURRENCY_RATES = window.CURRENCY_RATES || {
  USD: { symbol: '$', rate: 1 },
  EUR: { symbol: '€', rate: 0.92 },
  GBP: { symbol: '£', rate: 0.79 },
  INR: { symbol: '₹', rate: 83.5 },
  AED: { symbol: 'AED ', rate: 3.67 },
  JPY: { symbol: '¥', rate: 155 }
};
window.currentCurrency = window.currentCurrency || 'USD';
window.CARDS_PER_PAGE = 60;
window.currentRenderedFlights = [];
window.currentDisplayLimit = window.CARDS_PER_PAGE;

// ── Utility Helpers ──
function formatPrice(amountUsd) {
  const c = window.CURRENCY_RATES[window.currentCurrency] || window.CURRENCY_RATES.USD;
  return `${c.symbol}${Math.round(amountUsd * c.rate).toLocaleString()}`;
}

function debounce(fn, delay = 120) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

const getVal = (id) => (document.getElementById(id)?.value || '').trim();

async function fetchJsonData(url) {
  const file = url.split(/[/\\]/).pop();
  const paths = [url, `../../Data/${file}`, `../Data/${file}`, `Data/${file}`, `/Data/${file}`];
  for (const p of paths) {
    try {
      const res = await fetch(p);
      if (res.ok) return await res.json();
    } catch (e) {}
  }
  return [];
}

async function loadData() {
  const [rawFlights, rawAirports] = await Promise.all([
    fetchJsonData('../../Data/flights.json'),
    fetchJsonData('../../Data/airports.json')
  ]);

  const flights = rawFlights.map(f => ({
    ...f,
    _searchStr: `${f.flightNumber} ${f.airline} ${f.originCity} ${f.destinationCity} ${f.fromAirportCode} ${f.toAirportCode} ${f.status}`.toLowerCase(),
    _fareNum: parseInt(f.fare ? f.fare.replace(/[^0-9]/g, '') : '0', 10) || 0,
    _stops: f.nonStop ? 0 : 1,
    _fromCity: (f.originCity || '').toLowerCase(),
    _toCity: (f.destinationCity || '').toLowerCase(),
    _fromCode: (f.fromAirportCode || '').toLowerCase(),
    _toCode: (f.toAirportCode || '').toLowerCase()
  }));

  const airports = rawAirports.map(a => ({
    ...a,
    _haystack: `${a.city || ''} ${a.name || ''} ${a.iata || ''} ${a.country || ''}`.toLowerCase()
  }));

  return { flights, airports };
}

function parseTerm(str) {
  if (!str) return { query: '', iata: '', city: '' };
  const query = str.trim().toLowerCase();
  const match = str.match(/\(([^)]+)\)$/);
  const iata = match ? match[1].trim().toLowerCase() : '';
  const city = str.split(',')[0].replace(/\([^)]*\)/, '').trim().toLowerCase();
  return { query, iata, city };
}

function matchLoc(city, code, term) {
  if (!term.query) return true;
  if (term.iata) return code === term.iata || (term.city && city.includes(term.city));
  return city.includes(term.query) || (term.city && city.includes(term.city)) || code.includes(term.query);
}

// ── Rendering Flight Cards ──
function createCardHtml(f, idx) {
  const statusClass = (f.status || '').toLowerCase().replace(/\s+/g, '-');
  const delay = (Math.min(idx, 8) * 0.03).toFixed(2);
  return `
    <article class="flight-card" style="animation-delay: ${delay}s">
      <div class="card-top">
        <div>
          <p class="card-airline">${f.flightNumber} · ${f.airline}</p>
          <h3 class="card-route">${f.originCity} → ${f.destinationCity}</h3>
        </div>
        <div class="card-time">
          <strong>${f.departureTime} – ${f.arrivalTime}</strong>
          <span>${f.duration}</span>
        </div>
      </div>
      <div class="card-meta">
        <span class="pill">${f.fromAirportCode} → ${f.toAirportCode}</span>
        <span class="pill">${f.nonStop ? 'Non-stop' : '1 stop'}</span>
        <span class="pill ${statusClass}">${f.status}</span>
        <span class="card-price">${formatPrice(f._fareNum)}</span>
      </div>
    </article>`;
}

function renderFlightCards(list, isMore = false) {
  const grid = document.getElementById('flightsGrid');
  const msg = document.getElementById('resultsMsg');
  if (!grid) return;

  if (!isMore) {
    window.currentRenderedFlights = list;
    window.currentDisplayLimit = window.CARDS_PER_PAGE;
  }

  if (!list.length) {
    grid.innerHTML = `
      <div style="text-align:center; padding:3.5rem 1.5rem; background:#fff; border-radius:16px; border:1px solid rgba(0,0,0,0.06); box-shadow:0 4px 16px rgba(0,0,0,0.03);">
        <div style="font-size:2.5rem; margin-bottom:0.5rem;">🔍</div>
        <h3 style="font-size:1.25rem; font-weight:800; color:#1e293b; margin-bottom:0.4rem;">No Flights Found</h3>
        <p style="color:#64748b; font-size:0.95rem; max-width:420px; margin:0 auto;">No flights match your search criteria. Try searching for different cities or codes.</p>
      </div>`;
    if (msg) msg.textContent = 'No results.';
    return;
  }

  const visible = list.slice(0, window.currentDisplayLimit);
  let html = visible.map((f, i) => createCardHtml(f, i)).join('');

  if (list.length > window.currentDisplayLimit) {
    const rem = list.length - window.currentDisplayLimit;
    html += `
      <div id="loadMoreContainer" style="grid-column:1/-1; text-align:center; padding:1.5rem 0;">
        <button id="loadMoreBtn" type="button" style="background:#1e293b; color:#fff; border:none; padding:0.75rem 2rem; border-radius:99px; font-weight:700; cursor:pointer;">
          Load More Flights (${rem} remaining)
        </button>
      </div>`;
  }

  grid.innerHTML = html;

  document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
    window.currentDisplayLimit += window.CARDS_PER_PAGE;
    renderFlightCards(window.currentRenderedFlights, true);
  });

  if (msg) {
    const live = list.filter(f => (f.status || '').toLowerCase() !== 'scheduled').length;
    msg.textContent = `${list.length} flight${list.length > 1 ? 's' : ''} found · ${live} live`;
  }
}

// ── Filtering Logic ──
function applyFilters(allFlights) {
  const isFlightsView = document.getElementById('flights-view')?.style.display === 'block';
  const kw = getVal('flightSearch').toLowerCase();
  const fromVal = isFlightsView ? (getVal('fsbFrom') || getVal('departureFrom')) : (getVal('departureFrom') || getVal('fsbFrom'));
  const toVal = isFlightsView ? (getVal('fsbTo') || getVal('goingTo')) : (getVal('goingTo') || getVal('fsbTo'));

  const fromTerm = parseTerm(fromVal);
  const toTerm = parseTerm(toVal);
  const isNonStop = document.getElementById('nonStop')?.checked;
  const maxPrice = parseInt(getVal('priceRange') || '5000', 10);

  const getChecked = (sel) => Array.from(document.querySelectorAll(sel)).map(e => e.value);
  const stops = getChecked('.stop-filter:checked').map(Number);
  const airlines = getChecked('.airline-filter:checked');

  const hasInput = Boolean(kw || fromTerm.query || toTerm.query);

  if (!hasInput) {
    const grid = document.getElementById('flightsGrid');
    const msg = document.getElementById('resultsMsg');
    if (grid) {
      grid.innerHTML = `
        <div style="text-align:center; padding:3.5rem 1.5rem; background:#fff; border-radius:16px; border:1px solid rgba(0,0,0,0.06); box-shadow:0 4px 16px rgba(0,0,0,0.03);">
          <div style="margin-bottom:0.75rem;">
            <img src="../../images/navbar logo.gif" alt="SkyFlow Logo" style="height:55px; width:auto; object-fit:contain; display:inline-block;">
          </div>
          <h3 style="font-size:1.25rem; font-weight:800; color:#1e293b; margin-bottom:0.4rem;">Search for a Flight</h3>
          <p style="color:#64748b; font-size:0.95rem; max-width:440px; margin:0 auto;">Please enter a departure or destination city in the search fields above.</p>
        </div>`;
    }
    if (msg) msg.textContent = 'Please enter origin or destination city.';
    const title = document.getElementById('flightsTitle');
    if (title) title.innerHTML = 'SEARCH <span class="flights-title-accent">FLIGHTS</span>';
    const note = document.getElementById('flightsNote');
    if (note) note.innerHTML = 'Enter your travel details above to search.';
    return;
  }

  const matches = allFlights.filter(f => {
    const mKw = !kw || f._searchStr.includes(kw);
    const mFrom = matchLoc(f._fromCity, f._fromCode, fromTerm);
    const mTo = matchLoc(f._toCity, f._toCode, toTerm);
    const mStop = !isNonStop || f.nonStop;
    const mPrice = f._fareNum <= maxPrice;
    const mStops = !stops.length || stops.includes(f._stops) || (f._stops > 1 && stops.includes(2));
    const mAir = !airlines.length || airlines.includes(f.airline);
    return mKw && mFrom && mTo && mStop && mPrice && mStops && mAir;
  });

  const title = document.getElementById('flightsTitle');
  if (title) title.innerHTML = matches.length ? 'MATCHING <span class="flights-title-accent">FLIGHTS</span>' : 'NO <span class="flights-title-accent">FLIGHTS</span>';
  const note = document.getElementById('flightsNote');
  if (note) note.innerHTML = matches.length ? `${matches.length} match${matches.length === 1 ? '' : 'es'} found.` : 'No flights found matching your search.';

  renderFlightCards(matches);
}

// ── Dropdown Controls ──
function setupAutocomplete(inputId, dropdownId, airports, allFlights, triggerSearch) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;

  let suggestions = [], activeIdx = -1;

  const render = (q) => {
    const lq = q.toLowerCase();
    suggestions = q ? airports.filter(a => a._haystack.includes(lq)).slice(0, 10) : airports.slice(0, 10);
    activeIdx = -1;

    if (!suggestions.length) {
      dropdown.innerHTML = '<div style="padding:1rem; color:#49769f; text-align:center;">No matches</div>';
    } else {
      dropdown.innerHTML = suggestions.map((a, i) => `
        <div class="autocomplete-option" data-index="${i}">
          <div class="autocomplete-option-icon">✈</div>
          <div class="autocomplete-option-info">
            <span class="autocomplete-option-city">${a.city}, ${a.country || ''}</span>
            <span class="autocomplete-option-airport">${a.name}</span>
          </div>
          <span class="autocomplete-option-badge">${a.iata}</span>
        </div>`).join('');
    }
    dropdown.classList.add('show');
  };

  const select = (idx) => {
    const item = suggestions[idx];
    if (!item) return;
    const val = `${item.city}, ${item.country || ''} (${item.iata})`;
    input.value = val;

    const syncMap = { departureFrom: 'fsbFrom', fsbFrom: 'departureFrom', goingTo: 'fsbTo', fsbTo: 'goingTo' };
    if (syncMap[inputId]) {
      const pair = document.getElementById(syncMap[inputId]);
      if (pair) pair.value = val;
    }

    dropdown.classList.remove('show');
    applyFilters(allFlights);
  };

  input.addEventListener('focus', () => {
    document.querySelectorAll('.autocomplete-dropdown').forEach(d => d !== dropdown && d.classList.remove('show'));
    render(input.value.trim());
  });

  input.addEventListener('input', () => render(input.value.trim()));

  dropdown.addEventListener('click', (e) => {
    const opt = e.target.closest('.autocomplete-option');
    if (opt) select(parseInt(opt.dataset.index, 10));
  });

  input.addEventListener('keydown', (e) => {
    if (!dropdown.classList.contains('show')) return;
    if (e.key === 'Escape') dropdown.classList.remove('show');
    else if (e.key === 'Enter') { e.preventDefault(); select(Math.max(0, activeIdx)); }
    else if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
      e.preventDefault();
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      activeIdx = (activeIdx + dir + suggestions.length) % suggestions.length;
      dropdown.querySelectorAll('.autocomplete-option').forEach((el, i) => {
        el.classList.toggle('active', i === activeIdx);
        if (i === activeIdx) el.scrollIntoView({ block: 'nearest' });
      });
    }
  });
}

function setupCalendarPicker(inputId, dropdownId, allFlights) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let curDate = new Date(2026, 7, 1);

  const parseDate = (str) => {
    if (!str) return null;
    const parts = str.split(', ');
    const tokens = (parts.length > 1 ? parts[1] : str).trim().split(/\s+/);
    if (tokens.length < 3) return null;
    const day = parseInt(tokens[0], 10);
    const mIdx = MONTHS_SHORT.findIndex(m => m.toLowerCase() === tokens[1].toLowerCase());
    if (mIdx === -1 || isNaN(day)) return null;
    const yr = tokens[2].length === 2 ? 2000 + parseInt(tokens[2], 10) : parseInt(tokens[2], 10);
    return new Date(yr, mIdx, day);
  };

  const renderCal = () => {
    const sel = parseDate(input.value);
    const yr = curDate.getFullYear(), mo = curDate.getMonth();
    const firstDay = new Date(yr, mo, 1).getDay();
    const totalDays = new Date(yr, mo + 1, 0).getDate();

    let html = `
      <div class="cal-header">
        <button type="button" class="cal-nav-btn prev-month">&lsaquo;</button>
        <span class="cal-title">${MONTHS[mo]} ${yr}</span>
        <button type="button" class="cal-nav-btn next-month">&rsaquo;</button>
      </div>
      <div class="cal-weekdays"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div>
      <div class="cal-days-grid">`;

    for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;
    for (let d = 1; d <= totalDays; d++) {
      const isSel = sel && sel.getFullYear() === yr && sel.getMonth() === mo && sel.getDate() === d;
      html += `<div class="cal-day ${isSel ? 'selected' : ''}" data-day="${d}">${d}</div>`;
    }
    html += `</div>`;
    dropdown.innerHTML = html;

    dropdown.querySelector('.prev-month')?.addEventListener('click', (e) => { e.stopPropagation(); curDate.setMonth(mo - 1); renderCal(); });
    dropdown.querySelector('.next-month')?.addEventListener('click', (e) => { e.stopPropagation(); curDate.setMonth(mo + 1); renderCal(); });

    dropdown.querySelectorAll('.cal-day[data-day]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const d = parseInt(el.dataset.day, 10);
        const dt = new Date(yr, mo, d);
        input.value = `${DAYS_SHORT[dt.getDay()]}, ${d} ${MONTHS_SHORT[mo]} ${String(yr).slice(-2)}`;
        dropdown.classList.remove('show');
        applyFilters(allFlights);
      });
    });
  };

  const open = (e) => {
    e.stopPropagation();
    document.querySelectorAll('.autocomplete-dropdown').forEach(d => d !== dropdown && d.classList.remove('show'));
    const p = parseDate(input.value);
    if (p) curDate = new Date(p.getFullYear(), p.getMonth(), 1);
    renderCal();
    dropdown.classList.add('show');
  };

  input.addEventListener('click', open);
  input.parentElement?.addEventListener('click', (e) => {
    if (e.target.id === 'fsbReturnClear' || e.target.closest('#fsbReturnClear')) return;
    if (e.target !== input && !dropdown.contains(e.target)) open(e);
  });
}

function setupSimpleMenu(inputId, dropdownId, getHtml, onOptionClick) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;

  const open = (e) => {
    e.stopPropagation();
    document.querySelectorAll('.autocomplete-dropdown').forEach(d => d !== dropdown && d.classList.remove('show'));
    dropdown.innerHTML = getHtml(input.value);
    dropdown.querySelectorAll('[data-val]').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        onOptionClick(el.dataset.val, input);
        dropdown.classList.remove('show');
      });
    });
    dropdown.classList.add('show');
  };

  input.addEventListener('click', open);
  input.parentElement?.addEventListener('click', (e) => {
    if (e.target !== input && !dropdown.contains(e.target)) open(e);
  });
}

function setupTravellersMenu(inputId, dropdownId, allFlights) {
  setupSimpleMenu(inputId, dropdownId, (val) => {
    const cur = parseInt(val, 10) || 1;
    let html = `<div class="autocomplete-header">SELECT TRAVELLERS (MAX 10)</div>`;
    for (let c = 1; c <= 10; c++) {
      const active = c === cur ? 'active' : '';
      const label = c === 1 ? '1 Adult' : `${c} Adults`;
      const sub = c === 1 ? 'Single passenger' : (c === 10 ? 'Maximum group booking (10 persons)' : `${c} Passengers booking`);
      const badge = c === 10 ? '10 Max' : `${c} ${c === 1 ? 'Person' : 'Persons'}`;
      html += `
        <div class="traveller-option ${active}" data-val="${c}">
          <div class="traveller-info">
            <div class="traveller-icon">${c === 1 ? '👤' : '👥'}</div>
            <div><div class="traveller-label">${label}</div><div class="traveller-sub">${sub}</div></div>
          </div>
          <span class="traveller-badge">${badge}</span>
        </div>`;
    }
    return html;
  }, (cnt, inp) => {
    const c = parseInt(cnt, 10);
    inp.value = c === 1 ? '1 Adult' : `${c} Adults`;
    applyFilters(allFlights);
  });
}

function setupTripTypeMenu(inputId, dropdownId, allFlights) {
  setupSimpleMenu(inputId, dropdownId, (val) => `
    <div class="autocomplete-header">SELECT TRIP TYPE</div>
    <div class="traveller-option ${val === 'Round Trip' ? 'active' : ''}" data-val="Round Trip">
      <div class="traveller-info"><div class="traveller-icon">🔁</div><div><div class="traveller-label">Round Trip</div><div class="traveller-sub">Return flight included</div></div></div>
    </div>
    <div class="traveller-option ${val === 'One Way' ? 'active' : ''}" data-val="One Way">
      <div class="traveller-info"><div class="traveller-icon">➡️</div><div><div class="traveller-label">One Way</div><div class="traveller-sub">Single directional flight</div></div></div>
    </div>`,
  (v, inp) => {
    inp.value = v;
    const retInp = document.getElementById('fsbReturn');
    const retCard = retInp?.closest('.fsb-card');
    if (v === 'One Way') {
      if (retInp) retInp.value = '';
      if (retCard) retCard.style.opacity = '0.4';
    } else {
      if (retInp && !retInp.value) retInp.value = 'Fri, 7 Aug 26';
      if (retCard) retCard.style.opacity = '1';
    }
    applyFilters(allFlights);
  });
}

function setupCabinClassMenu(inputId, dropdownId, allFlights) {
  const options = [
    { label: 'Economy / Premium', sub: 'Standard & extra legroom seats', icon: '🪑' },
    { label: 'Business Class', sub: 'Lie-flat seats & lounge access', icon: '💼' },
    { label: 'First Class', sub: 'Private suite & luxury service', icon: '👑' }
  ];

  setupSimpleMenu(inputId, dropdownId, (val) => {
    let html = `<div class="autocomplete-header">SELECT CABIN CLASS</div>`;
    options.forEach(opt => {
      const active = val.includes(opt.label.split(' ')[0]) ? 'active' : '';
      html += `
        <div class="traveller-option ${active}" data-val="${opt.label}">
          <div class="traveller-info"><div class="traveller-icon">${opt.icon}</div><div><div class="traveller-label">${opt.label}</div><div class="traveller-sub">${opt.sub}</div></div></div>
        </div>`;
    });
    return html;
  }, (v, inp) => {
    inp.value = v;
    applyFilters(allFlights);
  });
}

function setupTravellersClassMenu(inputId, dropdownId, allFlights) {
  const options = [
    { label: 'Economy', sub: 'Standard seating' },
    { label: 'Premium Economy', sub: 'Extra legroom & comfort' },
    { label: 'Business Class', sub: 'Lie-flat seats & lounge access' },
    { label: 'First Class', sub: 'Luxury private suite' }
  ];

  setupSimpleMenu(inputId, dropdownId, (val) => {
    let html = `<div class="autocomplete-header">SELECT CABIN CLASS</div>`;
    options.forEach(opt => {
      const active = val === opt.label ? 'active' : '';
      html += `
        <div class="autocomplete-option ${active}" data-val="${opt.label}">
          <div class="autocomplete-option-info">
            <span class="autocomplete-option-city">${opt.label}</span>
            <span class="autocomplete-option-airport">${opt.sub}</span>
          </div>
        </div>`;
    });
    return html;
  }, (v, inp) => {
    inp.value = v;
    applyFilters(allFlights);
  });
}

// ── Application Initialization ──
async function initApp() {
  if (window.componentsLoadedPromise) {
    await window.componentsLoadedPromise;
  }
  const { flights: allFlights, airports: allAirports } = await loadData();
  const debouncedSearch = debounce(() => applyFilters(allFlights), 120);

  // Populate dynamic airline checkboxes
  const airlineBox = document.getElementById('airlineFilters');
  if (airlineBox) {
    const airlines = [...new Set(allFlights.map(f => f.airline))].sort();
    airlineBox.innerHTML = airlines.map(a => `
      <label class="checkbox-label"><input type="checkbox" class="airline-filter" value="${a}"> ${a}</label>
    `).join('');
  }

  // Initial filter run & global trigger
  applyFilters(allFlights);
  window.triggerFlightsRefresh = () => applyFilters(allFlights);

  // Dropdown Autocompletes
  ['departureFrom', 'goingTo', 'fsbFrom', 'fsbTo'].forEach(id => {
    setupAutocomplete(id, id + 'Dropdown', allAirports, allFlights, debouncedSearch);
  });

  setupCalendarPicker('fsbDepart', 'fsbDepartDropdown', allFlights);
  setupCalendarPicker('fsbReturn', 'fsbReturnDropdown', allFlights);
  setupTravellersMenu('fsbTravellers', 'fsbTravellersDropdown', allFlights);
  setupTripTypeMenu('fsbTripType', 'fsbTripTypeDropdown', allFlights);
  setupCabinClassMenu('fsbCabin', 'fsbCabinDropdown', allFlights);
  setupTravellersClassMenu('travellersClass', 'travellersClassDropdown', allFlights);

  // Synchronize input fields (Hero ↔ Flights Bar)
  const syncInputs = (id1, id2) => {
    const e1 = document.getElementById(id1), e2 = document.getElementById(id2);
    if (e1 && e2) {
      e1.addEventListener('input', () => { e2.value = e1.value; debouncedSearch(); });
      e2.addEventListener('input', () => { e1.value = e2.value; debouncedSearch(); });
    }
  };
  syncInputs('departureFrom', 'fsbFrom');
  syncInputs('goingTo', 'fsbTo');

  // Clear return date
  document.getElementById('fsbReturnClear')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const ret = document.getElementById('fsbReturn');
    if (ret) ret.value = '';
    applyFilters(allFlights);
  });

  // Hero search button
  document.getElementById('searchBtn')?.addEventListener('click', () => {
    const hFrom = document.getElementById('departureFrom'), hTo = document.getElementById('goingTo');
    const fFrom = document.getElementById('fsbFrom'), fTo = document.getElementById('fsbTo');
    const msg = document.getElementById('resultsMsg');

    if (!hFrom?.value.trim() && !hTo?.value.trim() && !fFrom?.value.trim() && !fTo?.value.trim()) {
      if (msg) msg.textContent = 'Please enter origin or destination city.';
      return;
    }

    if (hFrom && fFrom) { if (hFrom.value) fFrom.value = hFrom.value; else if (fFrom.value) hFrom.value = fFrom.value; }
    if (hTo && fTo) { if (hTo.value) fTo.value = hTo.value; else if (fTo.value) hTo.value = fTo.value; }

    const heroView = document.getElementById('hero-view');
    const flightsView = document.getElementById('flights-view');
    if (heroView) heroView.style.display = 'none';
    if (flightsView) flightsView.style.display = 'block';

    applyFilters(allFlights);
    window.location.hash = '#flights';
    document.querySelectorAll('.nav-link').forEach(link => {
      const route = link.dataset.route, href = link.getAttribute('href') || '';
      link.classList.toggle('active', route === 'flights' || href.includes('flights'));
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Search & Filter event listeners
  document.getElementById('fsbSearchBtn')?.addEventListener('click', () => applyFilters(allFlights));
  document.getElementById('flightSearch')?.addEventListener('input', () => debouncedSearch());
  document.getElementById('nonStop')?.addEventListener('change', () => applyFilters(allFlights));

  // Swap location buttons
  const swap = (f1, t1, f2, t2) => {
    const eF1 = document.getElementById(f1), eT1 = document.getElementById(t1);
    if (eF1 && eT1) [eF1.value, eT1.value] = [eT1.value, eF1.value];
    const eF2 = document.getElementById(f2), eT2 = document.getElementById(t2);
    if (eF2 && eT2) [eF2.value, eT2.value] = [eT2.value, eF2.value];
    applyFilters(allFlights);
  };

  document.getElementById('swapBtn')?.addEventListener('click', () => swap('departureFrom', 'goingTo', 'fsbFrom', 'fsbTo'));
  document.getElementById('fsbSwap')?.addEventListener('click', () => swap('fsbFrom', 'fsbTo', 'departureFrom', 'goingTo'));

  // Price range & Currency select
  document.getElementById('priceRange')?.addEventListener('input', (e) => {
    const priceDisplay = document.getElementById('priceValue');
    if (priceDisplay) priceDisplay.textContent = formatPrice(parseInt(e.target.value, 10));
    debouncedSearch();
  });

  document.getElementById('currencySelect')?.addEventListener('change', (e) => {
    window.currentCurrency = e.target.value;
    const priceSlider = document.getElementById('priceRange');
    const priceDisplay = document.getElementById('priceValue');
    if (priceSlider && priceDisplay) priceDisplay.textContent = formatPrice(parseInt(priceSlider.value, 10));
    applyFilters(allFlights);
  });

  document.addEventListener('change', (e) => {
    if (e.target.matches('.stop-filter, .airline-filter')) applyFilters(allFlights);
  });

  // Global click outside to hide dropdowns
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.flight-field')) {
      document.querySelectorAll('.autocomplete-dropdown').forEach(d => d.classList.remove('show'));
    }
  });

  // Navigation link clicks
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const route = link.dataset.route, href = link.getAttribute('href') || '';
      if (route === 'home' || route === 'flights' || href.includes('#home') || href.includes('#flights') || href === '#') {
        const isHome = (route === 'home' || href.includes('#home'));
        const heroView = document.getElementById('hero-view');
        const flightsView = document.getElementById('flights-view');
        if (heroView && flightsView) {
          e.preventDefault();
          document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
          link.classList.add('active');
          const navToggle = document.getElementById('nav-toggle');
          if (navToggle) navToggle.checked = false;
          heroView.style.display = isHome ? 'block' : 'none';
          flightsView.style.display = isHome ? 'none' : 'block';
          window.location.hash = isHome ? '#home' : '#flights';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    });
  });
}

initApp();
