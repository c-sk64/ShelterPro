/* Shelter Pro 3.0.2 - immersive driving and dependable controls */
(function () {
  'use strict';

  const app = document.getElementById('app');
  const mapEl = document.getElementById('map');
  const dashboard = document.getElementById('driveDashboard');
  const fullScreenButton = document.getElementById('fullScreen');
  let hideTimer = null;

  function getHideDelay() {
    try {
      const saved = JSON.parse(localStorage.getItem('shelter_pro_drive_settings') || '{}');
      return Number(saved.autoHide ?? 5000);
    } catch (_) {
      return 5000;
    }
  }

  function isDriving() {
    return app?.classList.contains('driving');
  }

  function refreshMap() {
    requestAnimationFrame(() => setTimeout(() => {
      try { window.map?.invalidateSize({ pan: false }); } catch (_) {}
    }, 80));
  }

  function showControls(keepOpenMs) {
    if (!isDriving()) return;
    clearTimeout(hideTimer);
    app.classList.remove('controls-auto-hidden');
    const delay = Number.isFinite(keepOpenMs) ? keepOpenMs : getHideDelay();
    if (delay > 0) hideTimer = setTimeout(hideControls, delay);
  }

  function hideControls() {
    if (!isDriving()) return;
    app.classList.add('controls-auto-hidden');
    clearTimeout(hideTimer);
  }

  function setImmersive(enabled) {
    app.classList.toggle('immersive-driving', enabled);
    document.body.classList.toggle('shelterpro-immersive', enabled);
    if (fullScreenButton) fullScreenButton.textContent = enabled ? '↙ Exit Full Screen' : '⛶ Full Screen';
    refreshMap();
  }

  async function toggleImmersive() {
    const enable = !app.classList.contains('immersive-driving');
    setImmersive(enable);
    if (enable && document.documentElement.requestFullscreen) {
      try { await document.documentElement.requestFullscreen(); } catch (_) {}
    } else if (!enable && document.fullscreenElement && document.exitFullscreen) {
      try { await document.exitFullscreen(); } catch (_) {}
    }
    showControls();
  }

  function ensureRevealTab() {
    if (document.getElementById('driveRevealTab')) return;
    const button = document.createElement('button');
    button.id = 'driveRevealTab';
    button.type = 'button';
    button.setAttribute('aria-label', 'Show driving controls');
    button.textContent = '▲';
    button.addEventListener('click', () => showControls(5000));
    document.body.appendChild(button);
  }

  function wire() {
    ensureRevealTab();

    if (fullScreenButton && !fullScreenButton.dataset.immersiveWired) {
      fullScreenButton.dataset.immersiveWired = '1';
      fullScreenButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        toggleImmersive();
      }, true);
    }

    [mapEl, dashboard].filter(Boolean).forEach((element) => {
      if (element.dataset.autoHideWired) return;
      element.dataset.autoHideWired = '1';
      element.addEventListener('pointerdown', () => showControls());
    });

    const startButton = document.getElementById('startDriving');
    const routeStart = document.getElementById('routeStart');
    [startButton, routeStart].filter(Boolean).forEach((button) => {
      if (button.dataset.immersiveStartWired) return;
      button.dataset.immersiveStartWired = '1';
      button.addEventListener('click', () => {
        setTimeout(() => {
          if (isDriving()) {
            setImmersive(true);
            showControls();
          }
        }, 250);
      });
    });

    const stopButton = document.getElementById('stopDriving');
    if (stopButton && !stopButton.dataset.immersiveStopWired) {
      stopButton.dataset.immersiveStopWired = '1';
      stopButton.addEventListener('click', () => {
        clearTimeout(hideTimer);
        app.classList.remove('controls-auto-hidden');
        setImmersive(false);
      });
    }

    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && !/iphone|ipad|ipod/i.test(navigator.userAgent)) {
        setImmersive(false);
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && isDriving()) showControls();
    });
  }

  wire();
  window.ShelterProImmersive = { showControls, hideControls, setImmersive };
})();
