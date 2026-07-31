/* Shelter Pro 2.5.4 - Active route sharing */
(function () {
  'use strict';

  function getStateIds() {
    try {
      const route = window.ShelterProState?.getRoute?.() || [];
      const jobs = window.ShelterProState?.getJobs?.() || [];
      const source = route.length ? route : jobs;
      return source.filter((id) => {
        const status = window.ShelterProState?.getStatus?.(id) || 'none';
        return status !== 'cleaned' && status !== 'skipped';
      });
    } catch (_) {
      return [];
    }
  }

  function getSites() {
    return getStateIds()
      .map((id) => window.SITES?.find((s) => String(s.id) === String(id)))
      .filter(Boolean);
  }

  function appleUrl(stops) {
    if (!stops.length) return '';
    // Apple Maps multi-stop support varies by iOS version. Open the ordered route
    // with the final destination and intermediate stops encoded as waypoints.
    const final = stops[stops.length - 1];
    const waypoints = stops.slice(0, -1).map((s) => `${s.lat},${s.lon}`).join('|');
    let url = `https://maps.apple.com/?daddr=${encodeURIComponent(`${final.lat},${final.lon}`)}&dirflg=d`;
    if (waypoints) url += `&waypoints=${encodeURIComponent(waypoints)}`;
    return url;
  }

  function googleUrl(stops) {
    if (!stops.length) return '';
    const final = stops[stops.length - 1];
    const waypoints = stops.slice(0, -1).map((s) => `${s.lat},${s.lon}`).join('|');
    let url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${final.lat},${final.lon}`)}&travelmode=driving`;
    if (waypoints) url += `&waypoints=${encodeURIComponent(waypoints)}`;
    return url;
  }

  function routeText(stops) {
    return stops.map((s, i) => `${i + 1}. Site ${s.id} - ${s.address || `${s.lat}, ${s.lon}`}`).join('\n');
  }

  function openModal() {
    const stops = getSites();
    if (!stops.length) {
      alert('There is no active route to share.');
      return;
    }
    const list = document.getElementById('routeShareList');
    list.innerHTML = stops.map((s) => `<li><strong>Site ${String(s.id)}</strong><br><span>${String(s.address || '')}</span></li>`).join('');
    document.getElementById('routeShareCount').textContent = `${stops.length} remaining stop${stops.length === 1 ? '' : 's'}`;
    document.getElementById('routeShareModal').classList.add('open');
  }

  function closeModal() {
    document.getElementById('routeShareModal')?.classList.remove('open');
  }

  function ensureButtons() {
    const driveButton = document.getElementById('shareActiveRoute');
    const managerButton = document.getElementById('routeShareFromManager');
    if (driveButton && !driveButton.dataset.routeShareWired) {
      driveButton.dataset.routeShareWired = '1';
      driveButton.addEventListener('click', openModal);
    }
    if (managerButton && !managerButton.dataset.routeShareWired) {
      managerButton.dataset.routeShareWired = '1';
      managerButton.addEventListener('click', openModal);
    }
  }

  function install() {
    if (!document.getElementById('routeShareModal')) {
      document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-backdrop route-share-modal" id="routeShareModal" role="dialog" aria-modal="true">
          <div class="settings-card route-share-card">
            <h2>Share Active Route</h2>
            <p id="routeShareCount">No active route</p>
            <ol class="route-share-list" id="routeShareList"></ol>
            <div class="route-share-actions">
              <button class="primary" id="routeShareApple">🍎 Open Route in Apple Maps</button>
              <button id="routeShareGoogle">🌍 Open Route in Google Maps</button>
              <button id="routeShareCopy">📋 Copy Route List</button>
            </div>
            <button id="routeShareClose">Cancel</button>
          </div>
        </div>`);
    }

    ensureButtons();
    new MutationObserver(ensureButtons).observe(document.body, { childList: true, subtree: true });

    document.getElementById('routeShareClose').onclick = closeModal;
    document.getElementById('routeShareModal').onclick = (e) => {
      if (e.target.id === 'routeShareModal') closeModal();
    };
    document.getElementById('routeShareApple').onclick = () => {
      const stops = getSites();
      const url = appleUrl(stops);
      if (url) window.location.href = url;
    };
    document.getElementById('routeShareGoogle').onclick = () => {
      const stops = getSites();
      const url = googleUrl(stops.slice(0, 10));
      if (stops.length > 10) alert('Google Maps will open the first 10 remaining stops.');
      if (url) window.open(url, '_blank', 'noopener');
    };
    document.getElementById('routeShareCopy').onclick = async () => {
      const text = routeText(getSites());
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        alert('Active route copied.');
      } catch (_) {
        prompt('Copy active route:', text);
      }
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();

  window.ShelterProRouteShare = { open: openModal };
})();
