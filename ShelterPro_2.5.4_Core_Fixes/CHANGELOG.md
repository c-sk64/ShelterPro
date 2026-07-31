# Shelter Pro 2.5.4

- Added a visible Share Route button to Driving Mode.
- Added a visible Share Route button to Route Manager.
- Permanently disabled the direct GPS-to-shelter straight line.
- Added Route beside All Areas, North, South, East, West, CBD / Inner and Today's Jobs.
- Route filter shows only shelters in the active route.
- Updated Check Now to compare installed and published versions.
- Updated the service-worker cache to 2.5.4.

# Shelter Pro 2.5.2

- Kept Share Route in Driving Mode.
- Kept Share Route in Route Manager.
- Removed only the direct straight line from the current GPS location to a shelter.
- Kept proper road-following routes for Shelter Pro GPS.

# Shelter Pro 2.4.0 — Automatic Update

- Automatic version check when the app opens or returns to the foreground.
- Update Available dialog with release notes.
- One-tap Update Now clears old app caches and reloads the latest GitHub Pages release.
- Today’s Jobs, route, progress, favourites and settings remain in local storage.
- Current version/build and manual Check Now option in Settings.
- Added navigation-pro.js and updater.js to the offline application cache.

# Shelter Pro 2.3

- Added navigation choice: Shelter Pro GPS, Apple Maps, Google Maps and Waze.
- Added built-in road route using OSRM.
- Added current street, next street and spoken turn instruction.
- Added next-stop and final-stop distance, time and arrival estimates.
- Added Search and Fit Route buttons in Driving Mode.
- Active route stops remain visible with site numbers when zoomed out.
- Added default navigation preference in Settings.

# Changelog

## 2.2.1 Apple Maps Fix
- Start Driving selects the first unfinished route stop, or the first unfinished Today’s Job when the route is empty.
- Added Cleaned and Skip controls to Today’s Jobs and Route Manager.
- Added automatic next-stop selection after Cleaned or Skip.
- Added current-stop highlighting.
- Added live route progress, remaining and skipped counts.
- Added Today’s Jobs map filter.
- Progress and statuses remain saved after refresh.
- Improved CSV text decoding and fixed common mojibake such as â€“ becoming –.


## 2.2.1 – Apple Maps Fix
- Replaced the legacy Apple Maps `daddr` link with the current unified directions URL.
- Uses the shelter address, with GPS coordinates as fallback.
- Corrected the Apple Maps action inside map marker popups.

## 2.5.0 — Route Sharing and Navigation Actions
- Added Share Active Route to Apple Maps and Google Maps.
- Splits large Apple Maps routes into compatible sections.
- Added Copy Route List.
- Added Navigate buttons to Search, Today's Jobs and Favourites.
- Added current-stop navigation from the route sharing screen.
