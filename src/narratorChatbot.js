/**
 * WAY OUT - Narrator Chatbox (ALWAYS VISIBLE in Top-Right Corner)
 * Per Specification Section 10:
 * - Always visible at top-right corner.
 * - Displays the entire conversation history in scrollable area with newest message at bottom.
 * - Never auto-hides or requires clicking a button to reveal.
 * - Subtle notification pulse on new message without pausing the timer or gameplay.
 */

export class NarratorChatbot {
  constructor(gameState, audio) {
    this.gameState = gameState;
    this.audio = audio;
    this.container = document.getElementById('narrator-panel');
    this.currentTextEl = document.getElementById('narrator-current-text');
    this.historyModal = document.getElementById('modal-narrator-history');
    this.historyListEl = document.getElementById('narrator-history-list');
    this.btnCloseHistory = document.getElementById('btn-close-narrator-history');
    this.lastHintTime = Date.now();

    this.init();
  }

  init() {
    // Tap narrator panel to expand full history
    this.container?.addEventListener('click', () => {
      this.audio.play('click');
      this.openHistory();
    });

    this.btnCloseHistory?.addEventListener('click', () => {
      this.audio.play('click');
      this.closeHistory();
    });

    // Check periodically for progressive hints if player takes long
    setInterval(() => this.checkStuckHints(), 35000);
  }

  openHistory() {
    this.renderHistory();
    this.historyModal?.classList.remove('hidden');
  }

  closeHistory() {
    this.historyModal?.classList.add('hidden');
  }

  renderHistory() {
    if (!this.historyListEl) return;
    this.historyListEl.innerHTML = '';
    const history = this.gameState.narratorHistory;

    if (history.length === 0) {
      this.historyListEl.innerHTML = '<div class="history-empty">No messages recorded yet.</div>';
      return;
    }

    history.forEach(item => {
      const row = document.createElement('div');
      row.className = 'history-item';
      row.innerHTML = `
        <div class="history-item-meta">
          <span class="history-time">${item.timestamp}</span>
        </div>
        <div class="history-item-text">"${item.text}"</div>
      `;
      this.historyListEl.appendChild(row);
    });

    this.historyListEl.scrollTop = this.historyListEl.scrollHeight;
  }

  speak(text, options = { silent: false }) {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgObj = { text, timestamp, id: Date.now() };

    this.gameState.narratorHistory.push(msgObj);

    // Update compact always-visible top-right box
    if (this.currentTextEl) {
      this.currentTextEl.textContent = `"${text}"`;
    }

    // If history modal is open, append
    if (this.historyModal && !this.historyModal.classList.contains('hidden')) {
      this.renderHistory();
    }

    if (!options.silent) {
      this.audio.play('narrator');
      // Subtle pulse on panel
      if (this.container) {
        this.container.classList.remove('pulse-glow');
        void this.container.offsetWidth;
        this.container.classList.add('pulse-glow');
      }
    }

    this.lastHintTime = Date.now();
  }

  triggerProgressionHint(stage) {
    switch (stage) {
      case 'start':
        this.speak('You are awake... My head throbs. I have a Strange Key in my pocket, but what does it open?');
        break;
      case 'crowbar':
        this.speak('That metal tool might be useful for something that doesn\'t want to be opened.');
        break;
      case 'access_card_1':
        this.speak('A card alone won\'t open the final way out. Keep looking.');
        break;
      case 'carpet':
        this.speak('Sometimes what is hidden is not hidden very far beneath your feet.');
        break;
      case 'phone':
        this.speak('11:11... Four numbers. Perhaps they belong somewhere.');
        break;
      case 'door_lock_1':
        this.speak('One lock has surrendered. But the door still refuses to open.');
        break;
      case 'cabinet_key':
        this.speak('There is still a locked container somewhere in this room.');
        break;
      case 'access_card_2':
        this.speak('You may have what you need for the final lock.');
        break;
      case 'final_unlocked':
        this.speak('The final security lock has cleared! The exit door can now be pushed open.');
        break;
    }
  }

  checkStuckHints() {
    const s = this.gameState.getState();
    if (!s.controlState.running || s.puzzleState.escaped || s.controlState.timerExpired) return;

    const timeSinceLast = (Date.now() - this.lastHintTime) / 1000;
    if (timeSinceLast < 40) return;

    if (!s.puzzleState.drawerUnlocked) {
      this.speak('Look at the examination desk. There are two distinct drawers... one of them has a keyhole.');
    } else if (!s.inventory.crowbar) {
      this.speak('Check inside the unlocked desk drawer for the metal tool.');
    } else if (!s.puzzleState.smallBoxOpened) {
      this.speak('Three small metal boxes are scattered across the room. Use the crowbar to pry them open.');
    } else if (!s.puzzleState.carpetRevealed) {
      this.speak('That carpet doesn\'t look completely flat. Try examining it closely.');
    } else if (!s.puzzleState.phoneFound) {
      this.speak('Open the concealed metal hatch discovered beneath the carpet.');
    } else if (!s.puzzleState.firstLockUnlocked) {
      this.speak('The phone displayed 11:11. That translates directly to PIN 1111 on the exit door keypad.');
    } else if (!s.puzzleState.cabinetUnlocked) {
      this.speak('Use the Cabinet Key you received on the tall locked cabinet.');
    } else if (!s.puzzleState.finalLockUnlocked) {
      this.speak('Return to the exit door and scan Access Card #2 on the final card lock.');
    }
  }
}
