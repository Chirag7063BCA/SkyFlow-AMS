const FLIGHTS_URL = '../../Data/flights.json';
const AIRPORTS_URL = '../../Data/airports.json';

let flights = [];
let airports = [];

// Load data from JSON files
async function loadData() {
    try {
        const flightResponse = await fetch(FLIGHTS_URL);
        const airportResponse = await fetch(AIRPORTS_URL);

        flights = await flightResponse.json();
        airports = await airportResponse.json();

        showAirportSuggestions();
        showFlights(flights);

    } catch (error) {
        console.log('Error loading data:', error);
    }
}

// Show airport suggestions
function showAirportSuggestions() {
    const airportList = document.querySelector('#airportSuggestions');

    if (!airportList) return;

    airportList.innerHTML = airports.map(airport => `
    < option value = "${airport.city}, ${airport.country}, ${airport.iata}" >
        </option >
    `).join('');
}

// Find airport from user input
function findAirport(value) {
    value = value.toLowerCase().trim();

    if (!value) return null;

    return airports.find(airport =>
        airport.city?.toLowerCase().includes(value) ||
        airport.name?.toLowerCase().includes(value) ||
        airport.iata?.toLowerCase() === value ||
        airport.icao?.toLowerCase() === value
    );
}

// Show flights on page
function showFlights(list) {
    const grid = document.querySelector('[data-flight-grid]');
    const message = document.querySelector('[data-flight-message]');

    if (!grid || !message) return;

    if (list.length === 0) {
        grid.innerHTML = '';
        message.textContent = 'No matching flight found.';
        return;
    }

    message.textContent = `${list.length} flight(s) found.`;

    grid.innerHTML = list.map(flight => `
    < article class="flight-data-card" >

            <div class="flight-data-card-top">

                <div>
                    <p class="flight-data-airline">
                        ${flight.flightNumber} · ${flight.airline}
                    </p>

                    <h3 class="flight-data-route">
                        ${flight.originCity} to ${flight.destinationCity}
                    </h3>
                </div>

                <div class="flight-data-time">
                    <strong>
                        ${flight.departureTime} - ${flight.arrivalTime}
                    </strong>

                    <span>${flight.duration}</span>
                </div>

            </div>

            <div class="flight-data-meta">

                <span class="flight-data-pill">
                    ${flight.fromAirportCode} to ${flight.toAirportCode}
                </span>

                <span class="flight-data-pill">
                    ${flight.nonStop ? 'Non-stop' : '1 stop'}
                </span>

                <span class="flight-data-pill">
                    ${flight.status}
                </span>

                <span class="flight-data-price">
                    ${flight.fare}
                </span>

            </div>

        </article >
    `).join('');
}

// Search flights
function searchFlights() {

    const searchInput =
        document.querySelector('#flightSearch');

    const fromInput =
        document.querySelector('#departureFrom');

    const toInput =
        document.querySelector('#goingTo');

    const nonStop =
        document.querySelector('input[name="nonStop"]');

    const search = searchInput?.value.toLowerCase().trim() || '';
    const from = findAirport(fromInput?.value || '');
    const to = findAirport(toInput?.value || '');

    const result = flights.filter(flight => {

        const flightText = `
            ${flight.flightNumber}
            ${flight.airline}
            ${flight.originCity}
            ${flight.destinationCity}
            ${flight.fromAirportCode}
            ${flight.toAirportCode}
            ${flight.status}
`.toLowerCase();

        const searchMatch = flightText.includes(search);

        const fromMatch = !from ||
            flight.originCity.toLowerCase().includes(from.city.toLowerCase()) ||
            flight.fromAirportCode.toLowerCase() === from.iata.toLowerCase();

        const toMatch = !to ||
            flight.destinationCity.toLowerCase().includes(to.city.toLowerCase()) ||
            flight.toAirportCode.toLowerCase() === to.iata.toLowerCase();

        const stopMatch =
            !nonStop?.checked || flight.nonStop;

        return searchMatch && fromMatch && toMatch && stopMatch;
    });

    showFlights(result);
}

// Swap From and To
function swapAirports() {

    const from =
        document.querySelector('#departureFrom');

    const to =
        document.querySelector('#goingTo');

    if (!from || !to) return;

    const temp = from.value;

    from.value = to.value;
    to.value = temp;

    searchFlights();
}

// Start application
async function start() {

    await loadData();

    const form =
        document.querySelector('[data-flight-search-form]');

    const search =
        document.querySelector('#flightSearch');

    const from =
        document.querySelector('#departureFrom');

    const to =
        document.querySelector('#goingTo');

    const nonStop =
        document.querySelector('input[name="nonStop"]');

    const swap =
        document.querySelector('.flight-swap-btn');

    // Search form
    form?.addEventListener('submit', function (event) {
        event.preventDefault();
        searchFlights();
    });

    // Live search
    search?.addEventListener('input', searchFlights);

    from?.addEventListener('input', searchFlights);

    to?.addEventListener('input', searchFlights);

    nonStop?.addEventListener('change', searchFlights);

    swap?.addEventListener('click', swapAirports);
}

// Run when page loads
document.addEventListener('DOMContentLoaded', start);

// Keep this if your other code uses it
window.renderHeroDummyData = start;

