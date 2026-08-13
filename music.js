// music.js - Strict Audio Manager for Menu (sugar2.mp3) & Race (sugar.mp3)

const menuMusic = new Audio('sugar2.mp3');
menuMusic.loop = true;
menuMusic.volume = 0.5;

const raceMusic = new Audio('sugar.mp3');
raceMusic.loop = true;
raceMusic.volume = 0.5;

let masterVolume = 0.5;

window.addEventListener('load', () => {
    raceMusic.pause();
    raceMusic.currentTime = 0;

    const playPromise = menuMusic.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.log("Autoplay blocked by browser policy. Waiting for user interaction to start menu audio.");
            
            const unlockAudio = () => {
                const menuEl = document.getElementById('menu');
                if (menuEl && menuEl.style.display !== 'none') {
                    menuMusic.play().catch(e => console.log("Unlock play error:", e));
                }
                window.removeEventListener('click', unlockAudio);
                window.removeEventListener('keydown', unlockAudio);
            };
            window.addEventListener('click', unlockAudio, { once: true });
            window.addEventListener('keydown', unlockAudio, { once: true });
        });
    }
});

window.switchToRaceMusic = function() {
    menuMusic.pause();
    menuMusic.currentTime = 0;

    raceMusic.currentTime = 0;
    raceMusic.play().catch(error => {
        console.log("Error playing race music:", error);
    });
};

window.restartRaceMusic = function() {
    menuMusic.pause();
    menuMusic.currentTime = 0;

    raceMusic.pause();
    raceMusic.currentTime = 0;
    raceMusic.play().catch(error => {
        console.log("Error restarting race music:", error);
    });
};

window.playMenuMusic = function() {
    raceMusic.pause();
    raceMusic.currentTime = 0;

    menuMusic.currentTime = 0;
    menuMusic.play().catch(error => {
        console.log("Error playing menu music:", error);
    });
};

window.pauseRaceMusic = function() {
    if (!raceMusic.paused) {
        raceMusic.pause();
    }
};

window.resumeRaceMusic = function() {
    if (raceMusic.paused) {
        const menuEl = document.getElementById('menu');
        if (!menuEl || menuEl.style.display === 'none') {
            raceMusic.play().catch(e => console.log("Resume play error:", e));
        }
    }
};

window.setGameVolume = function(val) {
    masterVolume = Math.max(0, Math.min(1, val));
    menuMusic.volume = masterVolume;
    raceMusic.volume = masterVolume;
};