// rank.js - Updated with Safe Guard Checks for distanceToSquared

window.playerLap = 1;
window.playerU = 0;
window.playerLastU = 0;
window.playerFinished = false;
window.raceFinishOrder = [];

function getAiProgress(ai) {
  if (ai.finished) {
    return 999.0 + (ai.finishOrderIndex || 0);
  }
  const currentLap = ai.lap || 1;
  return (currentLap - 1) + ai.u;
}

function resetRankSystem() {
  window.playerLap = 1;
  window.playerU = 0;
  window.playerLastU = 0;
  window.playerFinished = false;
  window.raceFinishOrder = [];

  if (typeof aiCars !== 'undefined' && Array.isArray(aiCars)) {
    aiCars.forEach(ai => {
      ai.lap = 1;
      ai.finished = false;
      ai.u = ai.initialU || 0;
      delete ai._baseSpeed;
      delete ai._targetLane;
    });
    if (typeof window.initKartBehavior === 'function') {
      window.initKartBehavior(aiCars);
    }
  }

  const lapEl = document.getElementById('current-lap');
  if (lapEl) lapEl.innerText = window.playerLap;
}

function updateRanksAndLaps(trackCurve, TOTAL_LAPS, playerCar, aiCars) {
  // Safety check: ensure playerCar and trackCurve are initialized
  if (!playerCar || !trackCurve || typeof trackCurve.getPointAt !== 'function') return;

  let minDistanceSq = Infinity;
  let bestU = window.playerU;

  const searchRange = 0.40;
  const samples = 200;

  for (let i = 0; i < samples; i++) {
    const offset = ((i / samples) - 0.5) * searchRange;
    const testU = (window.playerLastU + offset + 1.0) % 1.0;
    const pt = trackCurve.getPointAt(testU);
    
    // Guard check to prevent distanceToSquared crash if pt or position is undefined
    if (pt && playerCar.position) {
      const distSq = playerCar.position.distanceToSquared(pt);

      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        bestU = testU;
      }
    }
  }

  window.playerU = bestU;

  if (window.playerLastU > 0.80 && window.playerU < 0.20 && !window.playerFinished) {
    window.playerLap++;
    if (window.playerLap > TOTAL_LAPS) {
      window.playerFinished = true;
      window.playerLap = TOTAL_LAPS;
      recordFinish({ name: 'YOU (Player)', isPlayer: true });
    }
    const lapEl = document.getElementById('current-lap');
    if (lapEl) lapEl.innerText = Math.min(window.playerLap, TOTAL_LAPS);
  }
  window.playerLastU = window.playerU;

  if (aiCars && Array.isArray(aiCars)) {
    const playerProgress = (window.playerLap - 1) + window.playerU;

    aiCars.forEach(ai => {
      if (ai.finished) return;

      if (!ai._baseSpeed) ai._baseSpeed = ai.speed;
      if (ai._targetLane === undefined) ai._targetLane = ai.offsetLane;

      const aiProg = getAiProgress(ai);
      let desiredLane = (ai.id % 2 === 0) ? 3.0 : -3.0;

      aiCars.forEach(otherAi => {
        if (otherAi === ai) return;
        const otherProg = getAiProgress(otherAi);
        const gap = otherProg - aiProg;

        if (gap > 0 && gap < 0.05) {
          desiredLane = otherAi.offsetLane > 0 ? -3.5 : 3.5;
        }
      });

      const playerGap = playerProgress - aiProg;
      if (playerGap > 0 && playerGap < 0.05) {
        desiredLane = ai.offsetLane >= 0 ? -3.5 : 3.5;
      }

      ai._targetLane += (desiredLane - ai._targetLane) * 0.03;
      ai.offsetLane += (ai._targetLane - ai.offsetLane) * 0.04;
    });
  }

  const competitors = [
    {
      name: 'YOU (Player)',
      isPlayer: true,
      totalProgress: window.playerFinished ? 1000.0 : ((window.playerLap - 1) + window.playerU),
      finished: window.playerFinished
    },
    ...(aiCars || []).map(ai => ({
      name: ai.name,
      isPlayer: false,
      totalProgress: getAiProgress(ai),
      finished: !!ai.finished
    }))
  ];

  competitors.sort((a, b) => b.totalProgress - a.totalProgress);

  const playerRank = window.playerFinished ? (window.raceFinishOrder.findIndex(c => c.isPlayer) + 1 || 1) : (competitors.findIndex(c => c.isPlayer) + 1);
  const posEl = document.getElementById('position');
  if (posEl) posEl.innerText = playerRank;

  const resultsModal = document.getElementById('results-modal');
  if (window.playerFinished && resultsModal && resultsModal.style.display === 'none') {
    setTimeout(() => {
      showResultsModal();
    }, 1200);
  }
}

function showSideAnnouncement(text, subtext) {
  let container = document.getElementById('side-announcements');
  if (!container) {
    container = document.createElement('div');
    container.id = 'side-announcements';
    document.body.appendChild(container);
  }

  const card = document.createElement('div');
  card.className = 'side-announcement-card';
  card.innerHTML = `
    <div class="announcement-title">${text}</div>
    <div class="announcement-sub">${subtext}</div>
  `;
  container.appendChild(card);

  setTimeout(() => {
    card.classList.add('show');
  }, 50);

  setTimeout(() => {
    card.classList.remove('show');
    setTimeout(() => card.remove(), 400);
  }, 3500);
}

function recordFinish(competitor) {
  if (!window.raceFinishOrder.some(c => c.isPlayer === competitor.isPlayer && c.name === competitor.name)) {
    window.raceFinishOrder.push(competitor);
    const place = window.raceFinishOrder.length; 
    
    if (typeof trackCurve !== 'undefined' && trackCurve) {
      const finishPt = trackCurve.getPointAt(0.0);
      const tangent = trackCurve.getTangentAt(0.0).normalize();
      const side = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
      
      const slot = typeof window.getKartParkingSlot === 'function' 
        ? window.getKartParkingSlot(place - 1) 
        : { depth: 6.0 + (place * 8.0), offset: 0 };

      const designatedPos = finishPt.clone()
        .add(tangent.clone().multiplyScalar(slot.depth))
        .add(side.clone().multiplyScalar(slot.offset));

      if (competitor.isPlayer && typeof playerCar !== 'undefined' && playerCar) {
        playerCar.position.set(designatedPos.x, 0.0, designatedPos.z);
        playerCar.lookAt(finishPt.clone().add(tangent));
      } else if (!competitor.isPlayer && typeof aiCars !== 'undefined') {
        const targetAi = aiCars.find(a => a.name === competitor.name);
        if (targetAi && targetAi.mesh) {
          targetAi.finishOrderIndex = place;
          targetAi.mesh.position.set(designatedPos.x, 0.0, designatedPos.z);
          targetAi.mesh.lookAt(finishPt.clone().add(tangent));
        }
      }
    }

    showSideAnnouncement(`${competitor.name}`, `FINISHED #${place} IN THE RACE!`);
  }

  if (competitor.isPlayer && typeof isVictoryCinematic !== 'undefined' && !isVictoryCinematic) {
    isVictoryCinematic = true;
    cinematicStartTime = performance.now();
  }
}

function showResultsModal() {
  if (typeof window.playEndMusic === 'function') {
    window.playEndMusic();
  }

  const modal = document.getElementById('results-modal');
  const title = document.getElementById('results-title');
  const badge = document.getElementById('results-badge');
  const scoreEl = document.getElementById('final-score');
  const standingsList = document.getElementById('standings-list');

  const playerFinishIndex = window.raceFinishOrder.findIndex(c => c.isPlayer);
  const finalRank = playerFinishIndex !== -1 ? playerFinishIndex + 1 : 1;

  if (finalRank === 1) {
    title.innerText = 'GRAND PRIX CHAMPION!';
    badge.innerText = 'VICTORY';
    badge.className = 'badge gold';
  } else if (finalRank === 2) {
    title.innerText = 'RACE FINISHED';
    badge.innerText = 'PLACED 2ND';
    badge.className = 'badge';
  } else if (finalRank === 3) {
    title.innerText = 'RACE FINISHED';
    badge.innerText = 'PLACED 3RD';
    badge.className = 'badge';
  } else {
    title.innerText = 'RACE FINISHED';
    badge.innerText = 'PLACED 4TH';
    badge.className = 'badge';
  }

  const startTime = typeof raceStartTime !== 'undefined' ? raceStartTime : performance.now();
  const timeElapsed = ((performance.now() - startTime) / 1000).toFixed(1);
  const baseScore = Math.max(1000, 10000 - Math.floor(timeElapsed * 50));
  const rankMultiplier = [1.0, 0.75, 0.5, 0.25][finalRank - 1] || 0.2;
  const finalScore = Math.floor(baseScore * rankMultiplier);

  if (scoreEl) scoreEl.innerText = finalScore.toLocaleString();
  if (standingsList) {
    standingsList.innerHTML = '';
    
    const currentAiCars = typeof aiCars !== 'undefined' ? aiCars : [];
    
    const sortedCompetitors = [
      { name: 'YOU (Player)', isPlayer: true, finished: window.playerFinished, progress: window.playerFinished ? 1000 : ((window.playerLap - 1) + window.playerU) },
      ...currentAiCars.map(ai => ({ name: ai.name, isPlayer: false, finished: ai.finished, progress: getAiProgress(ai) }))
    ];

    sortedCompetitors.sort((a, b) => {
      const orderA = window.raceFinishOrder.findIndex(c => c.name === a.name);
      const orderB = window.raceFinishOrder.findIndex(c => c.name === b.name);
      
      if (orderA !== -1 && orderB !== -1) return orderA - orderB;
      if (orderA !== -1) return -1;
      if (orderB !== -1) return 1;
      return b.progress - a.progress;
    });

    sortedCompetitors.forEach((driver, idx) => {
      const row = document.createElement('div');
      let highlightClass = idx < 3 ? 'top-3' : '';
      if (idx === 0) highlightClass = 'first';

      row.className = `standing-row ${highlightClass}`;
      row.innerHTML = `
        <span>${idx + 1}. ${driver.name}</span>
        <span>${driver.finished ? 'FINISHED' : `LAP ${Math.min(3, Math.floor(driver.progress) + 1)}/3`}</span>
      `;
      standingsList.appendChild(row);
    });
  }

  if (modal) modal.style.display = 'flex';
}

window.resetRankSystem = resetRankSystem;
window.updateRanksAndLaps = updateRanksAndLaps;
window.recordFinish = recordFinish;
window.showResultsModal = showResultsModal;