/**
 * WAY OUT - Puzzle Engine & State Handlers
 * Implements interactive close-up puzzle logic for all room components and locks.
 */

export class PuzzleSystem {
  constructor(gameState, audio, narrator, timerManager) {
    this.gameState = gameState;
    this.audio = audio;
    this.narrator = narrator;
    this.timer = timerManager;

    // Local inspection state trackers
    this.clockState = {
      hour: 12,
      minute: 0,
      solved: false,
    };

    this.bookshelfState = {
      currentOrder: ['Red', 'Blue', 'Green', 'Gold'],
      solved: false,
    };

    this.cabinetDials = [0, 0, 0];

    this.keypadInput = '';
    this.keypadStatus = 'LOCKED';

    this.paintingTilted = false;
    this.uvLightOn = false;

    this.init();
  }

  init() {
    this.gameState.on('stateReset', () => this.resetLocalStates());
  }

  resetLocalStates() {
    const state = this.gameState.get();
    const config = state.config;

    this.clockState = {
      hour: 12,
      minute: 0,
      solved: false,
    };

    if (config) {
      this.bookshelfState = {
        currentOrder: [...config.bookshelf.initialOrder],
        solved: false,
      };
    } else {
      this.bookshelfState = {
        currentOrder: ['Red', 'Blue', 'Green', 'Gold'],
        solved: false,
      };
    }

    this.cabinetDials = [0, 0, 0];
    this.keypadInput = '';
    this.keypadStatus = 'LOCKED';
    this.paintingTilted = false;
    this.uvLightOn = false;
  }

  // === CLOCK PUZZLE ===
  adjustClockHour(delta) {
    let newH = this.clockState.hour + delta;
    if (newH > 12) newH = 1;
    if (newH < 1) newH = 12;
    this.clockState.hour = newH;
    this.audio.play('tick_tock');
    this.checkClockSolution();
    return this.clockState;
  }

  adjustClockMinute(delta) {
    let newM = this.clockState.minute + delta;
    if (newM >= 60) newM = 0;
    if (newM < 0) newM = 55;
    this.clockState.minute = newM;
    this.audio.play('tick_tock');
    this.checkClockSolution();
    return this.clockState;
  }

  checkClockSolution() {
    if (this.clockState.solved || this.gameState.isPuzzleSolved('clock')) return;
    const config = this.gameState.get().config;
    if (!config) return;

    if (this.clockState.hour === config.clock.hour && this.clockState.minute === config.clock.minute) {
      this.clockState.solved = true;
      this.gameState.solvePuzzle('clock');
      this.audio.play('puzzle_solve');
      this.narrator.speak('A spring-loaded hatch in the clock face popped open! An antique key fell out.');
    }
  }

  // === BOOKSHELF PUZZLE ===
  swapBooks(indexA, indexB) {
    if (this.bookshelfState.solved || this.gameState.isPuzzleSolved('bookshelf')) return;
    const arr = [...this.bookshelfState.currentOrder];
    const temp = arr[indexA];
    arr[indexA] = arr[indexB];
    arr[indexB] = temp;
    this.bookshelfState.currentOrder = arr;
    this.audio.play('click');
    this.checkBookshelfSolution();
    return this.bookshelfState.currentOrder;
  }

  shiftBook(index, direction) {
    const target = index + direction;
    if (target >= 0 && target < this.bookshelfState.currentOrder.length) {
      return this.swapBooks(index, target);
    }
    return this.bookshelfState.currentOrder;
  }

  checkBookshelfSolution() {
    if (this.bookshelfState.solved || this.gameState.isPuzzleSolved('bookshelf')) return;
    const config = this.gameState.get().config;
    if (!config) return;

    const isMatch = this.bookshelfState.currentOrder.every((col, i) => col === config.bookshelf.sequence[i]);
    if (isMatch) {
      this.bookshelfState.solved = true;
      this.gameState.solvePuzzle('bookshelf');
      this.audio.play('puzzle_solve');
      this.narrator.speak('A heavy mechanical clatter! A false book slid backward, revealing an ID card compartment.');
    }
  }

  // === MEDICINE CABINET PUZZLE ===
  adjustCabinetDial(dialIndex, delta) {
    if (this.gameState.isPuzzleSolved('cabinet')) return this.cabinetDials;
    let val = this.cabinetDials[dialIndex] + delta;
    if (val > 9) val = 0;
    if (val < 0) val = 9;
    this.cabinetDials[dialIndex] = val;
    this.audio.play('click');
    this.checkCabinetSolution();
    return this.cabinetDials;
  }

  checkCabinetSolution() {
    if (this.gameState.isPuzzleSolved('cabinet')) return;
    const config = this.gameState.get().config;
    if (!config) return;

    const entered = this.cabinetDials.join('');
    if (entered === config.cabinet.code) {
      this.gameState.solvePuzzle('cabinet');
      this.audio.play('puzzle_solve');
      this.narrator.speak('The medicine cabinet tumblers aligned and clicked open!');
    }
  }

  // === DOOR KEYPAD PUZZLE ===
  pressKeypadDigit(digit) {
    if (this.gameState.get().escapeItemsUsed.item_code) return;
    if (this.keypadInput.length < 4) {
      this.keypadInput += digit;
      this.audio.play('click');
    }
  }

  clearKeypad() {
    this.keypadInput = '';
    this.keypadStatus = 'LOCKED';
    this.audio.play('click');
  }

  submitKeypad() {
    const config = this.gameState.get().config;
    if (!config || this.gameState.get().escapeItemsUsed.item_code) return;

    if (this.keypadInput === config.door.overrideCode) {
      this.keypadStatus = 'GRANTED';
      this.audio.play('puzzle_solve');
      this.gameState.useEscapeItem('item_code');
      this.narrator.speak('Code accepted! The electronic security bolts disengaged.');
    } else {
      this.keypadStatus = 'DENIED';
      this.audio.play('error');
      setTimeout(() => {
        this.keypadInput = '';
        this.keypadStatus = 'LOCKED';
      }, 1200);
    }
  }

  // === PAINTING UV TOGGLE ===
  togglePaintingTilt() {
    this.paintingTilted = !this.paintingTilted;
    this.audio.play('click');
    return this.paintingTilted;
  }

  toggleUVLight() {
    if (!this.gameState.hasItem('tool_uv_pen')) {
      this.narrator.speak('I need an ultraviolet light source to read hidden marks.');
      return false;
    }
    this.uvLightOn = !this.uvLightOn;
    this.audio.play('click');
    if (this.uvLightOn && this.paintingTilted) {
      this.audio.play('puzzle_solve');
      this.narrator.speak('The UV light reveals glowing fluorescent writing behind the frame!');
    }
    return this.uvLightOn;
  }
}
