# Shelter Pro 1.0 RC1

Static Progressive Web App prepared for GitHub Pages.

## Included in this build
- Dashboard, map, smart search, favourites and saved route queue
- Live GPS driving mode, heading-up map, follow mode and speed-based zoom
- Large site number, distance, address, speed, ETA and GPS-quality display
- Voice and vibration approach/arrival alerts
- Automatic next unfinished shelter after Cleaned or Skip
- Apple Maps, Google Maps and Waze launch options
- Dark mode, full-screen driving mode, landscape support and Wake Lock
- Robust vWork CSV import tested against `Hamish - Trial 2026-06-16.csv`
- Local persistence for jobs, route, favourites, settings and progress
- PWA manifest and service worker

## Not activated yet
Secure login and cloud synchronisation require a Supabase project URL and public anon key. Live traffic, traffic-light state, camera datasets, true offline map tiles and CarPlay also require separate authorised data/services or a native app. They are not falsely represented as active in this build.

## GitHub Pages
Upload all files to the root of a GitHub repository, enable **Settings → Pages → Deploy from a branch**, and choose the `main` branch/root folder.

## iPhone installation
Open the GitHub Pages URL in Safari, press Share, then **Add to Home Screen**.
