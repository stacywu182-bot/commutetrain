# CommuteTrain

CommuteTrain is a mobile-friendly Caltrain companion for checking scheduled trains, planning station-to-station trips, and finding a coffee fallback when the wait is long.

## Live Site

- https://commutetrain.vercel.app
- https://commutetrain.com

## Features

- Pin a favorite Caltrain station and direction.
- See scheduled departures for the next two hours.
- Choose an "Aim for" buffer: 5, 10, 15, 30, or 45 minutes before departure.
- Plan a route by selecting a start station and destination station.
- Compare weekday and weekend scheduled trips.
- View all Caltrain stations on a map.
- Find nearby coffee shops using OpenStreetMap Overpass, with fallback suggestions.
- Enjoy lightweight commute animations on refresh and station changes.

## Data

Train times currently use Caltrain's public static GTFS schedule feed, bundled into `schedule-data.js`.

Realtime delay, vehicle position, and service alert support is planned for a future version using 511 SF Bay GTFS-Realtime feeds after an API token is available.

## Run Locally

```powershell
node server.js
```

Then open:

```text
http://127.0.0.1:5173
```

## Refresh Schedule Data

Download the current Caltrain GTFS zip, expand it locally, then rebuild `schedule-data.js`:

```powershell
node scripts/build-schedule.js C:\tmp\caltrain-gtfs\feed schedule-data.js
```

## Deploy

The app is deployed on Vercel as a static site. Push changes to GitHub, then deploy through Vercel.
