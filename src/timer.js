/**
 * WAY OUT - Countdown Timer & Death Sequence
 * Enforces:
 * 1. Timer starts ONLY when START GAME is clicked.
 * 2. At 00:00, character and interactions are frozen instantly.
 * 3. A slow black screen fade of at least 3 seconds (3200ms) occurs before Game Over appears.
 */

export class TimerManager {
  constructor(gameState, audio, narrator) {
    this.gameState = gameState;
    this.audio = audio;
    this.narrator = narrator;
    this.intervalId = null;

    this.warnings = {
      120: false, // 2:00
      60: false,  // 1:00
      30: false,  // 0:30
      10: false,  // 0:10
    };
  }

  start() {
    this.stop();
    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset() {
    this.stop();
    this.warnings = { 120: false, 60: false, 30: false, 10: false };
    this.gameState.controlState.timeRemaining = 300;
    if (typeof document !== 'undefined') {
      const el = document.getElementById('timer-display');
      if (el) {
        el.classList.remove('urgent-amber', 'urgent-red', 'urgent');
      }
    }
  }

  tick() {
    const s = this.gameState.getState();
    if (!s.controlState.running || s.puzzleState.escaped || s.controlState.timerExpired) {
      return;
    }

    let remaining = s.controlState.timeRemaining - 1;

    if (remaining <= 0) {
      remaining = 0;
      this.stop();
      this.handleTimerExpiration();
      return;
    }

    this.gameState.controlState.timeRemaining = remaining;
    this.gameState.emit('stateChange', this.gameState.getState());
    this.checkWarnings(remaining);
  }

  checkWarnings(remaining) {
    if (remaining <= 120 && !this.warnings[120]) {
      this.warnings[120] = true;
      this.narrator.speak('Two minutes remaining... The air is turning thin. I must hurry.');
    }
    if (remaining <= 60 && !this.warnings[60]) {
      this.warnings[60] = true;
      this.audio.play('code_bad');
      this.narrator.speak('Only one minute left! I have to break out now!');
    }
    if (remaining <= 30 && !this.warnings[30]) {
      this.warnings[30] = true;
      this.audio.play('code_bad');
      this.narrator.speak('Thirty seconds! My vision is dimming...');
      if (typeof document !== 'undefined') {
        const el = document.getElementById('timer-display');
        if (el) {
          el.classList.remove('urgent-amber', 'urgent-red');
          el.classList.add('urgent-amber');
        }
      }
    }
    if (remaining <= 10 && !this.warnings[10]) {
      this.warnings[10] = true;
      this.audio.play('code_bad');
      this.narrator.speak('Ten seconds left! Hurry!');
      if (typeof document !== 'undefined') {
        const el = document.getElementById('timer-display');
        if (el) {
          el.classList.remove('urgent-amber', 'urgent-red');
          el.classList.add('urgent-red');
        }
      }
    }
  }

  handleTimerExpiration() {
    // 1. Instantly freeze player movement and interaction
    this.gameState.expireTimer();
    this.audio.play('code_bad');
    this.narrator.speak('Time expired. Consciousness slips away...');

    // 2. Trigger the slow black fade (MUST be at least 3 seconds)
    if (typeof document !== 'undefined') {
      const fadeOverlay = document.getElementById('death-fade-overlay');
      if (fadeOverlay) {
        fadeOverlay.classList.remove('hidden');
        void fadeOverlay.offsetWidth;
        fadeOverlay.classList.add('fading-out'); // 3.2s CSS transition to pure black
      }

      // 3. Game Over screen appears ONLY after the 3+ second fade has completed
      setTimeout(() => {
        document.getElementById('modal-game-over')?.classList.remove('hidden');
      }, 3300);
    }
  }

  format(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
}
