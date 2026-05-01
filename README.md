# Caltrain Commute

A first-pass web app for daily Caltrain commuting decisions:

- Pin a default station and direction.
- See the next two hours of trains with train number, departure time, and delay state.
- Enable browser notifications for delayed watched trains.
- Plan station-to-station trips with scheduled departure and estimated arrival times.
- Open a station map and manually pick a station toward San Francisco or southbound.
- Find nearby coffee shops for delay time.

## Live Site

https://commutetrain.vercel.app

Custom domain added in Vercel:

- https://commutetrain.com
- https://www.commutetrain.com

DNS still needs to be configured at the domain registrar:

- `A` record: `commutetrain.com` -> `76.76.21.21`
- `A` record: `www.commutetrain.com` -> `76.76.21.21`

## Run

```powershell
node server.js
```

Then open:

```text
http://127.0.0.1:5173
```

## Data Notes

This app uses the public Caltrain static GTFS schedule feed for scheduled train times. Realtime delay, vehicle position, and service alert data should connect to 511 SF Bay GTFS-Realtime feeds after a 511 API token is available.

Coffee search uses OpenStreetMap Overpass when available and falls back to curated local examples.

## Refresh Schedule Data

Download the current Caltrain GTFS zip and rebuild `schedule-data.js`:

```powershell
node scripts/build-schedule.js C:\tmp\caltrain-gtfs\feed schedule-data.js
```

## Publish With Vercel

1. Create a GitHub repo and upload this folder.
2. Import the repo in Vercel.
3. Keep the default framework settings.
4. Add `commutetrain.app` in Vercel project settings under Domains after buying the domain.
5. Update DNS records at your domain registrar using the records Vercel shows.
