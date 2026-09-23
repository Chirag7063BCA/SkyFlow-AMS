/**
 * SkyFlow AMS - Flights Page Logic (Basic & Beginner-Friendly JavaScript)
 */

// ── Currency Rates & Global Settings ──
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

// ── Helper Functions ──

// Converts USD amount to selected currency and formats as a string
function formatPrice(amountInUsd) {
  var currencyKey = window.currentCurrency;
  var currency = window.CURRENCY_RATES[currencyKey];
  
  if (!currency) {
    currency = window.CURRENCY_RATES.USD;
  }
  
  var convertedAmount = Math.round(amountInUsd * currency.rate);
  return currency.symbol + convertedAmount.toLocaleString();
}

// Safely gets the trimmed value of an input element by ID
function getInputValue(elementId) {
  var element = document.getElementById(elementId);
  if (element && element.value) {
    return element.value.trim();
  }
  return '';
}

// Simple debounce helper to prevent too many search calls while typing
function debounce(func, delay) {
  if (!delay) {
    delay = 120;
  }
  var timer;
  return function() {
    var args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function() {
      func.apply(null, args);
    }, delay);
  };
}

// Fetches JSON data trying multiple relative paths
async function fetchJsonData(url) {
  var fileName = url.split('/').pop().split('\\').pop();
  var possiblePaths = [
    url,
    '../../Data/' + fileName,
    '../Data/' + fileName,
    'Data/' + fileName,
    '/Data/' + fileName
  ];

  for (var i = 0; i < possiblePaths.length; i++) {
    try {
      var response = await fetch(possiblePaths[i]);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      // Continue to next path
    }
  }
  return [];
}

// Loads flights and airports data from JSON files
async function loadData() {
  var rawFlights = await fetchJsonData('../../Data/flights.json');
  var rawAirports = await fetchJsonData('../../Data/airports.json');

  var flights = [];
  for (var i = 0; i < rawFlights.length; i++) {
    var f = rawFlights[i];
    
    // Extract numbers from fare string (e.g. "$450" -> 450)
    var fareNumber = 0;
    if (f.fare) {
      var cleanFare = f.fare.replace(/[^0-9]/g, '');
      fareNumber = parseInt(cleanFare, 10) || 0;
    }

    var searchString = (f.flightNumber + ' ' + f.airline + ' ' + f.originCity + ' ' + f.destinationCity + ' ' + f.fromAirportCode + ' ' + f.toAirportCode + ' ' + f.status).toLowerCase();

    flights.push({
      flightNumber: f.flightNumber,
      airline: f.airline,
      originCity: f.originCity,
      destinationCity: f.destinationCity,
      fromAirportCode: f.fromAirportCode,
      toAirportCode: f.toAirportCode,
      departureTime: f.departureTime,
      arrivalTime: f.arrivalTime,
      duration: f.duration,
      status: f.status,
      nonStop: f.nonStop,
      fare: f.fare,
      _searchStr: searchString,
      _fareNum: fareNumber,
      _stops: f.nonStop ? 0 : 1,
      _fromCity: (f.originCity || '').toLowerCase(),
      _toCity: (f.destinationCity || '').toLowerCase(),
      _fromCode: (f.fromAirportCode || '').toLowerCase(),
      _toCode: (f.toAirportCode || '').toLowerCase()
    });
  }

  var airports = [];
  for (var j = 0; j < rawAirports.length; j++) {
    var a = rawAirports[j];
    var haystack = ((a.city || '') + ' ' + (a.name || '') + ' ' + (a.iata || '') + ' ' + (a.country || '')).toLowerCase();
    airports.push({
      city: a.city,
      name: a.name,
      iata: a.iata,
      country: a.country,
      _haystack: haystack
    });
  }

  return { flights: flights, airports: airports };
}

// ── Search Term Parser & Location Matcher ──

function parseSearchTerm(text) {
  if (!text) {
    return { query: '', iata: '', city: '' };
  }
  var query = text.trim().toLowerCase();
  
  // Extract code inside brackets if present, e.g. "Dubai (DXB)" -> "dxb"
  var iata = '';
  var openParen = text.lastIndexOf('(');
  var closeParen = text.lastIndexOf(')');
  if (openParen !== -1 && closeParen > openParen) {
    iata = text.substring(openParen + 1, closeParen).trim().toLowerCase();
  }

  // Extract city name before comma or bracket
  var city = text.split(',')[0];
  var parenIndex = city.indexOf('(');
  if (parenIndex !== -1) {
    city = city.substring(0, parenIndex);
  }
  city = city.trim().toLowerCase();

  return { query: query, iata: iata, city: city };
}

function matchLocation(city, airportCode, term) {
  if (!term.query) {
    return true;
  }
  if (term.iata) {
    return airportCode === term.iata || (term.city && city.includes(term.city));
  }
  return city.includes(term.query) || (term.city && city.includes(term.city)) || airportCode.includes(term.query);
}

// ── Rendering Flight Cards ──

function createFlightCardHtml(flight, index) {
  var statusClass = (flight.status || '').toLowerCase().replace(/\s+/g, '-');
  var animationDelay = Math.min(index, 8) * 0.03;

  return '<article class="flight-card" style="animation-delay: ' + animationDelay.toFixed(2) + 's">' +
    '<div class="card-top">' +
      '<div>' +
        '<p class="card-airline">' + flight.flightNumber + ' · ' + flight.airline + '</p>' +
        '<h3 class="card-route">' + flight.originCity + ' → ' + flight.destinationCity + '</h3>' +
      '</div>' +
      '<div class="card-time">' +
        '<strong>' + flight.departureTime + ' – ' + flight.arrivalTime + '</strong>' +
        '<span>' + flight.duration + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="card-meta">' +
      '<span class="pill">' + flight.fromAirportCode + ' → ' + flight.toAirportCode + '</span>' +
      '<span class="pill">' + (flight.nonStop ? 'Non-stop' : '1 stop') + '</span>' +
      '<span class="pill ' + statusClass + '">' + flight.status + '</span>' +
      '<span class="card-price">' + formatPrice(flight._fareNum) + '</span>' +
    '</div>' +
  '</article>';
}

function renderFlightCards(flightList, isLoadMore) {
  var gridElement = document.getElementById('flightsGrid');
  var messageElement = document.getElementById('resultsMsg');
  
  if (!gridElement) return;

  if (!isLoadMore) {
    window.currentRenderedFlights = flightList;
    window.currentDisplayLimit = window.CARDS_PER_PAGE;
  }

  // Handle zero results
  if (flightList.length === 0) {
    gridElement.innerHTML = 
      '<div style="text-align:center; padding:3.5rem 1.5rem; background:#fff; border-radius:16px; border:1px solid rgba(0,0,0,0.06); box-shadow:0 4px 16px rgba(0,0,0,0.03);">' +
        '<div style="font-size:2.5rem; margin-bottom:0.5rem;">🔍</div>' +
        '<h3 style="font-size:1.25rem; font-weight:800; color:#1e293b; margin-bottom:0.4rem;">No Flights Found</h3>' +
        '<p style="color:#64748b; font-size:0.95rem; max-width:420px; margin:0 auto;">No flights match your search criteria. Try searching for different cities or codes.</p>' +
      '</div>';

    if (messageElement) {
      messageElement.textContent = 'No results.';
    }
    return;
  }

  // Build card HTML for visible items up to display limit
  var visibleFlights = flightList.slice(0, window.currentDisplayLimit);
  var htmlContent = '';
  for (var i = 0; i < visibleFlights.length; i++) {
    htmlContent += createFlightCardHtml(visibleFlights[i], i);
  }

  // Add "Load More" button if there are remaining flights
  if (flightList.length > window.currentDisplayLimit) {
    var remainingCount = flightList.length - window.currentDisplayLimit;
    htmlContent += 
      '<div id="loadMoreContainer" style="grid-column:1/-1; text-align:center; padding:1.5rem 0;">' +
        '<button id="loadMoreBtn" type="button" style="background:#1e293b; color:#fff; border:none; padding:0.75rem 2rem; border-radius:99px; font-weight:700; cursor:pointer;">' +
          'Load More Flights (' + remainingCount + ' remaining)' +
        '</button>' +
      '</div>';
  }

  gridElement.innerHTML = htmlContent;

  // Event listener for Load More button
  var loadMoreButton = document.getElementById('loadMoreBtn');
  if (loadMoreButton) {
    loadMoreButton.addEventListener('click', function() {
      window.currentDisplayLimit += window.CARDS_PER_PAGE;
      renderFlightCards(window.currentRenderedFlights, true);
    });
  }

  // Update status summary text
  if (messageElement) {
    var liveCount = 0;
    for (var j = 0; j < flightList.length; j++) {
      if ((flightList[j].status || '').toLowerCase() !== 'scheduled') {
        liveCount++;
      }
    }
    var resultLabel = flightList.length > 1 ? 'flights' : 'flight';
    messageElement.textContent = flightList.length + ' ' + resultLabel + ' found · ' + liveCount + ' live';
  }
}

// ── Filtering Logic ──

function applyFilters(allFlights) {
  var flightsView = document.getElementById('flights-view');
  var isFlightsViewActive = flightsView && flightsView.style.display === 'block';

  var keyword = getInputValue('flightSearch').toLowerCase();
  
  var fromValue = '';
  var toValue = '';
  if (isFlightsViewActive) {
    fromValue = getInputValue('fsbFrom') || getInputValue('departureFrom');
    toValue = getInputValue('fsbTo') || getInputValue('goingTo');
  } else {
    fromValue = getInputValue('departureFrom') || getInputValue('fsbFrom');
    toValue = getInputValue('goingTo') || getInputValue('fsbTo');
  }

  var fromTerm = parseSearchTerm(fromValue);
  var toTerm = parseSearchTerm(toValue);

  var nonStopCheckbox = document.getElementById('nonStop');
  var isNonStopChecked = nonStopCheckbox ? nonStopCheckbox.checked : false;

  var priceRangeVal = getInputValue('priceRange');
  var maxPrice = priceRangeVal ? parseInt(priceRangeVal, 10) : 5000;

  // Selected stop filters
  var checkedStopElements = document.querySelectorAll('.stop-filter:checked');
  var selectedStops = [];
  for (var s = 0; s < checkedStopElements.length; s++) {
    selectedStops.push(parseInt(checkedStopElements[s].value, 10));
  }

  // Selected airline filters
  var checkedAirlineElements = document.querySelectorAll('.airline-filter:checked');
  var selectedAirlines = [];
  for (var a = 0; a < checkedAirlineElements.length; a++) {
    selectedAirlines.push(checkedAirlineElements[a].value);
  }

  var hasUserEnteredInput = Boolean(keyword || fromTerm.query || toTerm.query);

  // If no search inputs entered, display initial search welcome screen
  if (!hasUserEnteredInput) {
    var gridElement = document.getElementById('flightsGrid');
    var messageElement = document.getElementById('resultsMsg');
    
    if (gridElement) {
      gridElement.innerHTML = 
        '<div style="text-align:center; padding:3.5rem 1.5rem; background:#fff; border-radius:16px; border:1px solid rgba(0,0,0,0.06); box-shadow:0 4px 16px rgba(0,0,0,0.03);">' +
          '<div style="margin-bottom:0.75rem;">' +
            '<img src="../../images/navbar logo.gif" alt="SkyFlow Logo" style="height:55px; width:auto; object-fit:contain; display:inline-block;">' +
          '</div>' +
          '<h3 style="font-size:1.25rem; font-weight:800; color:#1e293b; margin-bottom:0.4rem;">Search for a Flight</h3>' +
          '<p style="color:#64748b; font-size:0.95rem; max-width:440px; margin:0 auto;">Please enter a departure or destination city in the search fields above.</p>' +
        '</div>';
    }

    if (messageElement) {
      messageElement.textContent = 'Please enter origin or destination city.';
    }

    var titleElement = document.getElementById('flightsTitle');
    if (titleElement) {
      titleElement.innerHTML = 'SEARCH <span class="flights-title-accent">FLIGHTS</span>';
    }

    var noteElement = document.getElementById('flightsNote');
    if (noteElement) {
      noteElement.innerHTML = 'Enter your travel details above to search.';
    }
    return;
  }

  // Filter flights matching all criteria
  var matchingFlights = [];
  for (var i = 0; i < allFlights.length; i++) {
    var flight = allFlights[i];

    var matchKeyword = !keyword || flight._searchStr.includes(keyword);
    var matchFrom = matchLocation(flight._fromCity, flight._fromCode, fromTerm);
    var matchTo = matchLocation(flight._toCity, flight._toCode, toTerm);
    var matchNonStop = !isNonStopChecked || flight.nonStop;
    var matchPrice = flight._fareNum <= maxPrice;

    var matchStops = true;
    if (selectedStops.length > 0) {
      var hasStopMatch = selectedStops.includes(flight._stops);
      var hasMultiStopMatch = flight._stops > 1 && selectedStops.includes(2);
      matchStops = hasStopMatch || hasMultiStopMatch;
    }

    var matchAirline = selectedAirlines.length === 0 || selectedAirlines.includes(flight.airline);

    if (matchKeyword && matchFrom && matchTo && matchNonStop && matchPrice && matchStops && matchAirline) {
      matchingFlights.push(flight);
    }
  }

  // Update section title and note
  var sectionTitle = document.getElementById('flightsTitle');
  if (sectionTitle) {
    if (matchingFlights.length > 0) {
      sectionTitle.innerHTML = 'MATCHING <span class="flights-title-accent">FLIGHTS</span>';
    } else {
      sectionTitle.innerHTML = 'NO <span class="flights-title-accent">FLIGHTS</span>';
    }
  }

  var sectionNote = document.getElementById('flightsNote');
  if (sectionNote) {
    if (matchingFlights.length > 0) {
      var matchCount = matchingFlights.length;
      sectionNote.innerHTML = matchCount + ' match' + (matchCount === 1 ? '' : 'es') + ' found.';
    } else {
      sectionNote.innerHTML = 'No flights found matching your search.';
    }
  }

  renderFlightCards(matchingFlights);
}

// ── Dropdown & Autocomplete Controls ──

function hideAllDropdowns() {
  var dropdowns = document.querySelectorAll('.autocomplete-dropdown');
  for (var i = 0; i < dropdowns.length; i++) {
    dropdowns[i].classList.remove('show');
  }
}

// Setup airport autocomplete search dropdown
function setupAirportAutocomplete(inputId, dropdownId, airports, allFlights) {
  var inputElement = document.getElementById(inputId);
  var dropdownElement = document.getElementById(dropdownId);
  if (!inputElement || !dropdownElement) return;

  var currentSuggestions = [];
  var activeIndex = -1;

  function renderSuggestions(userQuery) {
    var queryLower = userQuery.toLowerCase();
    currentSuggestions = [];

    if (queryLower) {
      for (var i = 0; i < airports.length; i++) {
        if (airports[i]._haystack.includes(queryLower)) {
          currentSuggestions.push(airports[i]);
          if (currentSuggestions.length >= 10) break;
        }
      }
    } else {
      currentSuggestions = airports.slice(0, 10);
    }

    activeIndex = -1;

    if (currentSuggestions.length === 0) {
      dropdownElement.innerHTML = '<div style="padding:1rem; color:#49769f; text-align:center;">No matches</div>';
    } else {
      var html = '';
      for (var j = 0; j < currentSuggestions.length; j++) {
        var item = currentSuggestions[j];
        var countryText = item.country ? ', ' + item.country : '';
        html += 
          '<div class="autocomplete-option" data-index="' + j + '">' +
            '<div class="autocomplete-option-icon">✈</div>' +
            '<div class="autocomplete-option-info">' +
              '<span class="autocomplete-option-city">' + item.city + countryText + '</span>' +
              '<span class="autocomplete-option-airport">' + item.name + '</span>' +
            '</div>' +
            '<span class="autocomplete-option-badge">' + item.iata + '</span>' +
          '</div>';
      }
      dropdownElement.innerHTML = html;
    }
    dropdownElement.classList.add('show');
  }

  function selectAirport(index) {
    var selectedItem = currentSuggestions[index];
    if (!selectedItem) return;

    var countryText = selectedItem.country ? ', ' + selectedItem.country : '';
    var formattedValue = selectedItem.city + countryText + ' (' + selectedItem.iata + ')';
    inputElement.value = formattedValue;

    // Sync corresponding input pair if exists (e.g. departureFrom <-> fsbFrom)
    var inputSyncMap = {
      departureFrom: 'fsbFrom',
      fsbFrom: 'departureFrom',
      goingTo: 'fsbTo',
      fsbTo: 'goingTo'
    };

    var pairedId = inputSyncMap[inputId];
    if (pairedId) {
      var pairedInput = document.getElementById(pairedId);
      if (pairedInput) {
        pairedInput.value = formattedValue;
      }
    }

    dropdownElement.classList.remove('show');
    applyFilters(allFlights);
  }

  inputElement.addEventListener('focus', function() {
    hideAllDropdowns();
    renderSuggestions(inputElement.value.trim());
  });

  inputElement.addEventListener('input', function() {
    renderSuggestions(inputElement.value.trim());
  });

  dropdownElement.addEventListener('click', function(event) {
    var optionElement = event.target.closest('.autocomplete-option');
    if (optionElement) {
      var itemIndex = parseInt(optionElement.getAttribute('data-index'), 10);
      selectAirport(itemIndex);
    }
  });

  inputElement.addEventListener('keydown', function(event) {
    if (!dropdownElement.classList.contains('show')) return;

    if (event.key === 'Escape') {
      dropdownElement.classList.remove('show');
    } else if (event.key === 'Enter') {
      event.preventDefault();
      var idxToSelect = activeIndex >= 0 ? activeIndex : 0;
      selectAirport(idxToSelect);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      var direction = event.key === 'ArrowDown' ? 1 : -1;
      var totalCount = currentSuggestions.length;
      if (totalCount === 0) return;

      activeIndex = (activeIndex + direction + totalCount) % totalCount;
      var optionElements = dropdownElement.querySelectorAll('.autocomplete-option');
      for (var i = 0; i < optionElements.length; i++) {
        var opt = optionElements[i];
        if (i === activeIndex) {
          opt.classList.add('active');
          opt.scrollIntoView({ block: 'nearest' });
        } else {
          opt.classList.remove('active');
        }
      }
    }
  });
}

// Setup interactive calendar date picker dropdown
function setupCalendarPicker(inputId, dropdownId, allFlights) {
  var inputElement = document.getElementById(inputId);
  var dropdownElement = document.getElementById(dropdownId);
  if (!inputElement || !dropdownElement) return;

  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  var currentDate = new Date(2026, 7, 1);

  function parseFormattedDate(dateString) {
    if (!dateString) return null;
    var parts = dateString.split(', ');
    var mainPart = parts.length > 1 ? parts[1] : dateString;
    var tokens = mainPart.trim().split(/\s+/);
    if (tokens.length < 3) return null;

    var dayNum = parseInt(tokens[0], 10);
    var monthIndex = -1;
    for (var m = 0; m < SHORT_MONTHS.length; m++) {
      if (SHORT_MONTHS[m].toLowerCase() === tokens[1].toLowerCase()) {
        monthIndex = m;
        break;
      }
    }

    if (monthIndex === -1 || isNaN(dayNum)) return null;

    var yearNum = parseInt(tokens[2], 10);
    if (tokens[2].length === 2) {
      yearNum = 2000 + yearNum;
    }

    return new Date(yearNum, monthIndex, dayNum);
  }

  function renderCalendar() {
    var selectedDate = parseFormattedDate(inputElement.value);
    var year = currentDate.getFullYear();
    var month = currentDate.getMonth();

    var firstDayOfWeek = new Date(year, month, 1).getDay();
    var totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    var html = 
      '<div class="cal-header">' +
        '<button type="button" class="cal-nav-btn prev-month">&lsaquo;</button>' +
        '<span class="cal-title">' + MONTH_NAMES[month] + ' ' + year + '</span>' +
        '<button type="button" class="cal-nav-btn next-month">&rsaquo;</button>' +
      '</div>' +
      '<div class="cal-weekdays"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div>' +
      '<div class="cal-days-grid">';

    // Empty spaces for padding before start of month
    for (var empty = 0; empty < firstDayOfWeek; empty++) {
      html += '<div class="cal-day empty"></div>';
    }

    // Days of month
    for (var day = 1; day <= totalDaysInMonth; day++) {
      var isSelected = selectedDate && 
        selectedDate.getFullYear() === year && 
        selectedDate.getMonth() === month && 
        selectedDate.getDate() === day;

      var selectedClass = isSelected ? 'selected' : '';
      html += '<div class="cal-day ' + selectedClass + '" data-day="' + day + '">' + day + '</div>';
    }

    html += '</div>';
    dropdownElement.innerHTML = html;

    // Month Navigation Listeners
    var prevButton = dropdownElement.querySelector('.prev-month');
    if (prevButton) {
      prevButton.addEventListener('click', function(event) {
        event.stopPropagation();
        currentDate.setMonth(month - 1);
        renderCalendar();
      });
    }

    var nextButton = dropdownElement.querySelector('.next-month');
    if (nextButton) {
      nextButton.addEventListener('click', function(event) {
        event.stopPropagation();
        currentDate.setMonth(month + 1);
        renderCalendar();
      });
    }

    // Day Selection Listeners
    var dayElements = dropdownElement.querySelectorAll('.cal-day[data-day]');
    for (var d = 0; d < dayElements.length; d++) {
      (function(dayEl) {
        dayEl.addEventListener('click', function(event) {
          event.stopPropagation();
          var dayNum = parseInt(dayEl.getAttribute('data-day'), 10);
          var selectedDt = new Date(year, month, dayNum);
          
          var formattedDay = SHORT_DAYS[selectedDt.getDay()];
          var formattedMonth = SHORT_MONTHS[month];
          var shortYear = String(year).slice(-2);

          inputElement.value = formattedDay + ', ' + dayNum + ' ' + formattedMonth + ' ' + shortYear;
          dropdownElement.classList.remove('show');
          applyFilters(allFlights);
        });
      })(dayElements[d]);
    }
  }

  function openCalendar(event) {
    event.stopPropagation();
    hideAllDropdowns();

    var parsed = parseFormattedDate(inputElement.value);
    if (parsed) {
      currentDate = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
    }
    renderCalendar();
    dropdownElement.classList.add('show');
  }

  inputElement.addEventListener('click', openCalendar);

  if (inputElement.parentElement) {
    inputElement.parentElement.addEventListener('click', function(event) {
      var isClearBtn = event.target.id === 'fsbReturnClear' || event.target.closest('#fsbReturnClear');
      if (isClearBtn) return;
      if (event.target !== inputElement && !dropdownElement.contains(event.target)) {
        openCalendar(event);
      }
    });
  }
}

// Setup dropdown for selecting Travellers count
function setupTravellersDropdown(inputId, dropdownId, allFlights) {
  var inputElement = document.getElementById(inputId);
  var dropdownElement = document.getElementById(dropdownId);
  if (!inputElement || !dropdownElement) return;

  function renderMenu() {
    var currentValue = parseInt(inputElement.value, 10) || 1;
    var html = '<div class="autocomplete-header">SELECT TRAVELLERS (MAX 10)</div>';

    for (var count = 1; count <= 10; count++) {
      var activeClass = count === currentValue ? 'active' : '';
      var label = count === 1 ? '1 Adult' : count + ' Adults';
      var subText = count === 1 ? 'Single passenger' : (count === 10 ? 'Maximum group booking (10 persons)' : count + ' Passengers booking');
      var badgeText = count === 10 ? '10 Max' : count + (count === 1 ? ' Person' : ' Persons');
      var icon = count === 1 ? '👤' : '👥';

      html += 
        '<div class="traveller-option ' + activeClass + '" data-val="' + count + '">' +
          '<div class="traveller-info">' +
            '<div class="traveller-icon">' + icon + '</div>' +
            '<div>' +
              '<div class="traveller-label">' + label + '</div>' +
              '<div class="traveller-sub">' + subText + '</div>' +
            '</div>' +
          '</div>' +
          '<span class="traveller-badge">' + badgeText + '</span>' +
        '</div>';
    }
    dropdownElement.innerHTML = html;

    var options = dropdownElement.querySelectorAll('[data-val]');
    for (var i = 0; i < options.length; i++) {
      (function(opt) {
        opt.addEventListener('click', function(event) {
          event.stopPropagation();
          var countVal = parseInt(opt.getAttribute('data-val'), 10);
          inputElement.value = countVal === 1 ? '1 Adult' : countVal + ' Adults';
          dropdownElement.classList.remove('show');
          applyFilters(allFlights);
        });
      })(options[i]);
    }
  }

  function openMenu(event) {
    event.stopPropagation();
    hideAllDropdowns();
    renderMenu();
    dropdownElement.classList.add('show');
  }

  inputElement.addEventListener('click', openMenu);
  if (inputElement.parentElement) {
    inputElement.parentElement.addEventListener('click', function(event) {
      if (event.target !== inputElement && !dropdownElement.contains(event.target)) {
        openMenu(event);
      }
    });
  }
}

// Setup dropdown for selecting Trip Type (Round Trip / One Way)
function setupTripTypeDropdown(inputId, dropdownId, allFlights) {
  var inputElement = document.getElementById(inputId);
  var dropdownElement = document.getElementById(dropdownId);
  if (!inputElement || !dropdownElement) return;

  function renderMenu() {
    var currentValue = inputElement.value;
    var html = 
      '<div class="autocomplete-header">SELECT TRIP TYPE</div>' +
      '<div class="traveller-option ' + (currentValue === 'Round Trip' ? 'active' : '') + '" data-val="Round Trip">' +
        '<div class="traveller-info"><div class="traveller-icon">🔁</div><div><div class="traveller-label">Round Trip</div><div class="traveller-sub">Return flight included</div></div></div>' +
      '</div>' +
      '<div class="traveller-option ' + (currentValue === 'One Way' ? 'active' : '') + '" data-val="One Way">' +
        '<div class="traveller-info"><div class="traveller-icon">➡️</div><div><div class="traveller-label">One Way</div><div class="traveller-sub">Single directional flight</div></div></div>' +
      '</div>';

    dropdownElement.innerHTML = html;

    var options = dropdownElement.querySelectorAll('[data-val]');
    for (var i = 0; i < options.length; i++) {
      (function(opt) {
        opt.addEventListener('click', function(event) {
          event.stopPropagation();
          var typeVal = opt.getAttribute('data-val');
          inputElement.value = typeVal;

          var returnInput = document.getElementById('fsbReturn');
          var returnCard = returnInput ? returnInput.closest('.fsb-card') : null;

          if (typeVal === 'One Way') {
            if (returnInput) returnInput.value = '';
            if (returnCard) returnCard.style.opacity = '0.4';
          } else {
            if (returnInput && !returnInput.value) {
              returnInput.value = 'Fri, 7 Aug 26';
            }
            if (returnCard) returnCard.style.opacity = '1';
          }

          dropdownElement.classList.remove('show');
          applyFilters(allFlights);
        });
      })(options[i]);
    }
  }

  function openMenu(event) {
    event.stopPropagation();
    hideAllDropdowns();
    renderMenu();
    dropdownElement.classList.add('show');
  }

  inputElement.addEventListener('click', openMenu);
  if (inputElement.parentElement) {
    inputElement.parentElement.addEventListener('click', function(event) {
      if (event.target !== inputElement && !dropdownElement.contains(event.target)) {
        openMenu(event);
      }
    });
  }
}

// Setup dropdown for Cabin Class selection (Flights Search Bar)
function setupCabinClassDropdown(inputId, dropdownId, allFlights) {
  var inputElement = document.getElementById(inputId);
  var dropdownElement = document.getElementById(dropdownId);
  if (!inputElement || !dropdownElement) return;

  var cabinOptions = [
    { label: 'Economy / Premium', sub: 'Standard & extra legroom seats', icon: '🪑' },
    { label: 'Business Class', sub: 'Lie-flat seats & lounge access', icon: '💼' },
    { label: 'First Class', sub: 'Private suite & luxury service', icon: '👑' }
  ];

  function renderMenu() {
    var currentValue = inputElement.value;
    var html = '<div class="autocomplete-header">SELECT CABIN CLASS</div>';

    for (var i = 0; i < cabinOptions.length; i++) {
      var opt = cabinOptions[i];
      var firstWord = opt.label.split(' ')[0];
      var activeClass = currentValue.includes(firstWord) ? 'active' : '';

      html += 
        '<div class="traveller-option ' + activeClass + '" data-val="' + opt.label + '">' +
          '<div class="traveller-info">' +
            '<div class="traveller-icon">' + opt.icon + '</div>' +
            '<div>' +
              '<div class="traveller-label">' + opt.label + '</div>' +
              '<div class="traveller-sub">' + opt.sub + '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
    }

    dropdownElement.innerHTML = html;

    var options = dropdownElement.querySelectorAll('[data-val]');
    for (var j = 0; j < options.length; j++) {
      (function(opt) {
        opt.addEventListener('click', function(event) {
          event.stopPropagation();
          var cabinVal = opt.getAttribute('data-val');
          inputElement.value = cabinVal;
          dropdownElement.classList.remove('show');
          applyFilters(allFlights);
        });
      })(options[j]);
    }
  }

  function openMenu(event) {
    event.stopPropagation();
    hideAllDropdowns();
    renderMenu();
    dropdownElement.classList.add('show');
  }

  inputElement.addEventListener('click', openMenu);
  if (inputElement.parentElement) {
    inputElement.parentElement.addEventListener('click', function(event) {
      if (event.target !== inputElement && !dropdownElement.contains(event.target)) {
        openMenu(event);
      }
    });
  }
}

// Setup dropdown for Travellers Class selection
function setupTravellersClassDropdown(inputId, dropdownId, allFlights) {
  var inputElement = document.getElementById(inputId);
  var dropdownElement = document.getElementById(dropdownId);
  if (!inputElement || !dropdownElement) return;

  var cabinOptions = [
    { label: 'Economy', sub: 'Standard seating' },
    { label: 'Premium Economy', sub: 'Extra legroom & comfort' },
    { label: 'Business Class', sub: 'Lie-flat seats & lounge access' },
    { label: 'First Class', sub: 'Luxury private suite' }
  ];

  function renderMenu() {
    var currentValue = inputElement.value;
    var html = '<div class="autocomplete-header">SELECT CABIN CLASS</div>';

    for (var i = 0; i < cabinOptions.length; i++) {
      var opt = cabinOptions[i];
      var activeClass = currentValue === opt.label ? 'active' : '';

      html += 
        '<div class="autocomplete-option ' + activeClass + '" data-val="' + opt.label + '">' +
          '<div class="autocomplete-option-info">' +
            '<span class="autocomplete-option-city">' + opt.label + '</span>' +
            '<span class="autocomplete-option-airport">' + opt.sub + '</span>' +
          '</div>' +
        '</div>';
    }

    dropdownElement.innerHTML = html;

    var options = dropdownElement.querySelectorAll('[data-val]');
    for (var j = 0; j < options.length; j++) {
      (function(opt) {
        opt.addEventListener('click', function(event) {
          event.stopPropagation();
          var val = opt.getAttribute('data-val');
          inputElement.value = val;
          dropdownElement.classList.remove('show');
          applyFilters(allFlights);
        });
      })(options[j]);
    }
  }

  function openMenu(event) {
    event.stopPropagation();
    hideAllDropdowns();
    renderMenu();
    dropdownElement.classList.add('show');
  }

  inputElement.addEventListener('click', openMenu);
  if (inputElement.parentElement) {
    inputElement.parentElement.addEventListener('click', function(event) {
      if (event.target !== inputElement && !dropdownElement.contains(event.target)) {
        openMenu(event);
      }
    });
  }
}

// ── Application Initialization ──

async function initApp() {
  // Wait for HTML components to finish loading if needed
  if (window.componentsLoadedPromise) {
    await window.componentsLoadedPromise;
  }

  // Load flights & airports data
  var data = await loadData();
  var allFlights = data.flights;
  var allAirports = data.airports;

  var debouncedSearch = debounce(function() {
    applyFilters(allFlights);
  }, 120);

  // Populate dynamic airline checkboxes
  var airlineBox = document.getElementById('airlineFilters');
  if (airlineBox) {
    var airlineNames = [];
    for (var i = 0; i < allFlights.length; i++) {
      var name = allFlights[i].airline;
      if (name && !airlineNames.includes(name)) {
        airlineNames.push(name);
      }
    }
    airlineNames.sort();

    var airlineCheckboxesHtml = '';
    for (var j = 0; j < airlineNames.length; j++) {
      var airlineName = airlineNames[j];
      airlineCheckboxesHtml += 
        '<label class="checkbox-label">' +
          '<input type="checkbox" class="airline-filter" value="' + airlineName + '"> ' + airlineName +
        '</label>';
    }
    airlineBox.innerHTML = airlineCheckboxesHtml;
  }

  // Initial filter run & global trigger registration
  applyFilters(allFlights);
  window.triggerFlightsRefresh = function() {
    applyFilters(allFlights);
  };

  // Setup airport autocomplete inputs
  setupAirportAutocomplete('departureFrom', 'departureFromDropdown', allAirports, allFlights);
  setupAirportAutocomplete('goingTo', 'goingToDropdown', allAirports, allFlights);
  setupAirportAutocomplete('fsbFrom', 'fsbFromDropdown', allAirports, allFlights);
  setupAirportAutocomplete('fsbTo', 'fsbToDropdown', allAirports, allFlights);

  // Setup date pickers and menu dropdowns
  setupCalendarPicker('fsbDepart', 'fsbDepartDropdown', allFlights);
  setupCalendarPicker('fsbReturn', 'fsbReturnDropdown', allFlights);
  setupTravellersDropdown('fsbTravellers', 'fsbTravellersDropdown', allFlights);
  setupTripTypeDropdown('fsbTripType', 'fsbTripTypeDropdown', allFlights);
  setupCabinClassDropdown('fsbCabin', 'fsbCabinDropdown', allFlights);
  setupTravellersClassDropdown('travellersClass', 'travellersClassDropdown', allFlights);

  // Synchronize input fields (Hero search bar <-> Flights page bar)
  function syncInputs(id1, id2) {
    var elem1 = document.getElementById(id1);
    var elem2 = document.getElementById(id2);
    if (elem1 && elem2) {
      elem1.addEventListener('input', function() {
        elem2.value = elem1.value;
        debouncedSearch();
      });
      elem2.addEventListener('input', function() {
        elem1.value = elem2.value;
        debouncedSearch();
      });
    }
  }
  syncInputs('departureFrom', 'fsbFrom');
  syncInputs('goingTo', 'fsbTo');

  // Clear return date button listener
  var clearReturnButton = document.getElementById('fsbReturnClear');
  if (clearReturnButton) {
    clearReturnButton.addEventListener('click', function(event) {
      event.stopPropagation();
      var returnInput = document.getElementById('fsbReturn');
      if (returnInput) {
        returnInput.value = '';
      }
      applyFilters(allFlights);
    });
  }

  // Hero search button listener
  var searchButton = document.getElementById('searchBtn');
  if (searchButton) {
    searchButton.addEventListener('click', function() {
      var heroFrom = document.getElementById('departureFrom');
      var heroTo = document.getElementById('goingTo');
      var barFrom = document.getElementById('fsbFrom');
      var barTo = document.getElementById('fsbTo');
      var messageElement = document.getElementById('resultsMsg');

      var heroFromVal = heroFrom ? heroFrom.value.trim() : '';
      var heroToVal = heroTo ? heroTo.value.trim() : '';
      var barFromVal = barFrom ? barFrom.value.trim() : '';
      var barToVal = barTo ? barTo.value.trim() : '';

      if (!heroFromVal && !heroToVal && !barFromVal && !barToVal) {
        if (messageElement) {
          messageElement.textContent = 'Please enter origin or destination city.';
        }
        return;
      }

      if (heroFrom && barFrom) {
        if (heroFrom.value) barFrom.value = heroFrom.value;
        else if (barFrom.value) heroFrom.value = barFrom.value;
      }

      if (heroTo && barTo) {
        if (heroTo.value) barTo.value = heroTo.value;
        else if (barTo.value) heroTo.value = barTo.value;
      }

      var heroView = document.getElementById('hero-view');
      var flightsView = document.getElementById('flights-view');
      if (heroView) heroView.style.display = 'none';
      if (flightsView) flightsView.style.display = 'block';

      applyFilters(allFlights);
      window.location.hash = '#flights';

      var navLinks = document.querySelectorAll('.nav-link');
      for (var i = 0; i < navLinks.length; i++) {
        var link = navLinks[i];
        var route = link.getAttribute('data-route');
        var href = link.getAttribute('href') || '';
        if (route === 'flights' || href.includes('flights')) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Search bar and filter event listeners
  var fsbSearchBtn = document.getElementById('fsbSearchBtn');
  if (fsbSearchBtn) {
    fsbSearchBtn.addEventListener('click', function() {
      applyFilters(allFlights);
    });
  }

  var flightSearchInput = document.getElementById('flightSearch');
  if (flightSearchInput) {
    flightSearchInput.addEventListener('input', function() {
      debouncedSearch();
    });
  }

  var nonStopCheckbox = document.getElementById('nonStop');
  if (nonStopCheckbox) {
    nonStopCheckbox.addEventListener('change', function() {
      applyFilters(allFlights);
    });
  }

  // Swap location inputs function & buttons
  function swapLocations(fromId1, toId1, fromId2, toId2) {
    var fromElem1 = document.getElementById(fromId1);
    var toElem1 = document.getElementById(toId1);
    if (fromElem1 && toElem1) {
      var temp = fromElem1.value;
      fromElem1.value = toElem1.value;
      toElem1.value = temp;
    }

    var fromElem2 = document.getElementById(fromId2);
    var toElem2 = document.getElementById(toId2);
    if (fromElem2 && toElem2) {
      var temp2 = fromElem2.value;
      fromElem2.value = toElem2.value;
      toElem2.value = temp2;
    }

    applyFilters(allFlights);
  }

  var swapBtn = document.getElementById('swapBtn');
  if (swapBtn) {
    swapBtn.addEventListener('click', function() {
      swapLocations('departureFrom', 'goingTo', 'fsbFrom', 'fsbTo');
    });
  }

  var fsbSwapBtn = document.getElementById('fsbSwap');
  if (fsbSwapBtn) {
    fsbSwapBtn.addEventListener('click', function() {
      swapLocations('fsbFrom', 'fsbTo', 'departureFrom', 'goingTo');
    });
  }

  // Price range slider & currency dropdown listeners
  var priceRangeInput = document.getElementById('priceRange');
  if (priceRangeInput) {
    priceRangeInput.addEventListener('input', function(event) {
      var priceDisplay = document.getElementById('priceValue');
      if (priceDisplay) {
        priceDisplay.textContent = formatPrice(parseInt(event.target.value, 10));
      }
      debouncedSearch();
    });
  }

  var currencySelectInput = document.getElementById('currencySelect');
  if (currencySelectInput) {
    currencySelectInput.addEventListener('change', function(event) {
      window.currentCurrency = event.target.value;
      var priceSlider = document.getElementById('priceRange');
      var priceDisplay = document.getElementById('priceValue');
      if (priceSlider && priceDisplay) {
        priceDisplay.textContent = formatPrice(parseInt(priceSlider.value, 10));
      }
      applyFilters(allFlights);
    });
  }

  // Dynamic checkbox change listener for stop & airline filters
  document.addEventListener('change', function(event) {
    if (event.target && (event.target.classList.contains('stop-filter') || event.target.classList.contains('airline-filter'))) {
      applyFilters(allFlights);
    }
  });

  // Global click listener to hide dropdowns when clicking outside flight fields
  document.addEventListener('click', function(event) {
    if (!event.target.closest('.flight-field')) {
      hideAllDropdowns();
    }
  });

  // Navigation link clicks handler
  var navLinks = document.querySelectorAll('.nav-link');
  for (var k = 0; k < navLinks.length; k++) {
    (function(link) {
      link.addEventListener('click', function(event) {
        var route = link.getAttribute('data-route');
        var href = link.getAttribute('href') || '';
        
        var isHomeLink = route === 'home' || href.includes('#home');
        var isFlightsLink = route === 'flights' || href.includes('#flights');
        var isHashLink = href === '#';

        if (isHomeLink || isFlightsLink || isHashLink) {
          var heroView = document.getElementById('hero-view');
          var flightsView = document.getElementById('flights-view');

          if (heroView && flightsView) {
            event.preventDefault();
            
            var allLinks = document.querySelectorAll('.nav-link');
            for (var l = 0; l < allLinks.length; l++) {
              allLinks[l].classList.remove('active');
            }
            link.classList.add('active');

            var navToggle = document.getElementById('nav-toggle');
            if (navToggle) {
              navToggle.checked = false;
            }

            if (isHomeLink) {
              heroView.style.display = 'block';
              flightsView.style.display = 'none';
              window.location.hash = '#home';
            } else {
              heroView.style.display = 'none';
              flightsView.style.display = 'block';
              window.location.hash = '#flights';
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
      });
    })(navLinks[k]);
  }
}

// Start application
initApp();
