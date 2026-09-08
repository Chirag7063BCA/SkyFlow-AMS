/**
 * SkyFlow AMS - Flights Page Logic
 */

// ── Currency Conversion Configuration ──────────────────────────
const CURRENCY_RATES = {
  USD: { symbol: '$', rate: 1 },
  EUR: { symbol: '€', rate: 0.92 },
  GBP: { symbol: '£', rate: 0.79 },
  INR: { symbol: '₹', rate: 83.5 },
  AED: { symbol: 'AED ', rate: 3.67 },
  JPY: { symbol: '¥', rate: 155 }
};

let currentCurrency = 'USD';

/**
 * Formats a USD fare amount into the currently selected currency string
 */
function formatPrice(amountUsd) {
  const currencyInfo = CURRENCY_RATES[currentCurrency] || CURRENCY_RATES.USD;
  const convertedAmount = Math.round(amountUsd * currencyInfo.rate);
  return `${currencyInfo.symbol}${convertedAmount.toLocaleString()}`;
}

// ── Utility Helpers ─────────────────────────────────────────────

/**
 * Prevents function execution until typing stops for a given delay
 */
function debounce(callbackFunction, delayMs = 120) {
  let timerId;
  return function (...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      callbackFunction.apply(this, args);
    }, delayMs);
  };
}

/**
 * Safely gets trimmed text value from an input element
 */
function getInputValue(elementId) {
  const element = document.getElementById(elementId);
  return element ? element.value.trim() : '';
}

/**
 * Fetches JSON data with fallback relative URLs
 */
async function fetchJsonData(url, fallbackData = []) {
  const alternativeUrls = [
    url,
    url.replace(/^(\.\.\/)+/, '../../'),
    url.replace(/^(\.\.\/)+/, '../'),
    url.replace(/^(\.\.\/)+/, '/')
  ];

  for (const targetUrl of alternativeUrls) {
    try {
      const response = await fetch(targetUrl);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      // Continue to next alternative URL
    }
  }

  return fallbackData;
}

// ── Data Pre-Caching Loaders ────────────────────────────────────

/**
 * Loads flights data and pre-caches search metadata for 100x performance
 */
async function loadFlightsData() {
  const rawFlights = await fetchJsonData('../../Data/flights.json', []);
  return rawFlights.map(flight => {
    return {
      ...flight,
      _searchString: `${flight.flightNumber} ${flight.airline} ${flight.originCity} ${flight.destinationCity} ${flight.fromAirportCode} ${flight.toAirportCode} ${flight.status}`.toLowerCase(),
      _numericFare: parseInt(flight.fare ? flight.fare.replace(/[^0-9]/g, '') : '0', 10) || 0,
      _stopsCount: flight.nonStop ? 0 : 1,
      _originCityLower: (flight.originCity || '').toLowerCase(),
      _destCityLower: (flight.destinationCity || '').toLowerCase(),
      _fromCodeLower: (flight.fromAirportCode || '').toLowerCase(),
      _toCodeLower: (flight.toAirportCode || '').toLowerCase()
    };
  });
}

/**
 * Loads airports data and pre-caches search haystacks for instant autocomplete
 */
async function loadAirportsData() {
  const rawAirports = await fetchJsonData('../../Data/airports.json', []);
  return rawAirports.map(airport => {
    return {
      ...airport,
      _searchHaystack: `${airport.city || ''} ${airport.name || ''} ${airport.iata || ''} ${airport.country || ''}`.toLowerCase()
    };
  });
}

// ── Search Term & Location Matchers ──────────────────────────────

/**
 * Parses user input into raw text, IATA airport code, and city name
 */
function parseSearchTerm(inputString) {
  if (!inputString) {
    return { rawQuery: '', iataCode: '', cityName: '' };
  }

  const rawQuery = inputString.trim().toLowerCase();
  const parenthesisMatch = inputString.match(/\(([^)]+)\)$/);
  const iataCode = parenthesisMatch ? parenthesisMatch[1].trim().toLowerCase() : '';
  const cityName = inputString.split(',')[0].replace(/\([^)]*\)/, '').trim().toLowerCase();

  return { rawQuery, iataCode, cityName };
}

/**
 * Strictly matches a flight location against parsed user search terms
 */
function matchLocation(cityLower, codeLower, searchTerm) {
  if (!searchTerm.rawQuery) {
    return true;
  }

  if (searchTerm.iataCode) {
    return codeLower === searchTerm.iataCode || (searchTerm.cityName && cityLower.includes(searchTerm.cityName));
  }

  return cityLower.includes(searchTerm.rawQuery) || 
         (searchTerm.cityName && cityLower.includes(searchTerm.cityName)) || 
         codeLower.includes(searchTerm.rawQuery);
}

// ── UI Card Rendering & DOM Management ──────────────────────────

const CARDS_PER_PAGE = 60;
let currentRenderedFlights = [];
let currentDisplayLimit = CARDS_PER_PAGE;
let hasUserSearched = false;

/**
 * Builds HTML markup for a single flight card
 */
function createFlightCardHtml(flight, animationIndex) {
  const statusCssClass = (flight.status || '').toLowerCase().replace(/\s+/g, '-');
  const cappedAnimationIndex = Math.min(animationIndex, 8);
  const animationDelaySeconds = (cappedAnimationIndex * 0.03).toFixed(2);
  const formattedFare = formatPrice(flight._numericFare);

  return `
    <article class="flight-card" style="animation-delay: ${animationDelaySeconds}s">
      <div class="card-top">
        <div>
          <p class="card-airline">${flight.flightNumber} · ${flight.airline}</p>
          <h3 class="card-route">${flight.originCity} → ${flight.destinationCity}</h3>
        </div>
        <div class="card-time">
          <strong>${flight.departureTime} – ${flight.arrivalTime}</strong>
          <span>${flight.duration}</span>
        </div>
      </div>
      <div class="card-meta">
        <span class="pill">${flight.fromAirportCode} → ${flight.toAirportCode}</span>
        <span class="pill">${flight.nonStop ? 'Non-stop' : '1 stop'}</span>
        <span class="pill ${statusCssClass}">${flight.status}</span>
        <span class="card-price">${formattedFare}</span>
      </div>
    </article>
  `;
}

/**
 * Renders flight cards in grid with paginated DOM performance
 */
function renderFlightCards(flightsList, isIncremental = false) {
  const gridContainer = document.getElementById('flightsGrid');
  const resultsMessageElement = document.getElementById('resultsMsg');

  if (!gridContainer) return;

  if (!isIncremental) {
    currentRenderedFlights = flightsList;
    currentDisplayLimit = CARDS_PER_PAGE;
  }

  if (!flightsList.length) {
    gridContainer.innerHTML = `
      <div style="text-align: center; padding: 3.5rem 1.5rem; background: #ffffff; border-radius: 16px; border: 1px solid rgba(0,0,0,0.06); box-shadow: 0 4px 16px rgba(0,0,0,0.03);">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
        <h3 style="font-size: 1.25rem; font-weight: 800; color: #1e293b; margin-bottom: 0.4rem;">No Flights Found</h3>
        <p style="color: #64748b; font-size: 0.95rem; max-width: 420px; margin: 0 auto;">No flights match your exact search criteria. Try searching for different cities or airport codes.</p>
      </div>
    `;
    if (resultsMessageElement) resultsMessageElement.textContent = 'No results.';
    return;
  }

  const visibleFlights = flightsList.slice(0, currentDisplayLimit);
  let cardsHtml = visibleFlights.map((flight, index) => createFlightCardHtml(flight, index)).join('');

  if (flightsList.length > currentDisplayLimit) {
    const remainingCount = flightsList.length - currentDisplayLimit;
    cardsHtml += `
      <div id="loadMoreContainer" style="grid-column: 1 / -1; text-align: center; padding: 1.5rem 0;">
        <button id="loadMoreBtn" type="button" style="background: #1e293b; color: #ffffff; border: none; padding: 0.75rem 2rem; border-radius: 99px; font-weight: 700; cursor: pointer; transition: background 0.2s ease;">
          Load More Flights (${remainingCount} remaining)
        </button>
      </div>
    `;
  }

  gridContainer.innerHTML = cardsHtml;

  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      currentDisplayLimit += CARDS_PER_PAGE;
      renderFlightCards(currentRenderedFlights, true);
    });
  }

  if (resultsMessageElement) {
    const liveCount = flightsList.filter(f => (f.status || '').toLowerCase() !== 'scheduled').length;
    resultsMessageElement.textContent = `${flightsList.length} flight${flightsList.length > 1 ? 's' : ''} found · ${liveCount} live`;
  }
}

// ── Search & Filter Logic ────────────────────────────────────────

/**
 * Main function to filter flights based on active inputs and sidebar options
 */
function applyFilters(allFlights, forceSearch = false) {
  if (forceSearch) {
    hasUserSearched = true;
  }

  const isFlightsViewVisible = document.getElementById('flights-view')?.style.display === 'block';
  const keywordSearchTerm = getInputValue('flightSearch').toLowerCase();

  const fromInputValue = isFlightsViewVisible 
    ? (getInputValue('fsbFrom') || getInputValue('departureFrom')) 
    : (getInputValue('departureFrom') || getInputValue('fsbFrom'));

  const toInputValue = isFlightsViewVisible 
    ? (getInputValue('fsbTo') || getInputValue('goingTo')) 
    : (getInputValue('goingTo') || getInputValue('fsbTo'));

  const fromSearchTerm = parseSearchTerm(fromInputValue);
  const toSearchTerm = parseSearchTerm(toInputValue);

  const isNonStopOnly = document.getElementById('nonStop')?.checked;
  const maxPriceLimit = parseInt(getInputValue('priceRange') || '5000', 10);

  const getCheckedValues = (selector) => Array.from(document.querySelectorAll(selector)).map(element => element.value);
  const checkedStops = getCheckedValues('.stop-filter:checked').map(Number);
  const checkedAirlines = getCheckedValues('.airline-filter:checked');

  const hasSearchInput = Boolean(keywordSearchTerm || fromSearchTerm.rawQuery || toSearchTerm.rawQuery);

  // If no input has been entered by the user, keep placeholder prompt visible
  if (!hasSearchInput) {
    const gridContainer = document.getElementById('flightsGrid');
    const resultsMessageElement = document.getElementById('resultsMsg');

    if (gridContainer) {
      gridContainer.innerHTML = `
        <div style="text-align: center; padding: 3.5rem 1.5rem; background: #ffffff; border-radius: 16px; border: 1px solid rgba(0,0,0,0.06); box-shadow: 0 4px 16px rgba(0,0,0,0.03);">
          <div style="margin-bottom: 0.75rem;">
            <img src="../../images/navbar logo.gif" alt="SkyFlow Logo" style="height: 55px; width: auto; object-fit: contain; display: inline-block;">
          </div>
          <h3 style="font-size: 1.25rem; font-weight: 800; color: #1e293b; margin-bottom: 0.4rem;">Search for a Flight</h3>
          <p style="color: #64748b; font-size: 0.95rem; max-width: 440px; margin: 0 auto;">Please enter a departure or destination city in the search fields above.</p>
        </div>
      `;
    }

    if (resultsMessageElement) {
      resultsMessageElement.textContent = 'Please enter origin or destination city.';
    }

    const titleElement = document.getElementById('flightsTitle');
    if (titleElement) {
      titleElement.innerHTML = 'SEARCH <span class="flights-title-accent">FLIGHTS</span>';
    }

    const noteElement = document.getElementById('flightsNote');
    if (noteElement) {
      noteElement.innerHTML = 'Enter your travel details above to search.';
    }

    return;
  }

  // Filter flights matching input fields and sidebar controls
  const matchingFlights = allFlights.filter(flight => {
    const matchesKeyword = !keywordSearchTerm || flight._searchString.includes(keywordSearchTerm);
    const matchesFrom = matchLocation(flight._originCityLower, flight._fromCodeLower, fromSearchTerm);
    const matchesTo = matchLocation(flight._destCityLower, flight._toCodeLower, toSearchTerm);
    const matchesNonStop = !isNonStopOnly || flight.nonStop;
    const matchesPrice = flight._numericFare <= maxPriceLimit;
    const matchesStops = !checkedStops.length || checkedStops.includes(flight._stopsCount) || (flight._stopsCount > 1 && checkedStops.includes(2));
    const matchesAirline = !checkedAirlines.length || checkedAirlines.includes(flight.airline);

    return matchesKeyword && matchesFrom && matchesTo && matchesNonStop && matchesPrice && matchesStops && matchesAirline;
  });

  const titleElement = document.getElementById('flightsTitle');
  if (titleElement) {
    titleElement.innerHTML = matchingFlights.length 
      ? 'MATCHING <span class="flights-title-accent">FLIGHTS</span>' 
      : 'NO <span class="flights-title-accent">FLIGHTS</span>';
  }

  const noteElement = document.getElementById('flightsNote');
  if (noteElement) {
    noteElement.innerHTML = matchingFlights.length
      ? `${matchingFlights.length} match${matchingFlights.length === 1 ? '' : 'es'} found.` 
      : 'No flights found matching your search.';
  }

  renderFlightCards(matchingFlights);
}

// ── Dropdown Component Setup ─────────────────────────────────────

/**
 * Autocomplete dropdown setup for FROM and TO location fields
 */
function setupAutocomplete(inputId, dropdownId, airportsList, allFlights, debouncedSearch) {
  const inputElement = document.getElementById(inputId);
  const dropdownElement = document.getElementById(dropdownId);
  if (!inputElement || !dropdownElement) return;

  let activeIndex = -1;
  let currentSuggestions = [];

  const renderSuggestions = (searchQuery) => {
    const lowerQuery = searchQuery.toLowerCase();
    currentSuggestions = searchQuery 
      ? airportsList.filter(airport => airport._searchHaystack.includes(lowerQuery)).slice(0, 10) 
      : airportsList.slice(0, 10);

    activeIndex = -1;

    if (!currentSuggestions.length) {
      dropdownElement.innerHTML = '<div style="padding: 1rem; color: #49769f; text-align: center;">No matches</div>';
    } else {
      dropdownElement.innerHTML = currentSuggestions.map((airport, index) => {
        const highlightText = (text) => {
          if (!searchQuery) return text;
          const safeQuery = searchQuery.replace(/[-\/\\^$*+?.()|[\\]{}]/g, '\\$&');
          return text.replace(new RegExp(`(${safeQuery})`, 'gi'), '<span class="autocomplete-highlight">$1</span>');
        };

        const cityText = highlightText(airport.city || '');
        const countryText = airport.country || '';
        const airportNameText = highlightText(airport.name || '');
        const iataBadgeText = highlightText(airport.iata || '');

        return `
          <div class="autocomplete-option" data-index="${index}">
            <div class="autocomplete-option-icon">✈</div>
            <div class="autocomplete-option-info">
              <span class="autocomplete-option-city">${cityText}, ${countryText}</span>
              <span class="autocomplete-option-airport">${airportNameText}</span>
            </div>
            <span class="autocomplete-option-badge">${iataBadgeText}</span>
          </div>
        `;
      }).join('');
    }

    dropdownElement.classList.add('show');
  };

  const selectSuggestion = (optionIndex) => {
    const selectedAirport = currentSuggestions[optionIndex];
    if (!selectedAirport) return;

    const formattedValue = `${selectedAirport.city}, ${selectedAirport.country || ''} (${selectedAirport.iata})`;
    inputElement.value = formattedValue;

    // Synchronize inputs between Hero section and Flights section
    if (inputId === 'departureFrom') {
      const fsbFrom = document.getElementById('fsbFrom');
      if (fsbFrom) fsbFrom.value = formattedValue;
    }
    if (inputId === 'fsbFrom') {
      const heroFrom = document.getElementById('departureFrom');
      if (heroFrom) heroFrom.value = formattedValue;
    }
    if (inputId === 'goingTo') {
      const fsbTo = document.getElementById('fsbTo');
      if (fsbTo) fsbTo.value = formattedValue;
    }
    if (inputId === 'fsbTo') {
      const heroTo = document.getElementById('goingTo');
      if (heroTo) heroTo.value = formattedValue;
    }

    dropdownElement.classList.remove('show');
    applyFilters(allFlights, true);
  };

  inputElement.addEventListener('focus', () => {
    document.querySelectorAll('.autocomplete-dropdown').forEach(dropdown => {
      if (dropdown !== dropdownElement) dropdown.classList.remove('show');
    });
    renderSuggestions(inputElement.value.trim());
  });

  inputElement.addEventListener('input', () => {
    renderSuggestions(inputElement.value.trim());
  });

  dropdownElement.addEventListener('click', (event) => {
    const clickedOption = event.target.closest('.autocomplete-option');
    if (clickedOption) {
      selectSuggestion(clickedOption.dataset.index);
    }
  });

  inputElement.addEventListener('keydown', (event) => {
    if (!dropdownElement.classList.contains('show')) {
      if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
        renderSuggestions(inputElement.value.trim());
      }
      return;
    }

    if (event.key === 'Escape') {
      dropdownElement.classList.remove('show');
      inputElement.blur();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      selectSuggestion(Math.max(0, activeIndex));
      return;
    }

    if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      activeIndex = (activeIndex + direction + currentSuggestions.length) % currentSuggestions.length;

      dropdownElement.querySelectorAll('.autocomplete-option').forEach((optionElement, index) => {
        optionElement.classList.toggle('active', index === activeIndex);
        if (index === activeIndex) {
          optionElement.scrollIntoView({ block: 'nearest' });
        }
      });
    }
  });
}

/**
 * Calendar picker dropdown setup for DEPART and RETURN date fields
 */
function setupCalendarPicker(inputId, dropdownId, allFlights) {
  const inputElement = document.getElementById(inputId);
  const dropdownElement = document.getElementById(dropdownId);
  if (!inputElement || !dropdownElement) return;

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTH_SHORT_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAY_SHORT_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let activeCalendarDate = new Date(2026, 7, 1);

  const parseFormattedDate = (dateString) => {
    if (!dateString) return null;
    const parts = dateString.split(', ');
    const cleanedDateStr = parts.length > 1 ? parts[1] : dateString;
    const tokens = cleanedDateStr.trim().split(/\s+/);
    if (tokens.length < 3) return null;

    const dayNumber = parseInt(tokens[0], 10);
    const monthIndex = MONTH_SHORT_NAMES.findIndex(month => month.toLowerCase() === tokens[1].toLowerCase());
    if (monthIndex === -1 || isNaN(dayNumber)) return null;

    const yearNumber = tokens[2].length === 2 ? 2000 + parseInt(tokens[2], 10) : parseInt(tokens[2], 10);
    return new Date(yearNumber, monthIndex, dayNumber);
  };

  const renderCalendarGrid = () => {
    const selectedDate = parseFormattedDate(inputElement.value);
    const currentYear = activeCalendarDate.getFullYear();
    const currentMonth = activeCalendarDate.getMonth();
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    let calendarHtml = `
      <div class="cal-header">
        <button type="button" class="cal-nav-btn prev-month">&lsaquo;</button>
        <span class="cal-title">${MONTH_NAMES[currentMonth]} ${currentYear}</span>
        <button type="button" class="cal-nav-btn next-month">&rsaquo;</button>
      </div>
      <div class="cal-weekdays">
        <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
      </div>
      <div class="cal-days-grid">
    `;

    for (let i = 0; i < firstDayIndex; i++) {
      calendarHtml += `<div class="cal-day empty"></div>`;
    }

    const selectedYear = selectedDate ? selectedDate.getFullYear() : -1;
    const selectedMonth = selectedDate ? selectedDate.getMonth() : -1;
    const selectedDay = selectedDate ? selectedDate.getDate() : -1;

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const isSelected = (selectedYear === currentYear && selectedMonth === currentMonth && selectedDay === day);
      calendarHtml += `<div class="cal-day ${isSelected ? 'selected' : ''}" data-day="${day}">${day}</div>`;
    }

    calendarHtml += `</div>`;
    dropdownElement.innerHTML = calendarHtml;

    dropdownElement.querySelector('.prev-month')?.addEventListener('click', (event) => {
      event.stopPropagation();
      activeCalendarDate.setMonth(activeCalendarDate.getMonth() - 1);
      renderCalendarGrid();
    });

    dropdownElement.querySelector('.next-month')?.addEventListener('click', (event) => {
      event.stopPropagation();
      activeCalendarDate.setMonth(activeCalendarDate.getMonth() + 1);
      renderCalendarGrid();
    });

    dropdownElement.querySelectorAll('.cal-day[data-day]').forEach(dayElement => {
      dayElement.addEventListener('click', (event) => {
        event.stopPropagation();
        const dayNumber = parseInt(dayElement.dataset.day, 10);
        const chosenDate = new Date(currentYear, currentMonth, dayNumber);
        const dayName = DAY_SHORT_NAMES[chosenDate.getDay()];
        const monthName = MONTH_SHORT_NAMES[currentMonth];
        const twoDigitYear = String(currentYear).slice(-2);

        inputElement.value = `${dayName}, ${dayNumber} ${monthName} ${twoDigitYear}`;
        dropdownElement.classList.remove('show');
        applyFilters(allFlights, false);
      });
    });
  };

  const openCalendarDropdown = (event) => {
    event.stopPropagation();
    document.querySelectorAll('.autocomplete-dropdown').forEach(dropdown => {
      if (dropdown !== dropdownElement) dropdown.classList.remove('show');
    });
    const parsedDate = parseFormattedDate(inputElement.value);
    if (parsedDate) {
      activeCalendarDate = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1);
    }
    renderCalendarGrid();
    dropdownElement.classList.add('show');
  };

  inputElement.addEventListener('click', openCalendarDropdown);
  inputElement.parentElement?.addEventListener('click', (event) => {
    if (event.target.id === 'fsbReturnClear' || event.target.closest('#fsbReturnClear')) return;
    if (event.target !== inputElement && !dropdownElement.contains(event.target)) {
      openCalendarDropdown(event);
    }
  });
}

/**
 * Travellers dropdown setup
 */
function setupTravellersMenu(inputId, dropdownId, allFlights) {
  const inputElement = document.getElementById(inputId);
  const dropdownElement = document.getElementById(dropdownId);
  if (!inputElement || !dropdownElement) return;

  const renderTravellersMenu = () => {
    const currentCount = parseInt(inputElement.value, 10) || 1;
    let menuHtml = `<div class="autocomplete-header">SELECT TRAVELLERS (MAX 10)</div>`;

    for (let count = 1; count <= 10; count++) {
      const isActive = (count === currentCount);
      const labelText = count === 1 ? '1 Adult' : `${count} Adults`;
      const descriptionText = count === 1 ? 'Single passenger' : (count === 10 ? 'Maximum group booking (10 persons)' : `${count} Passengers booking`);
      const badgeText = count === 10 ? '10 Max' : `${count} ${count === 1 ? 'Person' : 'Persons'}`;

      menuHtml += `
        <div class="traveller-option ${isActive ? 'active' : ''}" data-count="${count}">
          <div class="traveller-info">
            <div class="traveller-icon">${count === 1 ? '👤' : '👥'}</div>
            <div>
              <div class="traveller-label">${labelText}</div>
              <div class="traveller-sub">${descriptionText}</div>
            </div>
          </div>
          <span class="traveller-badge">${badgeText}</span>
        </div>
      `;
    }

    dropdownElement.innerHTML = menuHtml;

    dropdownElement.querySelectorAll('.traveller-option').forEach(optionElement => {
      optionElement.addEventListener('click', (event) => {
        event.stopPropagation();
        const count = parseInt(optionElement.dataset.count, 10);
        inputElement.value = count === 1 ? '1 Adult' : `${count} Adults`;
        dropdownElement.classList.remove('show');
        applyFilters(allFlights, false);
      });
    });
  };

  const openTravellersDropdown = (event) => {
    event.stopPropagation();
    document.querySelectorAll('.autocomplete-dropdown').forEach(dropdown => {
      if (dropdown !== dropdownElement) dropdown.classList.remove('show');
    });
    renderTravellersMenu();
    dropdownElement.classList.add('show');
  };

  inputElement.addEventListener('click', openTravellersDropdown);
  inputElement.parentElement?.addEventListener('click', (event) => {
    if (event.target !== inputElement && !dropdownElement.contains(event.target)) {
      openTravellersDropdown(event);
    }
  });
}

/**
 * Trip Type dropdown setup (Round Trip / One Way)
 */
function setupTripTypeMenu(inputId, dropdownId, allFlights) {
  const inputElement = document.getElementById(inputId);
  const dropdownElement = document.getElementById(dropdownId);
  if (!inputElement || !dropdownElement) return;

  const renderTripTypeMenu = () => {
    const currentValue = inputElement.value;
    dropdownElement.innerHTML = `
      <div class="autocomplete-header">SELECT TRIP TYPE</div>
      <div class="traveller-option ${currentValue === 'Round Trip' ? 'active' : ''}" data-value="Round Trip">
        <div class="traveller-info">
          <div class="traveller-icon">🔁</div>
          <div>
            <div class="traveller-label">Round Trip</div>
            <div class="traveller-sub">Return flight included</div>
          </div>
        </div>
      </div>
      <div class="traveller-option ${currentValue === 'One Way' ? 'active' : ''}" data-value="One Way">
        <div class="traveller-info">
          <div class="traveller-icon">➡️</div>
          <div>
            <div class="traveller-label">One Way</div>
            <div class="traveller-sub">Single directional flight</div>
          </div>
        </div>
      </div>
    `;

    dropdownElement.querySelectorAll('.traveller-option').forEach(optionElement => {
      optionElement.addEventListener('click', (event) => {
        event.stopPropagation();
        const selectedValue = optionElement.dataset.value;
        inputElement.value = selectedValue;

        const returnInput = document.getElementById('fsbReturn');
        const returnCardContainer = returnInput?.closest('.fsb-card');

        if (selectedValue === 'One Way') {
          if (returnInput) returnInput.value = '';
          if (returnCardContainer) returnCardContainer.style.opacity = '0.4';
        } else {
          if (returnInput && !returnInput.value) returnInput.value = 'Fri, 7 Aug 26';
          if (returnCardContainer) returnCardContainer.style.opacity = '1';
        }

        dropdownElement.classList.remove('show');
        applyFilters(allFlights, false);
      });
    });
  };

  const openTripTypeDropdown = (event) => {
    event.stopPropagation();
    document.querySelectorAll('.autocomplete-dropdown').forEach(dropdown => {
      if (dropdown !== dropdownElement) dropdown.classList.remove('show');
    });
    renderTripTypeMenu();
    dropdownElement.classList.add('show');
  };

  inputElement.addEventListener('click', openTripTypeDropdown);
  inputElement.parentElement?.addEventListener('click', (event) => {
    if (event.target !== inputElement && !dropdownElement.contains(event.target)) {
      openTripTypeDropdown(event);
    }
  });
}

/**
 * Cabin Class dropdown setup
 */
function setupCabinClassMenu(inputId, dropdownId, allFlights) {
  const inputElement = document.getElementById(inputId);
  const dropdownElement = document.getElementById(dropdownId);
  if (!inputElement || !dropdownElement) return;

  const cabinOptions = [
    { label: 'Economy / Premium', sub: 'Standard & extra legroom seats', icon: '🪑' },
    { label: 'Business Class', sub: 'Lie-flat seats & lounge access', icon: '💼' },
    { label: 'First Class', sub: 'Private suite & luxury service', icon: '👑' }
  ];

  const renderCabinClassMenu = () => {
    const currentValue = inputElement.value;
    let menuHtml = `<div class="autocomplete-header">SELECT CABIN CLASS</div>`;

    cabinOptions.forEach(option => {
      const isActive = currentValue.includes(option.label.split(' ')[0]);
      menuHtml += `
        <div class="traveller-option ${isActive ? 'active' : ''}" data-value="${option.label}">
          <div class="traveller-info">
            <div class="traveller-icon">${option.icon}</div>
            <div>
              <div class="traveller-label">${option.label}</div>
              <div class="traveller-sub">${option.sub}</div>
            </div>
          </div>
        </div>
      `;
    });

    dropdownElement.innerHTML = menuHtml;

    dropdownElement.querySelectorAll('.traveller-option').forEach(optionElement => {
      optionElement.addEventListener('click', (event) => {
        event.stopPropagation();
        inputElement.value = optionElement.dataset.value;
        dropdownElement.classList.remove('show');
        applyFilters(allFlights, false);
      });
    });
  };

  const openCabinClassDropdown = (event) => {
    event.stopPropagation();
    document.querySelectorAll('.autocomplete-dropdown').forEach(dropdown => {
      if (dropdown !== dropdownElement) dropdown.classList.remove('show');
    });
    renderCabinClassMenu();
    dropdownElement.classList.add('show');
  };

  inputElement.addEventListener('click', openCabinClassDropdown);
  inputElement.parentElement?.addEventListener('click', (event) => {
    if (event.target !== inputElement && !dropdownElement.contains(event.target)) {
      openCabinClassDropdown(event);
    }
  });
}

// ── Application Initialization & Event Binds ─────────────────────

async function initApplication() {
  const [allFlights, allAirports] = await Promise.all([loadFlightsData(), loadAirportsData()]);
  const debouncedSearch = debounce((forceSearch = false) => applyFilters(allFlights, forceSearch), 120);

  // Populate dynamic airline checkboxes
  const airlineFiltersContainer = document.getElementById('airlineFilters');
  if (airlineFiltersContainer) {
    const uniqueAirlines = [...new Set(allFlights.map(flight => flight.airline))].sort();
    airlineFiltersContainer.innerHTML = uniqueAirlines.map(airline => `
      <label class="checkbox-label">
        <input type="checkbox" class="airline-filter" value="${airline}"> ${airline}
      </label>
    `).join('');
  }

  // Initial filter run
  applyFilters(allFlights, false);

  // Setup dropdown autocompletes
  ['departureFrom', 'goingTo', 'fsbFrom', 'fsbTo'].forEach(id => {
    setupAutocomplete(id, id + 'Dropdown', allAirports, allFlights, () => debouncedSearch(false));
  });

  setupCalendarPicker('fsbDepart', 'fsbDepartDropdown', allFlights);
  setupCalendarPicker('fsbReturn', 'fsbReturnDropdown', allFlights);
  setupTravellersMenu('fsbTravellers', 'fsbTravellersDropdown', allFlights);
  setupTripTypeMenu('fsbTripType', 'fsbTripTypeDropdown', allFlights);
  setupCabinClassMenu('fsbCabin', 'fsbCabinDropdown', allFlights);

  // Sync inputs between Hero card and Flights search bar
  const syncInputPair = (id1, id2) => {
    const element1 = document.getElementById(id1);
    const element2 = document.getElementById(id2);
    if (element1 && element2) {
      element1.addEventListener('input', () => {
        element2.value = element1.value;
        debouncedSearch(false);
      });
      element2.addEventListener('input', () => {
        element1.value = element2.value;
        debouncedSearch(false);
      });
    }
  };
  syncInputPair('departureFrom', 'fsbFrom');
  syncInputPair('goingTo', 'fsbTo');

  // Clear return date button
  document.getElementById('fsbReturnClear')?.addEventListener('click', (event) => {
    event.stopPropagation();
    const returnInput = document.getElementById('fsbReturn');
    if (returnInput) returnInput.value = '';
    applyFilters(allFlights, false);
  });

  // Hero section search button
  document.getElementById('searchBtn')?.addEventListener('click', () => {
    const heroFrom = document.getElementById('departureFrom');
    const heroTo = document.getElementById('goingTo');
    const fsbFrom = document.getElementById('fsbFrom');
    const fsbTo = document.getElementById('fsbTo');

    if (heroFrom && fsbFrom) {
      if (heroFrom.value) fsbFrom.value = heroFrom.value;
      else if (fsbFrom.value) heroFrom.value = fsbFrom.value;
    }

    if (heroTo && fsbTo) {
      if (heroTo.value) fsbTo.value = heroTo.value;
      else if (fsbTo.value) heroTo.value = fsbTo.value;
    }

    const heroView = document.getElementById('hero-view');
    const flightsView = document.getElementById('flights-view');

    if (heroView) heroView.style.display = 'none';
    if (flightsView) flightsView.style.display = 'block';

    applyFilters(allFlights, true);
    window.location.hash = '#flights';

    document.querySelectorAll('.nav-link').forEach(link => {
      const route = link.dataset.route;
      const href = link.getAttribute('href') || '';
      link.classList.toggle('active', route === 'flights' || href.includes('flights'));
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Flights bar search button
  document.getElementById('fsbSearchBtn')?.addEventListener('click', () => {
    applyFilters(allFlights, true);
  });

  document.getElementById('flightSearch')?.addEventListener('input', () => {
    debouncedSearch(false);
  });

  document.getElementById('nonStop')?.addEventListener('change', () => {
    applyFilters(allFlights, false);
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.flight-field')) {
      document.querySelectorAll('.autocomplete-dropdown').forEach(dropdown => {
        dropdown.classList.remove('show');
      });
    }
  });

  // Location swap buttons
  const swapLocations = (fromId1, toId1, fromId2, toId2) => {
    const fromEl1 = document.getElementById(fromId1);
    const toEl1 = document.getElementById(toId1);
    if (fromEl1 && toEl1) {
      [fromEl1.value, toEl1.value] = [toEl1.value, fromEl1.value];
    }

    const fromEl2 = document.getElementById(fromId2);
    const toEl2 = document.getElementById(toId2);
    if (fromEl2 && toEl2) {
      [fromEl2.value, toEl2.value] = [toEl2.value, fromEl2.value];
    }

    applyFilters(allFlights, false);
  };

  document.getElementById('swapBtn')?.addEventListener('click', () => {
    swapLocations('departureFrom', 'goingTo', 'fsbFrom', 'fsbTo');
  });

  document.getElementById('fsbSwap')?.addEventListener('click', () => {
    swapLocations('fsbFrom', 'fsbTo', 'departureFrom', 'goingTo');
  });

  // Price range slider
  document.getElementById('priceRange')?.addEventListener('input', (event) => {
    const priceDisplay = document.getElementById('priceValue');
    if (priceDisplay) {
      priceDisplay.textContent = formatPrice(parseInt(event.target.value, 10));
    }
    debouncedSearch(false);
  });

  // Currency select dropdown
  document.getElementById('currencySelect')?.addEventListener('change', (event) => {
    currentCurrency = event.target.value;
    const priceSlider = document.getElementById('priceRange');
    const priceDisplay = document.getElementById('priceValue');
    if (priceSlider && priceDisplay) {
      priceDisplay.textContent = formatPrice(parseInt(priceSlider.value, 10));
    }
    applyFilters(allFlights, false);
  });

  // Stop & Airline filter checkboxes
  document.addEventListener('change', (event) => {
    if (event.target.matches('.stop-filter, .airline-filter')) {
      applyFilters(allFlights, false);
    }
  });

  // Navigation link click routing
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (event) => {
      const route = link.dataset.route;
      const href = link.getAttribute('href') || '';

      if (route === 'home' || route === 'flights' || href.includes('#home') || href.includes('#flights') || href === '#') {
        const isHeroTarget = (route === 'home' || href.includes('#home'));
        const targetHash = isHeroTarget ? '#home' : '#flights';
        const heroView = document.getElementById('hero-view');
        const flightsView = document.getElementById('flights-view');

        if (heroView && flightsView) {
          event.preventDefault();
          document.querySelectorAll('.nav-link').forEach(navLink => navLink.classList.remove('active'));
          link.classList.add('active');

          const navToggle = document.getElementById('nav-toggle');
          if (navToggle) navToggle.checked = false;

          heroView.style.display = isHeroTarget ? 'block' : 'none';
          flightsView.style.display = isHeroTarget ? 'none' : 'block';

          window.location.hash = targetHash;
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    });
  });
}

// Start application
initApplication();
