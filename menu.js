// menu.js - Dedicated Isolated Main Menu and UI/UX Platform

(function() {
  function initMainMenu() {
    const mainMenuEl = document.getElementById('menu');
    const startBtn = document.getElementById('start-btn');
    const menuVolSlider = document.getElementById('menu-volume-slider');
    const settingsVolSlider = document.getElementById('settings-volume-slider');
    const menuSettingsBtn = document.getElementById('menu-settings-btn');
    const volumePercentText = document.getElementById('volume-percentage');

    if (menuVolSlider) {
      menuVolSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (settingsVolSlider) settingsVolSlider.value = val;
        if (volumePercentText) volumePercentText.innerText = `${Math.round(val * 100)}%`;
        
        if (typeof window.setGameVolume === 'function') {
          window.setGameVolume(val);
        }
      });
    }

    if (menuSettingsBtn) {
      menuSettingsBtn.addEventListener('click', () => {
        if (typeof window.openSettingsModal === 'function') {
          window.openSettingsModal();
        }
      });
    }

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (typeof window.startCinematicRace === 'function') {
          window.startCinematicRace();
        } else if (mainMenuEl) {
          mainMenuEl.style.display = 'none';
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMainMenu);
  } else {
    initMainMenu();
  }
})();