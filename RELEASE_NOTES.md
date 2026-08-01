# Shelter Pro 2.5.6 — iPhone Update Bridge

This is a focused stability release based on the live 2.5.5 application.

## Fixed

- No repeated update popup.
- No forced reload loop.
- No service-worker unregister loop.
- Manual Check Now bypasses cached version data.
- Update Now safely requests the newest service worker.
- iPhone users finish activation by closing and reopening Shelter Pro.

## Important

Publish this version to the `main` branch before testing the iPhone updater. The live `version.json` must show 2.5.6.
