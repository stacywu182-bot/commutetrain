const fallbackStations = [
  ["San Francisco", 37.7764, -122.3945],
  ["22nd Street", 37.7576, -122.3925],
  ["Bayshore", 37.7076, -122.4019],
  ["South San Francisco", 37.6557, -122.4050],
  ["San Bruno", 37.6311, -122.4111],
  ["Millbrae", 37.6003, -122.3867],
  ["Burlingame", 37.5797, -122.3450],
  ["San Mateo", 37.5681, -122.3236],
  ["Hillsdale", 37.5375, -122.2974],
  ["Belmont", 37.5206, -122.2758],
  ["San Carlos", 37.5073, -122.2605],
  ["Redwood City", 37.4858, -122.2310],
  ["Menlo Park", 37.4549, -122.1822],
  ["Palo Alto", 37.4434, -122.1646],
  ["California Ave", 37.4292, -122.1419],
  ["San Antonio", 37.4072, -122.1071],
  ["Mountain View", 37.3946, -122.0764],
  ["Sunnyvale", 37.3785, -122.0308],
  ["Lawrence", 37.3706, -121.9970],
  ["Santa Clara", 37.3532, -121.9367],
  ["San Jose Diridon", 37.3299, -121.9020],
  ["Tamien", 37.3129, -121.8830],
  ["Capitol", 37.2844, -121.8411],
  ["Blossom Hill", 37.2524, -121.7971],
  ["Morgan Hill", 37.1297, -121.6504],
  ["San Martin", 37.0853, -121.6104],
  ["Gilroy", 37.0036, -121.5662]
].map((row, index) => ({ id: row[0].toLowerCase().replace(/[^a-z0-9]+/g, "_"), name: row[0], lat: row[1], lng: row[2], index }));

const scheduleData = window.CALTRAIN_SCHEDULE_DATA || { stations: fallbackStations, trips: [] };
const stations = scheduleData.stations.map((station, index) => ({ ...station, index }));
const scheduleTrips = scheduleData.trips || [];

const fallbackCoffee = {
  Sunnyvale: [
    ["Philz Coffee", "Downtown Sunnyvale, a short walk from the station"],
    ["Bean Scene Cafe", "Casual espresso and breakfast stop"],
    ["Coffee & More", "Quick counter service near Murphy Ave"]
  ],
  "Mountain View": [
    ["Red Rock Coffee", "Large upstairs seating area"],
    ["Dana Street Roasting", "Local roaster close to Castro Street"],
    ["1 Oz Coffee", "Compact espresso bar"]
  ],
  "Palo Alto": [
    ["Verve Coffee Roasters", "Bright cafe near University Ave"],
    ["Blue Bottle Coffee", "Reliable quick stop"],
    ["Backyard Brew", "Outdoor walk-up coffee window"]
  ],
  "San Francisco": [
    ["Blue Bottle Coffee", "Ferry Building side trip"],
    ["Red Bay Coffee", "Downtown espresso option"],
    ["Philz Coffee", "Multiple nearby downtown locations"]
  ]
};

const state = {
  station: localStorage.getItem("station") || "Sunnyvale",
  direction: localStorage.getItem("direction") || "north",
  routeFrom: localStorage.getItem("routeFrom") || "Sunnyvale",
  routeTo: localStorage.getItem("routeTo") || "San Francisco",
  serviceDay: localStorage.getItem("serviceDay") || "weekday",
  leaveBuffer: Number(localStorage.getItem("leaveBuffer") || 10),
  selectedMapStation: "Sunnyvale",
  map: null,
  markers: []
};

const $ = (id) => document.getElementById(id);
const stationSelect = $("stationSelect");
const routeFromSelect = $("routeFrom");
const routeToSelect = $("routeTo");

function init() {
  stations.forEach((station) => {
    stationSelect.append(createStationOption(station));
    routeFromSelect.append(createStationOption(station));
    routeToSelect.append(createStationOption(station));
  });

  if (!stations.some((station) => station.name === state.station)) state.station = "Sunnyvale";
  if (!stations.some((station) => station.name === state.routeFrom)) state.routeFrom = "Sunnyvale";
  if (!stations.some((station) => station.name === state.routeTo)) state.routeTo = "San Francisco";

  stationSelect.value = state.station;
  routeFromSelect.value = state.routeFrom;
  routeToSelect.value = state.routeTo;
  bindEvents();
  renderAll();
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  stationSelect.addEventListener("change", () => {
    state.station = stationSelect.value;
    state.selectedMapStation = state.station;
    persist();
    dropEmoji(["🚉", "🚆", "☕️"]);
    renderAll();
  });

  document.querySelectorAll(".seg").forEach((button) => {
    button.addEventListener("click", () => {
      state.direction = button.dataset.direction;
      persist();
      renderAll();
    });
  });

  $("refreshBtn").addEventListener("click", () => {
    dropEmoji(["🚆", "☕️", "💴", "⏱️", "🌁"]);
    renderAll();
  });
  $("coffeeRefreshBtn").addEventListener("click", renderCoffee);
  $("nearestBtn").addEventListener("click", useNearestStation);
  $("notifyBtn").addEventListener("click", () => {
    $("alertStrip").textContent = "Realtime alerts will be added after the 511 token is available.";
    $("alertStrip").classList.add("visible");
  });
  routeFromSelect.addEventListener("change", () => {
    state.routeFrom = routeFromSelect.value;
    preventSameRouteStation("from");
    persist();
    renderSchedule();
  });
  routeToSelect.addEventListener("change", () => {
    state.routeTo = routeToSelect.value;
    preventSameRouteStation("to");
    persist();
    renderSchedule();
  });
  $("swapRouteBtn").addEventListener("click", () => {
    [state.routeFrom, state.routeTo] = [state.routeTo, state.routeFrom];
    routeFromSelect.value = state.routeFrom;
    routeToSelect.value = state.routeTo;
    persist();
    renderSchedule();
  });
  document.querySelectorAll(".day-seg").forEach((button) => {
    button.addEventListener("click", () => {
      state.serviceDay = button.dataset.service;
      persist();
      renderSchedule();
    });
  });
  document.querySelectorAll(".buffer-seg").forEach((button) => {
    button.addEventListener("click", () => {
      state.leaveBuffer = Number(button.dataset.buffer);
      persist();
      syncBufferButtons();
      dropEmoji(["⏱️", "🚆", "💴"], 5);
      renderDashboard();
    });
  });
}

function switchView(viewId) {
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === viewId));
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
  if (viewId === "map") {
    setTimeout(() => {
      if (!state.map) initMap();
      state.map.invalidateSize();
    }, 0);
  }
}

function persist() {
  localStorage.setItem("station", state.station);
  localStorage.setItem("direction", state.direction);
  localStorage.setItem("routeFrom", state.routeFrom);
  localStorage.setItem("routeTo", state.routeTo);
  localStorage.setItem("serviceDay", state.serviceDay);
  localStorage.setItem("leaveBuffer", String(state.leaveBuffer));
}

function renderAll() {
  document.querySelectorAll(".seg").forEach((button) => button.classList.toggle("active", button.dataset.direction === state.direction));
  document.querySelectorAll(".day-seg").forEach((button) => button.classList.toggle("active", button.dataset.service === state.serviceDay));
  syncBufferButtons();
  renderDashboard();
  renderSchedule();
  renderMapList();
  renderCoffee();
}

function dropEmoji(pool = ["🚆", "☕️", "💴", "⏱️", "🌁"], count = 8) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const layer = $("confettiLayer");
  if (!layer) return;

  for (let i = 0; i < count; i += 1) {
    const emoji = document.createElement("span");
    emoji.className = "emoji-drop";
    emoji.textContent = pool[Math.floor(Math.random() * pool.length)];
    emoji.style.setProperty("--x", `${10 + Math.random() * 80}vw`);
    emoji.style.setProperty("--size", `${1.1 + Math.random() * 1.1}rem`);
    emoji.style.setProperty("--duration", `${900 + Math.random() * 700}ms`);
    emoji.style.setProperty("--rotate", `${-50 + Math.random() * 100}deg`);
    emoji.style.animationDelay = `${i * 35}ms`;
    layer.append(emoji);
    setTimeout(() => emoji.remove(), 1900);
  }
}

function syncBufferButtons() {
  document.querySelectorAll(".buffer-seg").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.buffer) === state.leaveBuffer);
  });
}

function renderDashboard() {
  const station = getStation(state.station);
  const trains = getUpcomingTrains(station, state.direction);
  const bestTrain = trains[0];
  const directionName = state.direction === "north" ? "San Francisco" : "San Jose";

  $("dashboardTitle").textContent = `${station.name} to ${directionName}`;
  $("pinnedStation").textContent = station.name;
  $("directionLabel").textContent = state.direction === "north" ? "Northbound" : "Southbound";
  $("trainCount").textContent = trains.length;
  $("updatedAt").textContent = new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" }).format(new Date());
  $("leaveWindow").textContent = bestTrain ? `Aim for ${formatTime(addMinutes(bestTrain.departure, -state.leaveBuffer))}` : "No trains in window";
  $("statusPill").textContent = "Scheduled only";
  $("statusPill").classList.remove("danger");
  $("alertStrip").classList.remove("visible");

  renderTrainCards($("timeline"), trains);
}

function renderMapList() {
  $("mapStationName").textContent = state.selectedMapStation;
  const trains = getUpcomingTrains(getStation(state.selectedMapStation), state.direction);
  renderTrainCards($("mapTrainList"), trains);
}

function renderSchedule() {
  const from = getStation(state.routeFrom);
  const to = getStation(state.routeTo);
  const trips = getRouteSchedule(from, to, state.serviceDay);
  const title = `${from.name} to ${to.name}`;

  $("scheduleTitle").textContent = title;
  document.querySelectorAll(".day-seg").forEach((button) => button.classList.toggle("active", button.dataset.service === state.serviceDay));

  const list = $("scheduleList");
  list.innerHTML = "";
  trips.forEach((trip) => {
    const row = document.createElement("article");
    row.className = "schedule-row";
    row.innerHTML = `
      <div>
        <div class="schedule-number">#${trip.number}</div>
        <div class="schedule-kind">${trip.kind}</div>
      </div>
      <div>
        <div class="schedule-time">${formatTime(trip.departure)} - ${formatTime(trip.arrival)}</div>
        <div class="schedule-label">Scheduled time</div>
      </div>
      <div>
        <div class="schedule-eta">${formatTime(trip.arrival)}</div>
        <div class="schedule-label">Scheduled arrival</div>
      </div>
      <div>
        <div class="schedule-duration">${trip.duration} mins</div>
        <div class="schedule-label">${trip.stops} stops</div>
      </div>
    `;
    list.append(row);
  });
}

function renderTrainCards(container, trains) {
  container.innerHTML = "";
  trains.forEach((train) => {
    const card = document.createElement("article");
    card.className = "train-card";
    card.innerHTML = `
      <div>
        <div class="train-time">${formatTime(train.departure)}</div>
        <div class="train-meta">Scheduled ${formatTime(train.departure)}</div>
      </div>
      <div>
        <strong>${train.kind} train ${train.number}</strong>
        <div class="train-meta">${train.stops} stops to ${train.terminal}</div>
      </div>
      <span class="train-badge">Scheduled</span>
    `;
    container.append(card);
  });
}

function initMap() {
  state.map = L.map("stationMap", { scrollWheelZoom: true }).setView([37.43, -122.08], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(state.map);

  stations.forEach((station) => {
    const marker = L.marker([station.lat, station.lng]).addTo(state.map);
    marker.bindPopup(`<strong>${station.name}</strong><br><button class="popup-pick" data-station="${station.name}">Show trains</button>`);
    marker.on("popupopen", () => {
      setTimeout(() => {
        document.querySelector(".popup-pick")?.addEventListener("click", (event) => {
          state.selectedMapStation = event.target.dataset.station;
          renderMapList();
        });
      }, 0);
    });
    state.markers.push(marker);
  });
}

async function renderCoffee() {
  const station = getStation(state.station);
  $("coffeeTitle").textContent = `Coffee near ${station.name}`;
  const grid = $("coffeeGrid");
  grid.innerHTML = "<p>Looking around the station...</p>";

  const shops = await fetchCoffeeFromOverpass(station).catch(() => []);
  const finalShops = shops.length ? shops : getFallbackCoffee(station.name);

  grid.innerHTML = "";
  finalShops.slice(0, 6).forEach((shop) => {
    const card = document.createElement("article");
    card.className = "coffee-card";
    card.innerHTML = `
      <h3>${shop.name}</h3>
      <p>${shop.detail}</p>
      <span class="train-meta">${shop.distance || "Near station"}</span>
    `;
    grid.append(card);
  });
}

async function fetchCoffeeFromOverpass(station) {
  const query = `
    [out:json][timeout:7];
    node["amenity"="cafe"](around:900,${station.lat},${station.lng});
    out tags center 8;
  `;
  const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
  if (!response.ok) return [];
  const data = await response.json();
  return (data.elements || [])
    .filter((item) => item.tags?.name)
    .map((item) => ({
      name: item.tags.name,
      detail: item.tags.cuisine ? `Cafe · ${item.tags.cuisine}` : "Cafe near your pinned Caltrain station",
      distance: `${Math.round(distanceMiles(station.lat, station.lng, item.lat, item.lon) * 5280)} ft away`
    }))
    .sort((a, b) => parseInt(a.distance, 10) - parseInt(b.distance, 10));
}

function getFallbackCoffee(stationName) {
  const shops = fallbackCoffee[stationName] || [
    ["Local cafe", "A nearby coffee option for delay time"],
    ["Station coffee", "Quick stop before the next train"],
    ["Bakery cafe", "Coffee and a small breakfast backup"]
  ];
  return shops.map((shop) => ({ name: shop[0], detail: shop[1], distance: "Curated fallback" }));
}

function useNearestStation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition((position) => {
    const nearest = stations
      .map((station) => ({
        station,
        distance: distanceMiles(position.coords.latitude, position.coords.longitude, station.lat, station.lng)
      }))
      .sort((a, b) => a.distance - b.distance)[0].station;

    state.station = nearest.name;
    state.selectedMapStation = nearest.name;
    stationSelect.value = nearest.name;
    persist();
    renderAll();
  });
}

async function enableNotifications() {
  if (!("Notification" in window)) return;
  const permission = await Notification.requestPermission();
  $("notifyBtn").textContent = permission === "granted" ? "Alerts enabled" : "Enable alerts";
}

function maybeNotify(train) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const key = `notified-${train.number}-${formatTime(train.departure)}-${train.delay}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "true");
  new Notification(`Caltrain ${train.number} delay`, {
    body: `${state.station}: now estimated ${formatTime(addMinutes(train.departure, train.delay))} (+${train.delay} min).`
  });
}

function getUpcomingTrains(station, direction) {
  const now = new Date();
  const nowMinutes = minutesSinceServiceDayStart(now);
  const service = serviceForDate(now);

  return scheduleTrips
    .filter((trip) => trip.s === service && trip.d === direction)
    .map((trip) => tripForStation(trip, station.id))
    .filter(Boolean)
    .filter((trip) => trip.departureMinutes >= nowMinutes && trip.departureMinutes <= nowMinutes + 120)
    .sort((a, b) => a.departureMinutes - b.departureMinutes)
    .slice(0, 8)
    .map((trip) => ({
      departure: dateFromServiceMinutes(now, trip.departureMinutes),
      terminal: trip.headsign,
      kind: trip.kind,
      number: trip.number,
      stops: trip.stops
    }));
}

function getRouteSchedule(from, to, serviceDay) {
  const now = new Date();
  const nowMinutes = minutesSinceServiceDayStart(now);

  return scheduleTrips
    .filter((trip) => trip.s === serviceDay)
    .map((trip) => tripBetweenStations(trip, from.id, to.id))
    .filter(Boolean)
    .filter((trip) => trip.departureMinutes >= nowMinutes - 30)
    .sort((a, b) => a.departureMinutes - b.departureMinutes)
    .slice(0, 8)
    .map((trip) => ({
      departure: dateFromServiceMinutes(now, trip.departureMinutes),
      arrival: dateFromServiceMinutes(now, trip.arrivalMinutes),
      duration: trip.arrivalMinutes - trip.departureMinutes,
      kind: trip.kind,
      number: trip.number,
      stops: trip.stops
    }));
}

function preventSameRouteStation(changedSide) {
  if (state.routeFrom !== state.routeTo) return;
  const current = getStation(changedSide === "from" ? state.routeFrom : state.routeTo);
  const replacement = stations[changedSide === "from" ? Math.max(0, current.index - 1) : Math.min(stations.length - 1, current.index + 1)];

  if (changedSide === "from") {
    state.routeTo = replacement.name;
    routeToSelect.value = state.routeTo;
  } else {
    state.routeFrom = replacement.name;
    routeFromSelect.value = state.routeFrom;
  }
}

function getStation(name) {
  return stations.find((station) => station.name === name || station.id === name) || stations.find((station) => station.name === "Sunnyvale") || stations[0];
}

function createStationOption(station) {
  const option = document.createElement("option");
  option.value = station.name;
  option.textContent = station.name;
  return option;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

function formatTime(date) {
  return new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" }).format(date);
}

function distanceMiles(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const radius = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function serviceForDate(date) {
  const day = date.getDay();
  return day === 0 || day === 6 ? "weekend" : "weekday";
}

function tripForStation(trip, stationId) {
  const stopIndex = trip.t.findIndex((stop) => stop[0] === stationId);
  if (stopIndex === -1) return null;
  const stop = trip.t[stopIndex];
  return {
    number: trip.n,
    headsign: trip.h,
    kind: trip.k,
    departureMinutes: parseGtfsTime(stop[2]),
    stops: Math.max(0, trip.t.length - stopIndex - 1)
  };
}

function tripBetweenStations(trip, fromId, toId) {
  const fromIndex = trip.t.findIndex((stop) => stop[0] === fromId);
  const toIndex = trip.t.findIndex((stop) => stop[0] === toId);
  if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) return null;

  const fromStop = trip.t[fromIndex];
  const toStop = trip.t[toIndex];
  return {
    number: trip.n,
    kind: trip.k,
    departureMinutes: parseGtfsTime(fromStop[2]),
    arrivalMinutes: parseGtfsTime(toStop[1]),
    stops: toIndex - fromIndex
  };
}

function parseGtfsTime(time) {
  const [hours, minutes, seconds] = time.split(":").map(Number);
  return hours * 60 + minutes + Math.round((seconds || 0) / 60);
}

function minutesSinceServiceDayStart(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function dateFromServiceMinutes(anchorDate, minutes) {
  const date = new Date(anchorDate);
  date.setHours(0, 0, 0, 0);
  return addMinutes(date, minutes);
}

init();
