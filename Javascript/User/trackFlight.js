// URLs for flight and airport data lists
const FLIGHTS_URL = '../../../Data/flights.json';
const AIRPORTS_URL = '../../../Data/airports.json';

// Global variables to hold flight and airport databases
let flights = [];
let airports = [];

// Leaflet map and tracking variables
let map = null;
let planeMarker = null;
let pathLine = null;
let originMarker = null;
let destMarker = null;
let activeTrackingInterval = null;

// OpenSky Live API tracking state variables
let currentTab = 'trending'; // Tracks which tab is open ('trending' or 'live')
let liveFlightsList = []; // Holds list of active OpenSky flights currently in-air
let isTrackingLiveApiFlight = false; // Flag to indicate if currently tracking an API live flight
let livePollingInterval = null; // OpenSky polling timer
let liveTrailLine = null; // Leaflet polyline for flight path history trail
let liveCoordinatesHistory = []; // Coordinates list for active live flight breadcrumbs
let liveRefreshTimer = null; // Timer to refresh the list of live flights on the UI

// Simulated telemetry state variables
let currentFlight = null;
let currentProgress = 30; // Starts at 30% and increments
let baseAltitude = 34000;
let baseSpeed = 520;
let computedHeading = 90;
let simulatedGates = { dep: '', arr: '' };

// Most Tracked local flights (with fluctuating active tracker counts)
let mostTrackedFlightsData = [
    { flightNumber: 'EM10000', airline: 'Emirates', fromCode: 'GKA', toCode: 'CMU', baseTrackers: 1842, time: '05:30 AM', aircraft: 'Boeing 777-300ER' },
    { flightNumber: 'UN10001', airline: 'United Airlines', fromCode: 'MAG', toCode: 'GKA', baseTrackers: 1654, time: '07:00 AM', aircraft: 'Boeing 737 Max 9' },
    { flightNumber: 'LU10002', airline: 'Lufthansa', fromCode: 'HGU', toCode: 'WBM', baseTrackers: 1425, time: '08:30 AM', aircraft: 'Airbus A350-900' },
    { flightNumber: 'AI10003', airline: 'Air India', fromCode: 'LAE', toCode: 'BUL', baseTrackers: 1302, time: '10:00 AM', aircraft: 'Boeing 777-200LR' },
    { flightNumber: 'SI10004', airline: 'Singapore Airlines', fromCode: 'POM', toCode: 'EFG', baseTrackers: 1208, time: '11:30 AM', aircraft: 'Boeing 787-10' },
    { flightNumber: 'BR10005', airline: 'British Airways', fromCode: 'WWK', toCode: 'WBM', baseTrackers: 1115, time: '01:00 PM', aircraft: 'Boeing 777-300ER' },
    { flightNumber: 'QA10006', airline: 'Qantas', fromCode: 'UAK', toCode: 'JNS', baseTrackers: 994, time: '02:30 PM', aircraft: 'Airbus A330-300' },
    { flightNumber: 'AF10007', airline: 'Air France', fromCode: 'GOH', toCode: 'JSU', baseTrackers: 882, time: '04:00 PM', aircraft: 'Airbus A350-900' },
    { flightNumber: 'QR10008', airline: 'Qatar Airways', fromCode: 'SFJ', toCode: 'JHS', baseTrackers: 779, time: '05:30 PM', aircraft: 'Airbus A380-800' },
    { flightNumber: 'TU10009', airline: 'Turkish Airlines', fromCode: 'THU', toCode: 'NAQ', baseTrackers: 663, time: '07:00 PM', aircraft: 'Boeing 777-300ER' },
    { flightNumber: 'KL10010', airline: 'KLM', fromCode: 'AEY', toCode: 'HZK', baseTrackers: 554, time: '08:30 PM', aircraft: 'Boeing 787-9' },
    { flightNumber: 'IB10011', airline: 'Iberia', fromCode: 'EGS', toCode: 'NOR', baseTrackers: 421, time: '10:00 PM', aircraft: 'Airbus A320neo' }
];

// Entry point: Triggered automatically as soon as the HTML document is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // 1. Load Navbar and Footer templates dynamically
    loadGlobalComponents(function() {
        // 2. Once global components are loaded, load flight/airport databases
        loadDatabase(function() {
            // 3. Initialize search panel UI events and tab actions
            initTabs();
            initAutocomplete();
            initSearchHandlers();
            initMostTrackedSection();

            // Warm up cache: Fetch initial list of live air radar traffic in background
            fetchOpenSkyData(function(data) {
                if (data) {
                    liveFlightsList = processOpenSkyStates(data);
                } else {
                    liveFlightsList = getMockLiveFlights();
                }
            });

            // Check if a specific flight number was passed inside URL search queries
            checkUrlQuery();
        });
    });
});

// Load global header and footer dynamically using fetch requests
function loadGlobalComponents(callback) {
    fetch('../globalcomp/navbar.html')
        .then(function(res) {
            if (res.ok) {
                return res.text();
            }
            return '';
        })
        .then(function(navbarHtml) {
            if (navbarHtml !== '') {
                document.getElementById('navbar-container').innerHTML = navbarHtml;
                if (typeof initSkyFlowPage === 'function') {
                    initSkyFlowPage('track');
                } else {
                    patchNavbarPaths();
                }
            }
            return fetch('../globalcomp/footer.html');
        })
        .then(function(res) {
            if (res.ok) {
                return res.text();
            }
            return '';
        })
        .then(function(footerHtml) {
            if (footerHtml !== '') {
                document.getElementById('footer-container').innerHTML = footerHtml;
                patchFooterPaths();
            }
            if (callback) callback();
        })
        .catch(function(error) {
            console.error('Error loading global components:', error);
            if (callback) callback();
        });
}

// Adjust navigation links within dynamically loaded navbar to match sub-folder location
function patchNavbarPaths() {
    const navbar = document.getElementById('navbar-container');
    if (!navbar) return;

    const links = navbar.querySelectorAll('.nav-link');
    for (let i = 0; i < links.length; i++) {
        const link = links[i];
        const text = link.textContent.trim().toLowerCase();
        link.classList.remove('active');
        
        if (text === 'home') {
            link.href = '../index.html';
        } else if (text === 'flights') {
            link.href = '../index.html#flights';
        } else if (text === 'track flight') {
            link.href = 'trackFlight.html';
            link.classList.add('active');
        } else if (text === 'my bookings') {
            link.href = '../mybookings/mybookings.html';
        } else if (text === 'help') {
            link.href = '../help/help.html';
        } else if (text === 'offers') {
            link.href = '../index.html#offers';
        }
    }

    const logoLink = navbar.querySelector('.navbar-logo');
    if (logoLink) {
        logoLink.href = '../index.html';
    }
    const logoImg = navbar.querySelector('.logo-gif');
    if (logoImg) {
        logoImg.src = '../../../images/navbar logo.gif';
    }

    // Bind authentication sign-in drawer triggers
    window.openDrawer = function() {
        window.location.href = '../index.html?auth=true';
    };
}

// Adjust links inside dynamically loaded footer to link to root directory
function patchFooterPaths() {
    const footer = document.getElementById('footer-container');
    if (!footer) return;
    
    const links = footer.querySelectorAll('a');
    for (let i = 0; i < links.length; i++) {
        const link = links[i];
        const href = link.getAttribute('href');
        if (href && href.indexOf('http') !== 0 && href.indexOf('#') !== 0) {
            link.href = '../' + href;
        }
    }
}

// Read flights database and airports coordinates from local files
function loadDatabase(callback) {
    fetch(FLIGHTS_URL)
        .then(function(res) {
            if (res.ok) {
                return res.json();
            }
            return [];
        })
        .then(function(flightsData) {
            flights = flightsData;
            return fetch(AIRPORTS_URL);
        })
        .then(function(res) {
            if (res.ok) {
                return res.json();
            }
            return [];
        })
        .then(function(airportsData) {
            airports = airportsData;
            if (callback) callback();
        })
        .catch(function(error) {
            console.error('Error loading airport/flight databases:', error);
            if (callback) callback();
        });
}

// Check if a flight code query exists in the URL parameters and execute tracking immediately
function checkUrlQuery() {
    const urlParams = new URLSearchParams(window.location.search);
    const flightQuery = urlParams.get('flight');
    if (flightQuery) {
        document.getElementById('trackFlightNumber').value = flightQuery;
        trackFlightByNumber(flightQuery);
    }
}

// Manage tab swapping buttons (Flight Number vs Route Search)
function initTabs() {
    const tabBtns = document.querySelectorAll('.track-tab-btn');
    for (let i = 0; i < tabBtns.length; i++) {
        const btn = tabBtns[i];
        btn.addEventListener('click', function() {
            for (let j = 0; j < tabBtns.length; j++) {
                tabBtns[j].classList.remove('active');
            }
            btn.classList.add('active');

            const selectedTab = btn.getAttribute('data-tab');
            const paneNumber = document.getElementById('pane-flight-number');
            const paneRoute = document.getElementById('pane-route');

            if (selectedTab === 'flight-number') {
                paneNumber.style.display = 'block';
                paneRoute.style.display = 'none';
            } else {
                paneNumber.style.display = 'none';
                paneRoute.style.display = 'block';
            }
            document.getElementById('trackResult').textContent = '';
        });
    }
}

// Set up suggestions autocompletion on search input forms
function initAutocomplete() {
    setupAutocompleteField('trackFrom', 'trackFromDropdown');
    setupAutocompleteField('trackTo', 'trackToDropdown');
}

// Build suggestion panel filters using simple loop indices
function setupAutocompleteField(inputId, dropdownId) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    if (!input || !dropdown) return;

    input.addEventListener('input', function() {
        const query = input.value.trim().toLowerCase();
        dropdown.innerHTML = '';
        
        if (query.length < 2) {
            dropdown.style.display = 'none';
            return;
        }

        // Loop array values to find matches
        const filtered = [];
        for (let i = 0; i < airports.length; i++) {
            const ap = airports[i];
            const cityMatch = ap.city && ap.city.toLowerCase().indexOf(query) !== -1;
            const nameMatch = ap.name && ap.name.toLowerCase().indexOf(query) !== -1;
            const iataMatch = ap.iata && ap.iata.toLowerCase().indexOf(query) !== -1;
            
            if (cityMatch || nameMatch || iataMatch) {
                filtered.push(ap);
                if (filtered.length >= 5) {
                    break; // Cap search results to 5 items
                }
            }
        }

        if (filtered.length === 0) {
            dropdown.style.display = 'none';
            return;
        }

        // Render matching suggestion items
        for (let i = 0; i < filtered.length; i++) {
            const ap = filtered[i];
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = '<strong>' + ap.iata + '</strong> - ' + ap.city + ', ' + ap.name;
            
            item.addEventListener('click', function() {
                input.value = ap.city + ' (' + ap.iata + ')';
                dropdown.style.display = 'none';
            });
            dropdown.appendChild(item);
        }
        dropdown.style.display = 'block';
    });

    // Close autocompletion elements if user clicks anywhere else
    document.addEventListener('click', function(e) {
        if (e.target !== input && e.target !== dropdown) {
            dropdown.style.display = 'none';
        }
    });
}

// Register click events for both search panels
function initSearchHandlers() {
    const btnNumber = document.getElementById('trackBtnNumber');
    const btnRoute = document.getElementById('trackBtnRoute');

    if (btnNumber) {
        btnNumber.addEventListener('click', function() {
            const num = document.getElementById('trackFlightNumber').value.trim();
            trackFlightByNumber(num);
        });
    }

    if (btnRoute) {
        btnRoute.addEventListener('click', function() {
            const fromVal = document.getElementById('trackFrom').value;
            const toVal = document.getElementById('trackTo').value;
            trackFlightByRoute(fromVal, toVal);
        });
    }
}

// Search database using standard loops to locate flight objects by code number
function trackFlightByNumber(flightNumber) {
    const resultMsg = document.getElementById('trackResult');
    if (!flightNumber) {
        resultMsg.textContent = 'Please enter a flight number.';
        return;
    }

    const code = flightNumber.trim().toUpperCase();
    
    // Look up inside local database
    const matched = [];
    for (let i = 0; i < flights.length; i++) {
        if (flights[i].flightNumber.toUpperCase() === code) {
            matched.push(flights[i]);
        }
    }

    if (matched.length === 0) {
        // Look up inside the active OpenSky live aircraft traffic list
        let liveMatched = null;
        for (let i = 0; i < liveFlightsList.length; i++) {
            if (liveFlightsList[i].flightNumber.toUpperCase() === code) {
                liveMatched = liveFlightsList[i];
                break;
            }
        }

        if (liveMatched !== null) {
            resultMsg.textContent = '';
            
            // Display dashboard container
            const dashboard = document.getElementById('trackingDashboard');
            dashboard.style.display = 'block';
            
            const grid = document.querySelector('.dashboard-grid');
            if (grid) {
                grid.className = 'dashboard-grid no-sidebar';
            }
            document.getElementById('matchedFlightsList').style.display = 'none';

            // Start plotting active live tracker route details
            startLiveApiTracking(liveMatched);
            
            document.getElementById('trackingDashboard').scrollIntoView({ behavior: 'smooth' });
            return;
        }

        resultMsg.textContent = 'Flight number not found in database or active live radar.';
        return;
    }

    resultMsg.textContent = '';
    displayDashboardAndTrack(matched);
}

// Search local database using standard loops to locate flight items by route
function trackFlightByRoute(fromVal, toVal) {
    const resultMsg = document.getElementById('trackResult');
    if (!fromVal || !toVal) {
        resultMsg.textContent = 'Please fill out both departure and arrival fields.';
        return;
    }

    // Helper function to extract IATA code inside parentheses e.g. "Goroka (GKA)" -> "GKA"
    const getIATA = function(val) {
        const startIdx = val.indexOf('(');
        const endIdx = val.indexOf(')');
        if (startIdx !== -1 && endIdx !== -1) {
            return val.substring(startIdx + 1, endIdx).toUpperCase().trim();
        }
        return val.toUpperCase().trim();
    };

    const fromCode = getIATA(fromVal);
    const toCode = getIATA(toVal);

    const matched = [];
    for (let i = 0; i < flights.length; i++) {
        const f = flights[i];
        const depMatch = f.fromAirportCode.toUpperCase() === fromCode || f.originCity.toUpperCase() === fromCode;
        const arrMatch = f.toAirportCode.toUpperCase() === toCode || f.destinationCity.toUpperCase() === toCode;
        if (depMatch && arrMatch) {
            matched.push(f);
        }
    }

    if (matched.length === 0) {
        resultMsg.textContent = 'No active flights found on this route.';
        return;
    }

    resultMsg.textContent = '';
    displayDashboardAndTrack(matched);
}

// Prepare dashboard view elements based on matches count
function displayDashboardAndTrack(matchedFlights) {
    const dashboard = document.getElementById('trackingDashboard');
    dashboard.style.display = 'block';

    const sidebar = document.getElementById('matchedFlightsList');
    const resultsGrid = document.getElementById('resultsGrid');
    const grid = document.querySelector('.dashboard-grid');

    // If multiple flights match, show list in sidebar for selection
    if (matchedFlights.length > 1) {
        if (grid) {
            grid.className = 'dashboard-grid has-sidebar';
        }
        sidebar.style.display = 'block';
        resultsGrid.innerHTML = '';

        for (let i = 0; i < matchedFlights.length; i++) {
            const flight = matchedFlights[i];
            const card = document.createElement('div');
            card.className = 'flight-compact-card';
            if (i === 0) card.className += ' active';
            
            card.innerHTML = 
                '<div class="compact-card-header">' +
                    '<span>' + flight.airline + '</span>' +
                    '<span>' + flight.flightNumber + '</span>' +
                '</div>' +
                '<div class="compact-card-route">' + flight.fromAirportCode + ' ✈ ' + flight.toAirportCode + '</div>' +
                '<div class="compact-card-details">' +
                    '<span>Dep: ' + flight.departureTime + '</span>' +
                    '<span>Status: ' + flight.status + '</span>' +
                '</div>';
            
            card.addEventListener('click', function() {
                const allCards = document.querySelectorAll('.flight-compact-card');
                for (let k = 0; k < allCards.length; k++) {
                    allCards[k].classList.remove('active');
                }
                card.classList.add('active');
                startLiveTracking(flight);
            });
            resultsGrid.appendChild(card);
        }

        // Track first item by default
        startLiveTracking(matchedFlights[0]);
    } else {
        if (grid) {
            grid.className = 'dashboard-grid no-sidebar';
        }
        sidebar.style.display = 'none';
        startLiveTracking(matchedFlights[0]);
    }

    document.getElementById('trackingDashboard').scrollIntoView({ behavior: 'smooth' });
}

// Leaflet map setup and coordinate simulation intervals
function startLiveTracking(flight) {
    if (activeTrackingInterval) clearInterval(activeTrackingInterval);
    if (livePollingInterval) {
        clearInterval(livePollingInterval);
        livePollingInterval = null;
    }
    isTrackingLiveApiFlight = false;

    currentFlight = flight;
    
    // Find airport coordinates by looping airports list
    let depAp = null;
    let arrAp = null;
    for (let i = 0; i < airports.length; i++) {
        if (airports[i].iata === flight.fromAirportCode) depAp = airports[i];
        if (airports[i].iata === flight.toAirportCode) arrAp = airports[i];
    }

    if (depAp === null || arrAp === null) {
        console.error('Geocoding coordinates failed for route airports.');
        return;
    }

    // Toggle standby screen views
    document.getElementById('radarPlaceholderMsg').style.display = 'none';
    document.getElementById('telemetryPanel').style.display = 'flex';
    
    if (map !== null) {
        setTimeout(function() {
            map.invalidateSize();
        }, 100);
    }

    const progressPlane = document.getElementById('progressBarPlane');
    if (progressPlane) {
        progressPlane.classList.remove('is-live');
    }

    // Map initialization
    if (map === null) {
        map = L.map('trackingMap').setView([20, 0], 2);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);
    }

    // Clear existing overlay features
    if (planeMarker) map.removeLayer(planeMarker);
    if (pathLine) map.removeLayer(pathLine);
    if (originMarker) map.removeLayer(originMarker);
    if (destMarker) map.removeLayer(destMarker);
    if (liveTrailLine !== null) {
        map.removeLayer(liveTrailLine);
        liveTrailLine = null;
    }

    const depCoords = [depAp.latitude, depAp.longitude];
    const arrCoords = [arrAp.latitude, arrAp.longitude];

    const locationIcon = function(label) {
        return L.divIcon({
            className: 'custom-location-marker',
            html: '<div style="background-color:#fff; color:#0f2640; border: 2px solid #7bbde8; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:800; box-shadow: 0 0 10px rgba(0,0,0,0.5);">' + label + '</div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
    };

    originMarker = L.marker(depCoords, { icon: locationIcon(flight.fromAirportCode) }).addTo(map)
        .bindPopup('<b>' + depAp.name + '</b><br>' + depAp.city + ', ' + depAp.country);
    
    destMarker = L.marker(arrCoords, { icon: locationIcon(flight.toAirportCode) }).addTo(map)
        .bindPopup('<b>' + arrAp.name + '</b><br>' + arrAp.city + ', ' + arrAp.country);

    // Plot dashed path route line
    pathLine = L.polyline([depCoords, arrCoords], {
        color: '#7bbde8',
        weight: 3,
        dashArray: '6, 9',
        opacity: 0.75
    }).addTo(map);

    // Compute direct flight bearing angle
    computedHeading = calculateBearing(depAp.latitude, depAp.longitude, arrAp.latitude, arrAp.longitude);

    const planeIcon = L.divIcon({
        className: 'leaflet-plane-marker',
        html: '<div id="mapPlaneIcon" style="transform: rotate(' + (computedHeading - 90) + 'deg); font-size: 28px; line-height: 28px; text-shadow: 0 0 8px #7bbde8; cursor: pointer;">✈️</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
    });

    planeMarker = L.marker(depCoords, { icon: planeIcon }).addTo(map);
    map.fitBounds([depCoords, arrCoords], { padding: [55, 55] });

    // Seed simulated tracking metrics variables
    currentProgress = Math.floor(Math.random() * 45) + 20; // Starts flight at random 20% to 65% complete
    baseAltitude = 32000 + Math.floor(Math.random() * 6000); 
    baseSpeed = 500 + Math.floor(Math.random() * 60); 
    simulatedGates.dep = 'T' + (Math.floor(Math.random() * 3) + 1) + ', Gate ' + String.fromCharCode(65 + Math.floor(Math.random() * 6)) + (Math.floor(Math.random() * 15) + 1);
    simulatedGates.arr = 'T' + (Math.floor(Math.random() * 3) + 1) + ', Gate ' + String.fromCharCode(65 + Math.floor(Math.random() * 6)) + (Math.floor(Math.random() * 15) + 1);

    updateTelemetryUI(depAp, arrAp);

    // Dynamic flight coordinates simulation loop
    activeTrackingInterval = setInterval(function() {
        currentProgress += 0.05; // Increment progress fraction
        
        if (currentProgress >= 100) {
            currentProgress = 100;
            clearInterval(activeTrackingInterval);
        }

        // Interpolate coordinate path position
        const curLat = depAp.latitude + (arrAp.latitude - depAp.latitude) * (currentProgress / 100);
        const curLng = depAp.longitude + (arrAp.longitude - depAp.longitude) * (currentProgress / 100);
        
        planeMarker.setLatLng([curLat, curLng]);
        
        const newHeading = calculateBearing(curLat, curLng, arrAp.latitude, arrAp.longitude);
        const planeEl = document.getElementById('mapPlaneIcon');
        if (planeEl) {
            planeEl.style.transform = 'rotate(' + (newHeading - 90) + 'deg)';
        }

        updateTelemetryUI(depAp, arrAp);
    }, 1000);
}

// Refresh telemetry metrics in the left-hand HTML dashboard
function updateTelemetryUI(depAp, arrAp) {
    if (!currentFlight) return;

    document.getElementById('telAirline').textContent = currentFlight.airline;
    document.getElementById('telFlightNo').textContent = currentFlight.flightNumber;
    
    let planeModel = 'Boeing 787-9 Dreamliner';
    if (currentFlight.airline === 'Emirates') planeModel = 'Boeing 777-300ER';
    else if (currentFlight.airline === 'Lufthansa') planeModel = 'Airbus A350-900';
    else if (currentFlight.airline === 'Singapore Airlines') planeModel = 'Boeing 787-10';
    else if (currentFlight.airline === 'United Airlines') planeModel = 'Boeing 737 Max 9';
    else if (currentFlight.airline === 'Air India') planeModel = 'Boeing 777-200LR';
    document.getElementById('telAircraft').textContent = planeModel;

    const statusPill = document.getElementById('telemetryStatus');
    statusPill.textContent = currentFlight.status.toUpperCase();
    statusPill.className = 'pill';
    if (currentFlight.status === 'On Time' || currentFlight.status === 'Scheduled') {
        statusPill.classList.add('on-time');
    } else if (currentFlight.status === 'Boarding') {
        statusPill.classList.add('boarding');
    } else {
        statusPill.classList.add('limited-seats');
    }

    document.getElementById('telDepCode').textContent = currentFlight.fromAirportCode;
    document.getElementById('telDepCity').textContent = depAp.city;
    document.getElementById('telDepTime').textContent = currentFlight.departureTime;

    document.getElementById('telArrCode').textContent = currentFlight.toAirportCode;
    document.getElementById('telArrCity').textContent = arrAp.city;
    document.getElementById('telArrTime').textContent = currentFlight.arrivalTime;

    // Fill progress path percentages
    const pct = Math.min(100, Math.max(0, currentProgress)).toFixed(1);
    document.getElementById('telProgressBar').style.width = pct + '%';
    document.getElementById('progressBarPlane').style.left = pct + '%';

    // Populate operation data details
    document.getElementById('telOperator').textContent = currentFlight.airline + ' Fleet';
    document.getElementById('telProgressPercent').textContent = 'Completed ' + pct + '%';
    document.getElementById('telLiveStatusText').textContent = 'EN ROUTE • ACTIVE';

    // Seed small dynamic telemetry fluctuations
    const altFluc = Math.floor(Math.random() * 41) - 20; 
    const speedFluc = Math.floor(Math.random() * 7) - 3; 
    
    const altText = (baseAltitude + altFluc).toLocaleString();
    const speedText = (baseSpeed + speedFluc).toString();

    document.getElementById('telAltitude').textContent = altText + ' ft';
    document.getElementById('telSpeed').textContent = speedText + ' mph';
    document.getElementById('telHeading').textContent = Math.round(computedHeading) + '°';

    // Estimate duration details
    const hours = parseFloat(currentFlight.duration.split('h')[0]);
    const minutesStr = currentFlight.duration.split('h')[1];
    let minutes = 0;
    if (minutesStr) {
        minutes = parseFloat(minutesStr.split('m')[0] || 0);
    }
    const totalMinutes = (hours * 60) + minutes;
    const remainingMinutes = Math.round(totalMinutes * (1 - (currentProgress / 100)));
    
    if (remainingMinutes <= 0) {
        document.getElementById('telTimeRemaining').textContent = 'Arrived';
    } else {
        const remH = Math.floor(remainingMinutes / 60);
        const remM = remainingMinutes % 60;
        document.getElementById('telTimeRemaining').textContent = remH + 'h ' + remM + 'm';
    }

    document.getElementById('telDepGate').textContent = simulatedGates.dep;
    document.getElementById('telArrGate').textContent = simulatedGates.arr;
}

// Compute bearing angle between two lat/lon coordinate markers
function calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    const brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
}

// Most Tracked Flights rendering grids
function initMostTrackedSection() {
    renderMostTrackedGrid();

    const tabTrending = document.getElementById('tabTrending');
    const tabLiveRadar = document.getElementById('tabLiveRadar');
    
    if (tabTrending && tabLiveRadar) {
        tabTrending.addEventListener('click', function() {
            if (currentTab === 'trending') return;
            currentTab = 'trending';
            tabTrending.className = 'trending-tab active';
            tabLiveRadar.className = 'live-radar-tab';
            renderMostTrackedGrid();
            if (liveRefreshTimer !== null) {
                clearInterval(liveRefreshTimer);
                liveRefreshTimer = null;
            }
        });

        tabLiveRadar.addEventListener('click', function() {
            if (currentTab === 'live') return;
            currentTab = 'live';
            tabLiveRadar.className = 'live-radar-tab active';
            tabTrending.className = 'trending-tab';
            loadAndRenderLiveFlights();
            
            // Set refresh timer loop
            liveRefreshTimer = setInterval(function() {
                loadAndRenderLiveFlights(true);
            }, 10000);
        });
    }
}

// Loop mock trends data and output flight badges
function renderMostTrackedGrid() {
    const grid = document.getElementById('mostTrackedGrid');
    if (!grid || currentTab !== 'trending') {
        return;
    }

    grid.innerHTML = '';

    // Sort database by tracker counts
    const sorted = [];
    for (let i = 0; i < mostTrackedFlightsData.length; i++) {
        sorted.push(mostTrackedFlightsData[i]);
    }
    sorted.sort(function(a, b) {
        return b.baseTrackers - a.baseTrackers;
    });

    for (let idx = 0; idx < sorted.length; idx++) {
        const flight = sorted[idx];
        const rank = '0' + (idx + 1);
        const card = document.createElement('div');
        card.className = 'most-tracked-card';
        card.innerHTML = 
            '<div class="card-badge-row">' +
                '<span class="rank-badge">#' + rank + '</span>' +
                '<span class="trackers-pill">' +
                    '<span class="small-pulse-dot"></span>' +
                    flight.baseTrackers.toLocaleString() + ' tracking' +
                '</span>' +
            '</div>' +
            '<div class="card-flight-info">' +
                '<div class="card-flight-code">' + flight.flightNumber + '</div>' +
                '<div class="card-flight-airline">' + flight.airline + '</div>' +
                '<div class="card-flight-route">' +
                    '<span class="card-airport-code">' + flight.fromCode + '</span>' +
                    '<span class="route-arrow">➔</span>' +
                    '<span class="card-airport-code">' + flight.toCode + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="card-action-row">' +
                '<span class="card-schedule-time">Dep: <strong>' + flight.time + '</strong></span>' +
                '<button class="card-track-btn">Track Live</button>' +
            '</div>';
        
        card.addEventListener('click', function() {
            const numField = document.getElementById('trackFlightNumber');
            if (numField) {
                numField.value = flight.flightNumber;
            }
            trackFlightByNumber(flight.flightNumber);
        });

        grid.appendChild(card);
    }
}

/* ==========================================================================
   OpenSky Live Flight Tracking API Integration Functions
   ========================================================================== */

// Fetch active planes database from server using proxy to bypass CORS
function fetchOpenSkyData(callback) {
    const apiEndpoint = 'https://opensky-network.org/api/states/all?lamin=24&lomin=-125&lamax=49&lomax=-69';
    const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(apiEndpoint);
    
    fetch(proxyUrl)
        .then(function(response) {
            if (response.ok === true) {
                return response.json();
            }
            throw new Error('CORS connection error.');
        })
        .then(function(jsonWrapper) {
            const originalData = JSON.parse(jsonWrapper.contents);
            callback(originalData);
        })
        .catch(function(error) {
            console.warn("Live API connection failed. Gracefully falling back to local simulation data.", error);
            callback(null);
        });
}

// Convert OpenSky array indexes into readable JSON objects
function processOpenSkyStates(statesData) {
    if (!statesData || !statesData.states) {
        return [];
    }
    
    const flyingAircraft = [];
    for (let i = 0; i < statesData.states.length; i++) {
        const state = statesData.states[i];
        const callsign = state[1] ? state[1].trim() : '';
        const longitude = state[5];
        const latitude = state[6];
        const isGrounded = state[8];
        
        if (longitude !== null && latitude !== null && isGrounded === false && callsign.length > 0) {
            flyingAircraft.push(state);
        }
    }
    
    const formattedFlights = [];
    const maxCount = Math.min(12, flyingAircraft.length);
    
    for (let i = 0; i < maxCount; i++) {
        const state = flyingAircraft[i];
        
        const callsign = state[1].trim();     
        const country = state[2];              
        const lon = state[5];                  
        const lat = state[6];                  
        const altMeters = state[7] || 10000;   
        const velocityMS = state[9] || 250;    
        const heading = state[10] || 0;        
        const icao = state[0];                 
        
        const altitudeFeet = Math.round(altMeters * 3.28084); 
        const speedMph = Math.round(velocityMS * 2.23694);    
        const airlineName = getAirlineName(callsign);         
        
        const flightObject = {
            flightNumber: callsign,
            airline: airlineName,
            originCountry: country,
            latitude: lat,
            longitude: lon,
            altitude: altitudeFeet,
            speed: speedMph,
            heading: heading,
            icao24: icao,
            trackersCount: Math.floor(Math.random() * 800) + 700, 
            depTime: 'LIVE',
            aircraft: 'Commercial Aircraft'
        };
        
        formattedFlights.push(flightObject);
    }
    
    return formattedFlights;
}

// Mock fallback list if API is rate-limited or offline
function getMockLiveFlights() {
    const fallbackList = [
        { flightNumber: 'UAL871', airline: 'United Airlines', originCountry: 'United States', latitude: 37.7749, longitude: -122.4194, altitude: 34000, speed: 540, heading: 90, icao24: 'a00001' },
        { flightNumber: 'DLH430', airline: 'Lufthansa', originCountry: 'Germany', latitude: 40.7128, longitude: -74.0060, altitude: 36000, speed: 510, heading: 85, icao24: 'a00002' },
        { flightNumber: 'SIA022', airline: 'Singapore Airlines', originCountry: 'Singapore', latitude: 34.0522, longitude: -118.2437, altitude: 38000, speed: 560, heading: 270, icao24: 'a00003' },
        { flightNumber: 'BAW178', airline: 'British Airways', originCountry: 'United Kingdom', latitude: 42.3601, longitude: -71.0589, altitude: 35000, speed: 520, heading: 75, icao24: 'a00004' },
        { flightNumber: 'QTR707', airline: 'Qatar Airways', originCountry: 'Qatar', latitude: 29.7604, longitude: -95.3698, altitude: 32000, speed: 530, heading: 110, icao24: 'a00005' },
        { flightNumber: 'AAL090', airline: 'American Airlines', originCountry: 'United States', latitude: 32.7767, longitude: -96.7970, altitude: 31000, speed: 505, heading: 180, icao24: 'a00006' },
        { flightNumber: 'UAE201', airline: 'Emirates', originCountry: 'United Arab Emirates', latitude: 25.7617, longitude: -80.1918, altitude: 33000, speed: 515, heading: 60, icao24: 'a00007' },
        { flightNumber: 'AFR066', airline: 'Air France', originCountry: 'France', latitude: 45.4215, longitude: -75.6972, altitude: 37000, speed: 535, heading: 80, icao24: 'a00008' }
    ];
    
    const preparedList = [];
    for (let i = 0; i < fallbackList.length; i++) {
        const item = fallbackList[i];
        item.trackersCount = Math.floor(Math.random() * 800) + 600;
        item.depTime = 'LIVE';
        item.aircraft = 'Commercial Aircraft';
        preparedList.push(item);
    }
    return preparedList;
}

// Fetch and render the list of live flights on the UI grid
function loadAndRenderLiveFlights(silent) {
    if (silent === undefined) silent = false;
    const grid = document.getElementById('mostTrackedGrid');
    if (!grid) return;
    
    if (silent === false) {
        grid.innerHTML = 
            '<div class="radar-loading">' +
                '<div class="spinner"></div>' +
                '<p>Establishing connection to Live Air Radar Traffic feed...</p>' +
            '</div>';
    }
    
    fetchOpenSkyData(function(data) {
        let apiFlights = [];
        if (data !== null) {
            apiFlights = processOpenSkyStates(data);
        }
        
        if (apiFlights.length > 0) {
            liveFlightsList = apiFlights;
        } else {
            if (liveFlightsList.length === 0) {
                liveFlightsList = getMockLiveFlights();
            }
        }
        
        renderLiveRadarGrid();
    });
}

// Render active radar flight cards in the grid
function renderLiveRadarGrid() {
    const grid = document.getElementById('mostTrackedGrid');
    if (!grid || currentTab !== 'live') {
        return;
    }
    
    grid.innerHTML = '';
    
    for (let i = 0; i < liveFlightsList.length; i++) {
        const flight = liveFlightsList[i];
        const card = document.createElement('div');
        card.className = 'most-tracked-card';
        card.innerHTML = 
            '<div class="card-badge-row">' +
                '<span class="rank-badge" style="background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); box-shadow: 0 4px 10px rgba(46, 204, 113, 0.25);">LIVE</span>' +
                '<span class="trackers-pill">' +
                    '<span class="small-pulse-dot" style="background-color: #2ecc71; animation: pulseBlink 1.2s infinite ease-in-out;"></span>' +
                    flight.trackersCount.toLocaleString() + ' watching' +
                '</span>' +
            '</div>' +
            '<div class="card-flight-info">' +
                '<div class="card-flight-code">' + flight.flightNumber + '</div>' +
                '<div class="card-flight-airline">' + flight.airline + '</div>' +
                '<div class="card-flight-route" style="margin-top: 0.25rem;">' +
                    '<span class="card-airport-code" style="font-size: 0.75rem; color: #49769f;">ORIGIN:</span>' +
                    '<span class="card-airport-code" style="font-size: 0.85rem; color: #001d39; margin-left: 0.2rem;">' + flight.originCountry + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="card-action-row">' +
                '<span class="card-schedule-time" style="font-size: 0.75rem;">Alt: <strong>' + flight.altitude.toLocaleString() + ' ft</strong></span>' +
                '<button class="card-track-btn" style="background: #27ae60;">Track Live</button>' +
            '</div>';
        
        card.addEventListener('click', function() {
            const numField = document.getElementById('trackFlightNumber');
            if (numField) {
                numField.value = flight.flightNumber;
            }
            trackFlightByNumber(flight.flightNumber);
        });
        
        grid.appendChild(card);
    }
}

// Track a live OpenSky API flight in the Leaflet map and telemetry panel
function startLiveApiTracking(flight) {
    if (activeTrackingInterval) clearInterval(activeTrackingInterval);
    if (livePollingInterval) clearInterval(livePollingInterval);
    
    isTrackingLiveApiFlight = true;
    currentFlight = flight;
    
    document.getElementById('radarPlaceholderMsg').style.display = 'none';
    document.getElementById('telemetryPanel').style.display = 'flex';
    
    if (map !== null) {
        setTimeout(function() {
            map.invalidateSize();
        }, 100);
    }
    
    if (map === null) {
        map = L.map('trackingMap').setView([20, 0], 2);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);
    }
    
    if (planeMarker) map.removeLayer(planeMarker);
    if (pathLine) map.removeLayer(pathLine);
    if (originMarker) map.removeLayer(originMarker);
    if (destMarker) map.removeLayer(destMarker);
    if (liveTrailLine) map.removeLayer(liveTrailLine);
    
    liveCoordinatesHistory = [[flight.latitude, flight.longitude]];
    
    liveTrailLine = L.polyline(liveCoordinatesHistory, {
        color: '#2ecc71',
        weight: 3,
        className: 'live-trail-line',
        opacity: 0.85
    }).addTo(map);
    
    const planeIcon = L.divIcon({
        className: 'leaflet-plane-marker',
        html: '<div id="mapPlaneIcon" style="transform: rotate(' + (flight.heading - 90) + 'deg); font-size: 28px; line-height: 28px; text-shadow: 0 0 10px #2ecc71; cursor: pointer;">✈️</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
    });
    
    planeMarker = L.marker([flight.latitude, flight.longitude], { icon: planeIcon }).addTo(map)
        .bindPopup('<b>' + flight.flightNumber + ' (' + flight.airline + ')</b><br>Live Coordinates: ' + flight.latitude.toFixed(4) + ', ' + flight.longitude.toFixed(4));
        
    map.setView([flight.latitude, flight.longitude], 5);
    
    updateLiveApiTelemetryUI(flight);
    
    // Poll API for coordinates updates every 10 seconds
    livePollingInterval = setInterval(function() {
        fetchOpenSkyData(function(data) {
            let matched = null;
            
            if (data !== null && data.states !== null) {
                for (let i = 0; i < data.states.length; i++) {
                    const s = data.states[i];
                    if (s[1].trim().toUpperCase() === flight.flightNumber.toUpperCase()) {
                        matched = s;
                        break;
                    }
                }
            }
            
            if (matched !== null && matched[5] !== null && matched[6] !== null) {
                const newLon = matched[5];
                const newLat = matched[6];
                const newAlt = Math.round(matched[7] * 3.28084);
                const newVel = Math.round(matched[9] * 2.23694);
                const newHeading = matched[10] || 0;
                
                flight.latitude = newLat;
                flight.longitude = newLon;
                flight.altitude = newAlt;
                flight.speed = newVel;
                flight.heading = newHeading;
                
                liveCoordinatesHistory.push([newLat, newLon]);
                liveTrailLine.setLatLngs(liveCoordinatesHistory);
                
                planeMarker.setLatLng([newLat, newLon]);
                planeMarker.getPopup().setContent('<b>' + flight.flightNumber + ' (' + flight.airline + ')</b><br>Live Coordinates: ' + newLat.toFixed(4) + ', ' + newLon.toFixed(4));
                
                const planeEl = document.getElementById('mapPlaneIcon');
                if (planeEl) {
                    planeEl.style.transform = 'rotate(' + (newHeading - 90) + 'deg)';
                }
                
                map.panTo([newLat, newLon]);
                updateLiveApiTelemetryUI(flight);
            } else {
                // If API does not return coordinates, simulate a small forward movement
                const radians = (flight.heading * Math.PI) / 180;
                const kmOffset = 15; 
                const earthRadius = 6371; 
                const latDiff = (kmOffset * Math.cos(radians)) / earthRadius;
                const lonDiff = (kmOffset * Math.sin(radians)) / (earthRadius * Math.cos((flight.latitude * Math.PI) / 180));
                
                const newLat = flight.latitude + (latDiff * 180) / Math.PI;
                const newLon = flight.longitude + (lonDiff * 180) / Math.PI;
                
                flight.latitude = newLat;
                flight.longitude = newLon;
                
                liveCoordinatesHistory.push([newLat, newLon]);
                liveTrailLine.setLatLngs(liveCoordinatesHistory);
                
                planeMarker.setLatLng([newLat, newLon]);
                planeMarker.getPopup().setContent('<b>' + flight.flightNumber + ' (' + flight.airline + ')</b><br>Live Coordinates: ' + newLat.toFixed(4) + ', ' + newLon.toFixed(4) + ' (Simulated radar tracking)');
                
                map.panTo([newLat, newLon]);
                updateLiveApiTelemetryUI(flight);
            }
        });
    }, 10000);
}

// Render values inside telemetry dashboard details panel for real-time live flight
function updateLiveApiTelemetryUI(flight) {
    document.getElementById('telAirline').textContent = flight.airline;
    document.getElementById('telFlightNo').textContent = flight.flightNumber;
    document.getElementById('telAircraft').textContent = 'Boeing/Airbus (ADS-B Live)';
    
    const statusPill = document.getElementById('telemetryStatus');
    statusPill.textContent = 'LIVE radar';
    statusPill.className = 'pill boarding';
    
    document.getElementById('telDepCode').textContent = 'DEP';
    document.getElementById('telDepCity').textContent = flight.originCountry;
    document.getElementById('telDepTime').textContent = 'En Route';
    
    document.getElementById('telArrCode').textContent = 'ARR';
    document.getElementById('telArrCity').textContent = 'Radar Tracking';
    document.getElementById('telArrTime').textContent = 'In Air';
    
    document.getElementById('telProgressBar').style.width = '100%';
    document.getElementById('telProgressBar').style.background = 'linear-gradient(90deg, #4e8ea2, #2ecc71)';
    
    const progressPlane = document.getElementById('progressBarPlane');
    if (progressPlane) {
        progressPlane.style.left = '50%';
        progressPlane.classList.add('is-live');
    }

    // Populate operation data details
    document.getElementById('telOperator').textContent = flight.airline + ' Live';
    document.getElementById('telProgressPercent').textContent = 'Completed 100%';
    document.getElementById('telLiveStatusText').textContent = 'IN AIR • LIVE RADAR';
    
    document.getElementById('telAltitude').textContent = flight.altitude.toLocaleString() + ' ft';
    document.getElementById('telSpeed').textContent = flight.speed + ' mph';
    document.getElementById('telHeading').textContent = Math.round(flight.heading) + '°';
    document.getElementById('telTimeRemaining').textContent = 'Tracking Live';
    
    document.getElementById('telDepGate').textContent = 'ICAO24 code: ' + flight.icao24;
    document.getElementById('telArrGate').textContent = 'Live Coords: ' + flight.latitude.toFixed(3) + ', ' + flight.longitude.toFixed(3);
}

// Convert flight callsign prefixes into human-readable airline brands
function getAirlineName(callsign) {
    const prefix = callsign.slice(0, 3).toUpperCase();
    const airlineMap = {
        'UAE': 'Emirates',
        'DLH': 'Lufthansa',
        'SIA': 'Singapore Airlines',
        'UAL': 'United Airlines',
        'AAL': 'American Airlines',
        'AIC': 'Air India',
        'BAW': 'British Airways',
        'QTR': 'Qatar Airways',
        'THY': 'Turkish Airlines',
        'KLM': 'KLM',
        'IBE': 'Iberia',
        'AFR': 'Air France',
        'DAL': 'Delta Air Lines',
        'RYR': 'Ryanair',
        'EZY': 'EasyJet',
        'FDX': 'FedEx',
        'UPS': 'UPS',
        'JAL': 'Japan Airlines',
        'ANA': 'All Nippon Airways',
        'CCA': 'Air China',
        'CES': 'China Eastern',
        'CSN': 'China Southern',
        'SWR': 'Swiss International',
        'AZA': 'Alitalia',
        'ETD': 'Etihad Airways'
    };
    return airlineMap[prefix] || 'International Flight';
}
