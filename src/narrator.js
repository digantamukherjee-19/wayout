/**
 * WAY OUT - Narrator & Dialogue Subsystem
 * Renders dialogue with speaker labels, typewriter text animation, queuing, and tap-to-complete.
 */

export class Narrator {
  constructor(audio, domElements) {
    this.audio = audio;
    this.container = domElements?.container || null;
    this.textEl = domElements?.text || null;
    this.speakerEl = domElements?.speaker || null;

    this.messageQueue = [];
    this.isTyping = false;
    this.currentText = '';
    this.typewriterInterval = null;
    this.autoDismissTimeout = null;
  }

  setElements({ container, text, speaker }) {
    this.container = container;
    this.textEl = text;
    this.speakerEl = speaker;

    if (this.container) {
      this.container.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.advance();
      });
    }
  }

  speak(text, speaker = 'NARRATOR', durationMs = 4500) {
    this.messageQueue.push({ text, speaker, durationMs });
    if (!this.isTyping && this.messageQueue.length === 1) {
      this._playNext();
    }
  }

  advance() {
    if (this.isTyping) {
      // Instantly finish current typewriter text
      this._finishCurrentTyping();
    } else if (this.messageQueue.length > 0) {
      this._playNext();
    } else {
      this.hide();
    }
  }

  _playNext() {
    if (this.messageQueue.length === 0) {
      this.hide();
      return;
    }

    const current = this.messageQueue.shift();
    this.currentText = current.text;
    this.isTyping = true;

    if (this.speakerEl) {
      this.speakerEl.textContent = current.speaker;
    }

    if (this.container) {
      this.container.classList.remove('hidden');
      this.container.classList.add('visible');
    }

    if (this.textEl) {
      this.textEl.textContent = '';
    }

    if (this.autoDismissTimeout) {
      clearTimeout(this.autoDismissTimeout);
      this.autoDismissTimeout = null;
    }

    let charIndex = 0;
    const speed = 25; // ms per char

    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
    }

    this.typewriterInterval = setInterval(() => {
      if (charIndex < this.currentText.length) {
        if (this.textEl) {
          this.textEl.textContent += this.currentText[charIndex];
        }
        if (charIndex % 3 === 0 && this.audio) {
          this.audio.play('typewriter');
        }
        charIndex++;
      } else {
        this._finishCurrentTyping(current.durationMs);
      }
    }, speed);
  }

  _finishCurrentTyping(durationMs = 4000) {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }
    if (this.textEl) {
      this.textEl.textContent = this.currentText;
    }
    this.isTyping = false;

    if (this.autoDismissTimeout) {
      clearTimeout(this.autoDismissTimeout);
    }

    this.autoDismissTimeout = setTimeout(() => {
      if (this.messageQueue.length > 0) {
        this._playNext();
      } else {
        this.hide();
      }
    }, durationMs);
  }

  hide() {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }
    if (this.autoDismissTimeout) {
      clearTimeout(this.autoDismissTimeout);
      this.autoDismissTimeout = null;
    }
    this.isTyping = false;
    if (this.container) {
      this.container.classList.remove('visible');
      this.container.classList.add('hidden');
    }
  }

  clear() {
    this.messageQueue = [];
    this.hide();
  }
}
