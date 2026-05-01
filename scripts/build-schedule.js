const fs = require("fs");
const path = require("path");

const feedDir = process.argv[2];
const outputPath = process.argv[3] || path.join(process.cwd(), "schedule-data.js");

if (!feedDir) {
  console.error("Usage: node scripts/build-schedule.js <gtfs-feed-dir> [output]");
  process.exit(1);
}

function parseCsv(fileName) {
  const text = fs.readFileSync(path.join(feedDir, fileName), "utf8").replace(/^\uFEFF/, "");
  const rows = [];
  const lines = text.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines.shift());

  for (const line of lines) {
    if (!line.trim()) continue;
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    rows.push(row);
  }

  return rows;
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }

  values.push(value);
  return values;
}

function compactStationName(stopName) {
  return stopName.replace(/\s+Station$/i, "").replace(/\s+Caltrain$/i, "");
}

function serviceKind(service) {
  if (service.saturday === "1" || service.sunday === "1") return "weekend";
  return "weekday";
}

const routes = new Map(parseCsv("routes.txt").map((route) => [route.route_id, route]));
const services = new Map(parseCsv("calendar.txt").map((service) => [service.service_id, serviceKind(service)]));
const stops = parseCsv("stops.txt");
const trips = parseCsv("trips.txt");
const stopTimes = parseCsv("stop_times.txt");

const parentStops = stops
  .filter((stop) => stop.location_type === "1")
  .map((stop) => ({
    id: stop.stop_id,
    name: compactStationName(stop.stop_name),
    lat: Number(stop.stop_lat),
    lng: Number(stop.stop_lon)
  }))
  .filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng));

const parentByStopId = new Map(parentStops.map((stop) => [stop.id, stop]));
const platformToParent = new Map();

stops.forEach((stop) => {
  const parent = parentByStopId.get(stop.parent_station || stop.stop_id);
  if (parent) platformToParent.set(stop.stop_id, parent.id);
});

const tripMeta = new Map(
  trips
    .filter((trip) => services.has(trip.service_id))
    .map((trip) => {
      const route = routes.get(trip.route_id);
      return [
        trip.trip_id,
        {
          number: trip.trip_short_name || trip.trip_id,
          headsign: trip.trip_headsign,
          direction: trip.direction_id === "0" ? "north" : "south",
          service: services.get(trip.service_id),
          kind: route ? route.route_short_name.replace(/\s+(Weekday|Weekend)$/i, "") : "Train"
        }
      ];
    })
);

const stopsByTrip = new Map();
stopTimes.forEach((stopTime) => {
  const meta = tripMeta.get(stopTime.trip_id);
  const stationId = platformToParent.get(stopTime.stop_id);
  if (!meta || !stationId) return;

  if (!stopsByTrip.has(stopTime.trip_id)) stopsByTrip.set(stopTime.trip_id, []);
  stopsByTrip.get(stopTime.trip_id).push({
    station: stationId,
    arrival: stopTime.arrival_time,
    departure: stopTime.departure_time,
    sequence: Number(stopTime.stop_sequence)
  });
});

const scheduleTrips = [];
stopsByTrip.forEach((tripStops, tripId) => {
  const meta = tripMeta.get(tripId);
  const sortedStops = tripStops.sort((a, b) => a.sequence - b.sequence);

  scheduleTrips.push({
    id: tripId,
    n: meta.number,
    h: meta.headsign,
    d: meta.direction,
    s: meta.service,
    k: meta.kind,
    t: sortedStops.map((stop) => [stop.station, stop.arrival, stop.departure])
  });
});

const stationIdsInTrips = new Set(scheduleTrips.flatMap((trip) => trip.t.map((stop) => stop[0])));
const stations = parentStops
  .filter((station) => stationIdsInTrips.has(station.id))
  .sort((a, b) => b.lat - a.lat)
  .map((station, index) => ({ ...station, index }));

const stationIds = new Set(stations.map((station) => station.id));
const data = {
  generatedAt: new Date().toISOString(),
  source: "https://data.trilliumtransit.com/gtfs/caltrain-ca-us/caltrain-ca-us.zip",
  stations,
  trips: scheduleTrips.filter((trip) => trip.t.some((stop) => stationIds.has(stop[0])))
};

fs.writeFileSync(
  outputPath,
  `window.CALTRAIN_SCHEDULE_DATA = ${JSON.stringify(data)};\n`,
  "utf8"
);

console.log(`Wrote ${data.stations.length} stations and ${data.trips.length} trips to ${outputPath}`);
