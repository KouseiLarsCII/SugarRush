// settings.js - Modern UI/UX Settings & Pause Menu Controller

document.addEventListener('DOMContentLoaded', () => {
  createSettingsElements();
  setupSettingsListeners();
});

function createSettingsElements() {
  if (document.getElementById('settings-modal')) return;

  const modalHtml = `
    <div id="settings-modal" class="game-modal-overlay" style="display: none;">
      <div class="menu-content settings-box">
        <div class="badge">PREFERENCES</div>
        <h2>GAME SETTINGS</h2>
        <p class="subtitle">Customize your audio levels and race preferences.</p>

        <div class="settings-group">
          <label class="settings-label" for="settings-volume-slider">MASTER VOLUME</label>
          <div class="volume-control-row">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
            <input type="range" id="settings-volume-slider" min="0" max="1" step="0.05" value="0.5">
            <span id="volume-percentage">50%</span>
          </div>
        </div>

        <div class="settings-group controls-info-group">
          <div class="control-title">QUICK COMMANDS</div>
          <div class="control-item">
            <span class="action">PAUSE / MENU</span>
            <span class="key">ESC</span>
          </div>
        </div>

        <div class="modal-actions">
          <button id="close-settings-btn" class="action-btn primary">RESUME / CLOSE</button>
        </div>
      </div>
    </div>

    <div id="pause-menu-modal" class="game-modal-overlay" style="display: none;">
      <div class="menu-content pause-box">
        <div class="badge">GAME PAUSED</div>
        <h2>APEX GRAND PRIX</h2>
        <p class="subtitle">Race is currently paused.</p>

        <div class="modal-actions vertical-stack">
          <button id="pause-resume-btn" class="action-btn primary">RESUME RACE</button>
          <button id="pause-restart-btn" class="action-btn secondary">RESTART RACE</button>
          <button id="pause-main-menu-btn" class="action-btn secondary">MAIN MENU</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function setupSettingsListeners() {
  const settingsModal = document.getElementById('settings-modal');
  const pauseModal = document.getElementById('pause-menu-modal');
  const volumeSlider = document.getElementById('settings-volume-slider');
  const volumePercentText = document.getElementById('volume-percentage');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  
  const resumeBtn = document.getElementById('pause-resume-btn');
  const pauseRestartBtn = document.getElementById('pause-restart-btn');
  const pauseMainMenuBtn = document.getElementById('pause-main-menu-btn');

  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (volumePercentText) volumePercentText.innerText = `${Math.round(val * 100)}%`;
      if (typeof window.setGameVolume === 'function') {
        window.setGameVolume(val);
      }
    });
  }

  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
      if (settingsModal) settingsModal.style.display = 'none';
    });
  }

  if (resumeBtn) {
    resumeBtn.addEventListener('click', () => {
      if (typeof window.togglePauseMenu === 'function') window.togglePauseMenu(false);
    });
  }

  if (pauseRestartBtn) {
    pauseRestartBtn.addEventListener('click', () => {
      if (pauseModal) pauseModal.style.display = 'none';
      if (typeof window.restartGameSession === 'function') window.restartGameSession();
    });
  }

  if (pauseMainMenuBtn) {
    pauseMainMenuBtn.addEventListener('click', () => {
      if (pauseModal) pauseModal.style.display = 'none';
      if (typeof window.returnToMainMenu === 'function') window.returnToMainMenu();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const resultsModal = document.getElementById('results-modal');
      const menu = document.getElementById('menu');
      
      if (menu && menu.style.display === 'none' && resultsModal && resultsModal.style.display === 'none') {
        if (typeof window.togglePauseMenu === 'function') {
          window.togglePauseMenu();
        }
      }
    }
  });
}

window.openSettingsModal = function() {
  const settingsModal = document.getElementById('settings-modal');
  if (settingsModal) settingsModal.style.display = 'flex';
};

window.openPauseMenu = function(show) {
  const pauseModal = document.getElementById('pause-menu-modal');
  if (pauseModal) {
    pauseModal.style.display = show ? 'flex' : 'none';
  }
};

window.returnToMainMenu = function() {
  isPlaying = false;
  isPaused = false;
  isCinematic = false;
  isVictoryCinematic = false;

  window.playerFinished = false;
  if (typeof window.resetRankSystem === 'function') {
    window.resetRankSystem();
  }

  if (typeof createVehicles === 'function') {
    createVehicles();
  }

  const pauseModal = document.getElementById('pause-menu-modal');
  const settingsModal = document.getElementById('settings-modal');
  const resultsModal = document.getElementById('results-modal');
  const countdownDisplay = document.getElementById('countdown-display');
  
  if (pauseModal) pauseModal.style.display = 'none';
  if (settingsModal) settingsModal.style.display = 'none';
  if (resultsModal) resultsModal.style.display = 'none'; 
  if (countdownDisplay) countdownDisplay.style.display = 'none';

  const mainMenu = document.getElementById('menu');
  if (mainMenu) {
    mainMenu.style.display = 'flex';
  }

  if (typeof window.playMenuMusic === 'function') {
    window.playMenuMusic();
  }
};

window.restartGameSession = function() {
  const pauseModal = document.getElementById('pause-menu-modal');
  const resultsModal = document.getElementById('results-modal');
  const settingsModal = document.getElementById('settings-modal');
  const mainMenu = document.getElementById('menu');
  const countdownDisplay = document.getElementById('countdown-display');

  if (pauseModal) pauseModal.style.display = 'none';
  if (resultsModal) resultsModal.style.display = 'none';
  if (settingsModal) settingsModal.style.display = 'none';
  if (mainMenu) mainMenu.style.display = 'none';
  if (countdownDisplay) countdownDisplay.style.display = 'none';

  isPaused = false;
  isPlaying = true;
  speed = 0;
  isVictoryCinematic = false;
  raceStarted = false; // Reset control lock flag

  countdownValue = 3; 

  window.playerFinished = false;
  if (typeof window.resetRankSystem === 'function') {
    window.resetRankSystem();
  }

  if (typeof createVehicles === 'function') {
    createVehicles();
  }

  if (typeof window.restartRaceMusic === 'function') {
    window.restartRaceMusic();
  }

  if (typeof window.startCinematicRace === 'function') {
    window.startCinematicRace();
  }
};