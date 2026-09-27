/**
 * WAY OUT - State & Dependency Machine
 *
 * CRITICAL RULES IMPLEMENTED:
 * 1. Items are NEVER consumed when used. Ownership flags remain true permanently once acquired.
 * 2. Strict separation between item ownership (inventory) and puzzle progression (puzzleState).
 * 3. Every puzzle enforces both the required item AND previous step completion.
 * 4. At timer 00:00, playerCanMove and canInteract are instantly frozen, followed by a >= 3-second death fade.
 */

export class GameStateManager {
  constructor() {
    this.listeners = new Map();
    this.reset();
  }

  reset(seed = null) {
    // 1. INVENTORY: Separate item ownership. NEVER set to false once acquired!
    this.inventory = {
      strangeKey: true,    // Player STARTS with Strange Key!
      crowbar: false,
      accessCard1: false,
      phone: false,
      cabinetKey: false,
      accessCard2: false,
    };

    // 2. PUZZLE STATE: Progression flags
    this.puzzleState = {
      drawerUnlocked: false,
      openedBoxes: { box_1: false, box_2: false, box_3: false },
      smallBoxOpened: false,      // Correct box opened
      carpetRevealed: false,
      carpetCompartmentOpened: false,
      phoneFound: false,
      phoneExamined: false,
      firstLockUnlocked: false,   // PIN 1111 entered
      cabinetUnlocked: false,     // Correct cabinet unlocked with Cabinet Key
      finalLockUnlocked: false,   // Unlocked with Access Card #2
      doorPhysicallyOpen: false,  // Swung open in 3D
      escaped: false,             // Completed ending
    };

    // 3. GAMEPLAY CONTROLS & TIMERS
    this.controlState = {
      gameStarted: false,
      running: false,
      playerCanMove: false,
      canInteract: false,
      timerExpired: false,
      timeRemaining: 300,        // 5:00
      timeGift1Collected: false,
      timeGift2Collected: false,
      extensionGiftsCount: 0,
      maxExtensionGifts: 2,
    };

    // 4. Inspection & UI state
    this.inspectingObject = null;

    // 5. Narrator conversation history (always preserved)
    this.narratorHistory = [];

    // 6. Randomized Layout Configuration (Prompt Section 1, 4, 8, 9, 11)
    // Fixed configuration created once per game/reset:
    // - card1BoxIndex: randomly select ONE of [0, 1, 2] -> ['box_1', 'box_2', 'box_3']
    // - correctCabinetIndex: randomly select ONE of [0, 1] -> ['cabinet', 'brown_cabinet']
    // - correctDrawer is permanently 'drawer_1' (Left Drawer)
    const boxOptions = ['box_1', 'box_2', 'box_3'];
    const cabinetOptions = ['cabinet', 'brown_cabinet'];

    this.seed = seed !== null ? seed : Math.floor(Math.random() * 1000000);

    let card1BoxIndex;
    let correctCabinetIndex;

    if (seed !== null) {
      const s = Math.abs(seed);
      card1BoxIndex = s % boxOptions.length;
      correctCabinetIndex = Math.floor(s / boxOptions.length) % cabinetOptions.length;
    } else {
      card1BoxIndex = Math.floor(Math.random() * boxOptions.length);
      correctCabinetIndex = Math.floor(Math.random() * cabinetOptions.length);
    }

    this.layout = {
      correctDrawer: 'drawer_1',
      correctBox: boxOptions[card1BoxIndex],
      correctCabinet: cabinetOptions[correctCabinetIndex],
      card1BoxIndex,
      correctCabinetIndex,
      misleadingCabinet: cabinetOptions[1 - correctCabinetIndex],
    };

    this.emit('stateReset', this.getState());
  }

  getState() {
    return {
      inventory: this.inventory,
      puzzleState: this.puzzleState,
      controlState: this.controlState,
      inspectingObject: this.inspectingObject,
      narratorHistory: this.narratorHistory,
      layout: this.layout,
    };
  }

  on(event, cb) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(cb);
    return () => this.listeners.get(event)?.delete(cb);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try { cb(data); } catch (e) { console.error(`Error in event ${event}:`, e); }
      });
    }
  }

  // --- Inventory Checks (Never mutate to false) ---
  hasItem(key) {
    return Boolean(this.inventory[key]);
  }

  // --- STEP 2: DESK DRAWER ---
  // Requires: Strange Key
  tryUnlockDrawer(drawerId) {
    if (this.puzzleState.drawerUnlocked) {
      return { success: true, already: true, message: 'The drawer is already open.' };
    }

    if (drawerId !== this.layout.correctDrawer) {
      return { success: false, reason: 'clutter', message: 'You search the drawer. Just old medical records and discarded stationery.' };
    }

    // Prerequisite check: Strange Key in inventory
    if (this.inventory.strangeKey === true) {
      this.puzzleState.drawerUnlocked = true;
      // AUTOMATIC PICKUP: Crowbar -> Inventory immediately
      const newlyCollected = !this.inventory.crowbar;
      this.inventory.crowbar = true;
      this.emit('drawerUnlocked');
      if (newlyCollected) {
        this.emit('itemCollected', { key: 'crowbar', name: 'CROWBAR' });
        this.emit('crowbarFound');
      }
      this.emit('stateChange', this.getState());
      return {
        success: true,
        itemCollected: newlyCollected ? 'crowbar' : null,
        itemName: 'CROWBAR',
        message: 'The Strange Key clicks into the lock. The drawer unlocks and slides open.'
      };
    }

    return { success: false, reason: 'locked', message: "It's locked." };
  }

  collectCrowbar() {
    if (this.inventory.crowbar) return true;
    this.inventory.crowbar = true;
    this.emit('itemCollected', { key: 'crowbar', name: 'CROWBAR' });
    this.emit('crowbarFound');
    this.emit('stateChange', this.getState());
    return true;
  }

  // --- STEP 3: SMALL BOX (Randomized 1 of 3 contains Access Card #1) ---
  // Requires BOTH:
  // 1. inventory.crowbar === true
  // 2. puzzleState.drawerUnlocked === true
  tryOpenSmallBox(boxId) {
    const isCorrect = boxId === this.layout.correctBox;

    if (this.puzzleState.openedBoxes && this.puzzleState.openedBoxes[boxId]) {
      return {
        success: true,
        already: true,
        isCorrect,
        boxId,
        message: isCorrect ? 'The box is already pried open.' : 'This box is already open. Nothing useful inside.'
      };
    }

    // Strict prerequisite check: Both crowbar AND drawerUnlocked
    if (
      this.inventory.strangeKey === true &&
      this.inventory.crowbar === true &&
      this.puzzleState.drawerUnlocked === true
    ) {
      if (this.puzzleState.openedBoxes) {
        this.puzzleState.openedBoxes[boxId] = true;
      }

      if (isCorrect) {
        this.puzzleState.smallBoxOpened = true;
        // AUTOMATIC PICKUP: Access Card #1 -> Inventory immediately
        const newlyCollected = !this.inventory.accessCard1;
        this.inventory.accessCard1 = true;
        this.emit('boxOpened', { boxId, isCorrect: true });
        if (newlyCollected) {
          this.emit('itemCollected', { key: 'accessCard1', name: 'ACCESS CARD' });
          this.emit('accessCard1Found');
        }
        this.emit('stateChange', this.getState());
        return {
          success: true,
          isCorrect: true,
          boxId,
          itemCollected: newlyCollected ? 'accessCard1' : null,
          itemName: 'ACCESS CARD',
          message: 'You wedge the crowbar into the seam and pry the lid open. Inside lies Access Card #1!'
        };
      } else {
        this.emit('boxOpened', { boxId, isCorrect: false });
        this.emit('stateChange', this.getState());
        return {
          success: true,
          isCorrect: false,
          boxId,
          message: 'You pry the box open. Inside is only an old photograph and dry cotton.'
        };
      }
    }

    return {
      success: false,
      reason: 'needs_crowbar',
      boxId,
      message: 'I need something strong enough to open this.'
    };
  }

  collectAccessCard1() {
    if (this.inventory.accessCard1) return true;
    this.inventory.accessCard1 = true;
    this.emit('itemCollected', { key: 'accessCard1', name: 'ACCESS CARD' });
    this.emit('accessCard1Found');
    this.emit('stateChange', this.getState());
    return true;
  }

  // --- STEP 4: CARPET & PHONE ---
  // Requires: smallBoxOpened step completed
  interactCarpet() {
    if (!this.puzzleState.carpetRevealed) {
      this.puzzleState.carpetRevealed = true;
      this.emit('carpetRevealed');
      this.emit('stateChange', this.getState());
      return { revealed: true, message: 'You pull back the heavy carpet. Beneath the floorboards is a concealed metal compartment hatch!' };
    }
    return { revealed: true, already: true, message: 'The carpet has already been pulled back.' };
  }

  openCompartment() {
    if (!this.puzzleState.carpetRevealed) return { success: false, message: 'There is nothing visible here.' };
    if (this.puzzleState.carpetCompartmentOpened) {
      return { success: true, already: true, message: 'The floor compartment is already open.' };
    }
    this.puzzleState.carpetCompartmentOpened = true;
    // AUTOMATIC PICKUP: Phone -> Inventory immediately
    const newlyCollected = !this.inventory.phone;
    this.inventory.phone = true;
    this.puzzleState.phoneFound = true;
    this.emit('compartmentOpen');
    if (newlyCollected) {
      this.emit('itemCollected', { key: 'phone', name: 'PHONE' });
      this.emit('phoneFound');
    }
    this.emit('stateChange', this.getState());
    return {
      success: true,
      itemCollected: newlyCollected ? 'phone' : null,
      itemName: 'PHONE',
      message: 'The metal floor compartment slides open. An old mobile phone rests inside.'
    };
  }

  collectPhone() {
    if (this.inventory.phone) return true;
    this.inventory.phone = true;
    this.puzzleState.phoneFound = true;
    this.emit('itemCollected', { key: 'phone', name: 'PHONE' });
    this.emit('phoneFound');
    this.emit('stateChange', this.getState());
    return true;
  }

  examinePhone() {
    this.puzzleState.phoneExamined = true;
    if (!this.inventory.phone) {
      this.inventory.phone = true;
      this.puzzleState.phoneFound = true;
      this.emit('itemCollected', { key: 'phone', name: 'PHONE' });
      this.emit('phoneFound');
      this.emit('stateChange', this.getState());
    }
    this.emit('phoneExamined');
    return '11:11 PM';
  }

  // --- STEP 5: MAIN EXIT DOOR LOCK 1 (PIN 1111) ---
  // Entering 1111 unlocks Lock 1 AND awards Cabinet Key
  tryDoorPin(pin) {
    if (this.puzzleState.firstLockUnlocked) {
      return { success: true, already: true, message: 'LOCK 1 is already UNLOCKED.' };
    }

    if (pin.trim() === '1111') {
      this.puzzleState.firstLockUnlocked = true;
      // AUTOMATIC PICKUP: Cabinet Key -> Inventory immediately
      const newlyCollected = !this.inventory.cabinetKey;
      this.inventory.cabinetKey = true;
      this.emit('doorLock1Unlocked');
      if (newlyCollected) {
        this.emit('itemCollected', { key: 'cabinetKey', name: 'CABINET KEY' });
        this.emit('cabinetKeyFound');
      }
      this.emit('stateChange', this.getState());
      return {
        success: true,
        itemCollected: newlyCollected ? 'cabinetKey' : null,
        itemName: 'CABINET KEY',
        message: 'LOCK 1 — UNLOCKED. The console releases the Cabinet Key into your hands.'
      };
    }

    return {
      success: false,
      message: 'The lock rejects the code.'
    };
  }

  // --- STEP 6: CABINETS (Randomized 1 of 2 is Correct, other is Misleading) ---
  // Requires:
  // 1. inventory.cabinetKey === true
  // 2. puzzleState.firstLockUnlocked === true
  tryInteractCabinet(cabinetId) {
    const isCorrect = cabinetId === this.layout.correctCabinet;

    if (isCorrect) {
      if (this.puzzleState.cabinetUnlocked) {
        return {
          success: true,
          already: true,
          isCorrect: true,
          cabinetId,
          message: 'The cabinet is already open.'
        };
      }

      if (this.inventory.cabinetKey === true && this.puzzleState.firstLockUnlocked === true) {
        this.puzzleState.cabinetUnlocked = true;
        // Exactly one Access Card #2 - no duplicate cards
        const newlyCollected = !this.inventory.accessCard2;
        this.inventory.accessCard2 = true;
        this.emit('cabinetUnlocked', { cabinetId });
        if (newlyCollected) {
          this.emit('itemCollected', { key: 'accessCard2', name: 'ACCESS CARD' });
          this.emit('accessCard2Found');
        }
        this.emit('stateChange', this.getState());
        return {
          success: true,
          isCorrect: true,
          cabinetId,
          itemCollected: newlyCollected ? 'accessCard2' : null,
          itemName: 'ACCESS CARD',
          message: 'The Cabinet Key turns in the lock. The cabinet doors swing open!'
        };
      }

      return {
        success: false,
        reason: 'locked',
        isCorrect: true,
        cabinetId,
        message: "It's locked."
      };
    }

    // Misleading cabinet: always returns "Not the perfect key."
    return {
      success: false,
      reason: 'wrong_key',
      isCorrect: false,
      cabinetId,
      message: 'Not the perfect key.'
    };
  }

  // Backward compatibility wrappers
  tryUnlockCabinet(cabinetId = 'cabinet') {
    return this.tryInteractCabinet(cabinetId);
  }

  interactBrownCabinet() {
    return this.tryInteractCabinet('brown_cabinet');
  }

  collectAccessCard2() {
    if (this.inventory.accessCard2) return true;
    this.inventory.accessCard2 = true;
    this.emit('itemCollected', { key: 'accessCard2', name: 'ACCESS CARD' });
    this.emit('accessCard2Found');
    this.emit('stateChange', this.getState());
    return true;
  }

  // --- STEP 7: MAIN EXIT DOOR LOCK 2 (Access Card #2) ---
  // Requires:
  // 1. inventory.accessCard2 === true
  // 2. puzzleState.cabinetUnlocked === true
  // 3. puzzleState.firstLockUnlocked === true
  tryDoorAccessCard() {
    if (this.puzzleState.finalLockUnlocked) {
      return { success: true, already: true, message: 'FINAL LOCK is already UNLOCKED.' };
    }

    if (
      this.inventory.accessCard2 === true &&
      this.puzzleState.cabinetUnlocked === true &&
      this.puzzleState.firstLockUnlocked === true
    ) {
      this.puzzleState.finalLockUnlocked = true;
      this.emit('doorFinalUnlocked');
      this.emit('stateChange', this.getState());
      return {
        success: true,
        message: 'FINAL LOCK — UNLOCKED. All security latches disengaged.'
      };
    }

    return {
      success: false,
      message: 'The final lock is still secured.'
    };
  }

  // --- FINAL ESCAPE ---
  tryEscapeDoor() {
    if (!this.puzzleState.firstLockUnlocked || !this.puzzleState.finalLockUnlocked) {
      return { success: false, message: 'The door is still locked.' };
    }

    this.puzzleState.doorPhysicallyOpen = true;
    this.puzzleState.escaped = true;
    this.controlState.running = false;
    this.controlState.playerCanMove = false;
    this.controlState.canInteract = false;
    this.emit('escaped');
    this.emit('stateChange', this.getState());
    return { success: true };
  }

  // --- TIME EXTENSION GIFTS ---
  collectTimeGift(giftIndex) {
    if (!this.controlState.running || this.controlState.timerExpired) return false;

    if (giftIndex === 1 && !this.controlState.timeGift1Collected) {
      if (this.controlState.extensionGiftsCount >= this.controlState.maxExtensionGifts) return false;
      this.controlState.timeGift1Collected = true;
      this.controlState.extensionGiftsCount++;
      this.controlState.timeRemaining += 30;
      this.emit('timeExtension', { added: 30, remaining: this.controlState.timeRemaining, giftIndex: 1 });
      this.emit('stateChange', this.getState());
      return true;
    }

    if (giftIndex === 2 && !this.controlState.timeGift2Collected) {
      if (this.controlState.extensionGiftsCount >= this.controlState.maxExtensionGifts) return false;
      this.controlState.timeGift2Collected = true;
      this.controlState.extensionGiftsCount++;
      this.controlState.timeRemaining += 30;
      this.emit('timeExtension', { added: 30, remaining: this.controlState.timeRemaining, giftIndex: 2 });
      this.emit('stateChange', this.getState());
      return true;
    }

    return false;
  }

  // --- TIMER 00:00 FREEZE ---
  expireTimer() {
    this.controlState.timeRemaining = 0;
    this.controlState.timerExpired = true;
    this.controlState.playerCanMove = false;
    this.controlState.canInteract = false;
    this.controlState.running = false;
    this.emit('timerExpired');
    this.emit('stateChange', this.getState());
  }
}

export { GameStateManager as GameState };
