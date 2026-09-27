/**
 * WAY OUT - 3D Interaction Coordinator
 * Enforces strict sequential puzzle progression, prerequisite checks, and door modal logic.
 */

export class InteractionManager {
  constructor(camera, room3d, gameState, audio, narrator, timer) {
    this.camera = camera;
    this.room = room3d;
    this.gameState = gameState;
    this.audio = audio;
    this.narrator = narrator;
    this.timer = timer;

    this.raycaster = new THREE.Raycaster();
    this.crosshairCenter = new THREE.Vector2(0, 0);
    this.maxInteractDistance = 3.6;

    this.currentLookTarget = null;

    this.promptEl = document.getElementById('interact-prompt');
    this.promptText = document.getElementById('interact-prompt-text');
    this.btnInteract = document.getElementById('btn-interact');
    this.btnBack = document.getElementById('btn-back');

    this.bindEvents();
  }

  bindEvents() {
    this.btnInteract?.addEventListener('click', () => {
      this.interactWithCurrentTarget();
    });

    this.btnBack?.addEventListener('click', () => {
      this.closeExamination();
    });

    const canvas = document.getElementById('webgl-canvas');
    canvas?.addEventListener('click', () => {
      if (this.currentLookTarget && this.gameState.controlState.canInteract) {
        this.interactWithCurrentTarget();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'INPUT') return;
      if (e.key === 'Escape' || e.key === 'Backspace') {
        this.closeExamination();
      } else if (e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') {
        if (!this.gameState.inspectingObject && this.gameState.controlState.canInteract) {
          this.interactWithCurrentTarget();
        }
      }
    });
  }

  update() {
    // If player is examining a modal or cannot interact, hide prompt
    const s = this.gameState.getState();
    if (s.inspectingObject || !s.controlState.canInteract || s.controlState.timerExpired || s.puzzleState.escaped) {
      this.hidePrompt();
      return;
    }

    this.raycaster.setFromCamera(this.crosshairCenter, this.camera);
    const intersects = this.raycaster.intersectObjects(this.room.interactiveObjects, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      if (hit.distance <= this.maxInteractDistance) {
        let obj = hit.object;
        while (obj && !obj.userData?.interactiveId && obj.parent) {
          obj = obj.parent;
        }

        if (obj && obj.userData?.interactiveId) {
          this.currentLookTarget = obj.userData;
          this.showPrompt(obj.userData.interactiveName);
          return;
        }
      }
    }

    this.currentLookTarget = null;
    this.hidePrompt();
  }

  showPrompt(name) {
    if (this.promptEl && this.promptText) {
      this.promptText.textContent = `[ SELECT ] ${name}`;
      this.promptEl.classList.remove('hidden');
    }
  }

  hidePrompt() {
    if (this.promptEl) {
      this.promptEl.classList.add('hidden');
    }
  }

  interactWithCurrentTarget() {
    if (!this.currentLookTarget || !this.gameState.controlState.canInteract) return;
    const targetId = this.currentLookTarget.interactiveId;

    switch (targetId) {
      // 1. DESK DRAWERS
      case 'drawer_1':
      case 'drawer_2':
        this.handleDrawerInteraction(targetId);
        break;

      case 'item_crowbar':
        this.handleCrowbarPickup();
        break;

      // 2. SMALL BOXES
      case 'box_1':
      case 'box_2':
      case 'box_3':
        this.handleSmallBoxInteraction(targetId);
        break;

      case 'item_card_1':
        this.handleCard1Pickup();
        break;

      // 3. CARPET & COMPARTMENT
      case 'carpet':
        this.handleCarpetInteraction();
        break;

      case 'compartment':
        this.handleCompartmentInteraction();
        break;

      case 'item_phone':
        this.handlePhoneInteraction();
        break;

      // 4. MAIN EXIT DOOR
      case 'main_door':
        this.handleDoorInteraction();
        break;

      // 5. CABINETS
      case 'brown_cabinet':
        this.handleBrownCabinetInteraction();
        break;

      case 'cabinet':
        this.handleCabinetInteraction();
        break;

      case 'item_card_2':
        this.handleCard2Pickup();
        break;

      // 6. STOPWATCH GIFTS
      case 'gift_1':
        this.handleGiftInteraction(1);
        break;
      case 'gift_2':
        this.handleGiftInteraction(2);
        break;
    }
  }

  // --- STEP 2: DESK DRAWER ---
  handleDrawerInteraction(drawerId) {
    const res = this.gameState.tryUnlockDrawer(drawerId);
    if (res.success) {
      if (res.already) {
        this.narrator.speak(res.message);
        return;
      }
      this.audio.play('unlock');
      this.audio.play('drawer');
      // Animate Drawer 1 forward
      if (this.room.meshes.drawer1) {
        this.room.meshes.drawer1.position.x = -1.10;
      }
      if (this.room.meshes.crowbar) {
        this.room.meshes.crowbar.visible = true;
      }
      this.narrator.speak(res.message);
      this.narrator.triggerProgressionHint('crowbar');
    } else {
      if (res.reason === 'locked') {
        this.audio.play('click');
        this.narrator.speak(res.message);
      } else {
        this.audio.play('drawer');
        if (this.room.meshes.drawer2) {
          this.room.meshes.drawer2.position.x = -1.10;
        }
        this.narrator.speak(res.message);
      }
    }
  }

  handleCrowbarPickup() {
    this.narrator.speak('Crowbar is already in your inventory.');
  }

  // --- STEP 3: SMALL BOXES ---
  handleSmallBoxInteraction(boxId) {
    const res = this.gameState.tryOpenSmallBox(boxId);
    if (res.success) {
      if (res.already) {
        this.narrator.speak(res.message);
        return;
      }
      this.audio.play('crowbar');
      const boxMesh = this.room.meshes[boxId];
      if (boxMesh && boxMesh.children[1]) {
        boxMesh.children[1].rotation.x = -Math.PI / 1.8;
        boxMesh.children[1].position.z = -0.15;
      }
      if (res.isCorrect) {
        if (this.room.meshes.accessCard1) this.room.meshes.accessCard1.visible = true;
        // PHYSICALLY REVEAL PHONE ON MEDICAL TABLE
        this.room.revealPhone();
        this.narrator.triggerProgressionHint('access_card_1');
      }
      this.narrator.speak(res.message);
    } else {
      this.audio.play('click');
      this.narrator.speak(res.message);
    }
  }

  handleCard1Pickup() {
    this.narrator.speak('Access Card #1 is already in your inventory.');
  }

  // --- STEP 4: CARPET & PHONE ---
  handleCarpetInteraction() {
    const res = this.gameState.interactCarpet();
    this.audio.play('carpet');
    if (this.room.meshes.carpet) {
      this.room.meshes.carpet.position.set(0.4, 0.05, 0.8);
      this.room.meshes.carpet.rotation.z = 0.25;
    }
    this.narrator.speak(res.message);
    this.narrator.triggerProgressionHint('carpet');
  }

  handleCompartmentInteraction() {
    const res = this.gameState.openCompartment();
    if (res.success) {
      if (res.already) {
        this.narrator.speak(res.message);
        return;
      }
      this.audio.play('unlock');
      if (this.room.meshes.hatchLid) {
        this.room.meshes.hatchLid.position.x = 1.2;
      }
      if (this.room.meshes.phone) {
        this.room.meshes.phone.visible = true;
      }
      this.narrator.speak(res.message);
      // Immediately open phone modal so player sees 11:11 PM
      this.openPhoneModal();
      this.narrator.triggerProgressionHint('phone');
    } else {
      this.audio.play('click');
      this.narrator.speak(res.message);
    }
  }

  handlePhoneInteraction() {
    this.gameState.examinePhone();
    this.audio.play('phone_beep');
    if (this.room.meshes.phone) {
      this.room.meshes.phone.visible = true;
    }
    this.openPhoneModal();
    this.narrator.speak('The phone display glows: 11:11 PM.');
    this.narrator.triggerProgressionHint('phone');
  }

  openPhoneModal() {
    const modal = document.getElementById('modal-examine-phone');
    if (modal) {
      modal.classList.remove('hidden');
      this.gameState.inspectingObject = 'phone';
    }
  }

  // --- STEP 5 & 7: MAIN DOOR ---
  handleDoorInteraction() {
    const s = this.gameState.getState();
    if (s.puzzleState.firstLockUnlocked && s.puzzleState.finalLockUnlocked) {
      this.escape();
      return;
    }

    this.openDoorModal();
  }

  openDoorModal() {
    const modal = document.getElementById('modal-door-console');
    if (modal) {
      this.updateDoorModalView();
      modal.classList.remove('hidden');
      this.gameState.inspectingObject = 'door';
    }
  }

  updateDoorModalView() {
    const s = this.gameState.getState();

    // SECTION 1: PIN
    const sec1Status = document.getElementById('door-sec1-status');
    const sec1Input = document.getElementById('door-pin-input');
    const sec1Btn = document.getElementById('btn-door-pin-submit');

    if (s.puzzleState.firstLockUnlocked) {
      if (sec1Status) sec1Status.innerHTML = '<span class="status-unlocked">LOCK 1 — UNLOCKED</span>';
      if (sec1Input) sec1Input.disabled = true;
      if (sec1Btn) sec1Btn.disabled = true;
    } else {
      if (sec1Status) sec1Status.innerHTML = '<span class="status-locked">LOCK 1 — LOCKED</span>';
      if (sec1Input) { sec1Input.disabled = false; sec1Input.value = ''; }
      if (sec1Btn) sec1Btn.disabled = false;
    }

    // SECTION 2: ACCESS CARD
    const sec2Status = document.getElementById('door-sec2-status');
    const sec2Btn = document.getElementById('btn-door-card-submit');

    if (s.puzzleState.finalLockUnlocked) {
      if (sec2Status) sec2Status.innerHTML = '<span class="status-unlocked">FINAL LOCK — UNLOCKED</span>';
      if (sec2Btn) sec2Btn.disabled = true;
    } else {
      if (sec2Status) sec2Status.innerHTML = '<span class="status-locked">FINAL LOCK — LOCKED</span>';
      if (sec2Btn) sec2Btn.disabled = false;
    }
  }

  submitDoorPin(pin) {
    const res = this.gameState.tryDoorPin(pin);
    const feedback = document.getElementById('door-feedback');
    if (res.success) {
      this.audio.play('code_ok');
      if (this.room.meshes.doorLed1) {
        this.room.meshes.doorLed1.material.color.setHex(0x10b981);
      }
      if (feedback) feedback.textContent = res.message;
      this.updateDoorModalView();
      this.narrator.speak(res.message);
      this.narrator.triggerProgressionHint('door_lock_1');
    } else {
      this.audio.play('code_bad');
      if (feedback) feedback.textContent = res.message;
      this.narrator.speak(res.message);
    }
  }

  submitDoorCard() {
    const res = this.gameState.tryDoorAccessCard();
    const feedback = document.getElementById('door-feedback');
    if (res.success) {
      this.audio.play('code_ok');
      if (this.room.meshes.doorLed2) {
        this.room.meshes.doorLed2.material.color.setHex(0x10b981);
      }
      if (feedback) feedback.textContent = res.message;
      this.updateDoorModalView();
      this.narrator.speak(res.message);
      this.narrator.triggerProgressionHint('final_unlocked');
    } else {
      this.audio.play('code_bad');
      if (feedback) feedback.textContent = res.message;
      this.narrator.speak(res.message);
    }
  }

  // --- STEP 6: CABINETS (Randomized Correct vs Misleading) ---
  handleBrownCabinetInteraction() {
    this.handleCabinetInteractionCommon('brown_cabinet');
  }

  handleCabinetInteraction() {
    this.handleCabinetInteractionCommon('cabinet');
  }

  handleCabinetInteractionCommon(cabinetId) {
    const res = this.gameState.tryInteractCabinet(cabinetId);
    if (res.success) {
      if (res.already) {
        this.narrator.speak(res.message);
        return;
      }
      this.audio.play('unlock');
      this.audio.play('drawer');

      // Physically open the unlocked cabinet
      if (cabinetId === 'cabinet') {
        if (this.room.meshes.cabinetDoorLeft) this.room.meshes.cabinetDoorLeft.rotation.y = -Math.PI / 1.6;
        if (this.room.meshes.cabinetDoorRight) this.room.meshes.cabinetDoorRight.rotation.y = Math.PI / 1.6;
        if (this.room.meshes.padlock) this.room.meshes.padlock.visible = false;
      } else if (cabinetId === 'brown_cabinet') {
        if (this.room.meshes.brownDoorLeft) this.room.meshes.brownDoorLeft.rotation.y = -Math.PI / 1.6;
        if (this.room.meshes.brownDoorRight) this.room.meshes.brownDoorRight.rotation.y = Math.PI / 1.6;
      }

      if (this.room.meshes.accessCard2) {
        this.room.meshes.accessCard2.visible = true;
      }
      this.narrator.speak(res.message);
      this.narrator.triggerProgressionHint('access_card_2');
    } else {
      this.audio.play('click');
      this.narrator.speak(res.message);
    }
  }

  handleCard2Pickup() {
    this.narrator.speak('Access Card #2 is already in your inventory.');
  }

  // --- TIME EXTENSION GIFTS ---
  handleGiftInteraction(index) {
    if (this.gameState.collectTimeGift(index)) {
      this.audio.play('gift');
      const mesh = index === 1 ? this.room.meshes.gift1 : this.room.meshes.gift2;
      if (mesh) mesh.visible = false;
      this.narrator.speak('Discovered a mysterious timer device! +30 SECONDS added.');
    }
  }

  // --- ESCAPE SEQUENCE ---
  escape() {
    this.gameState.tryEscapeDoor();
    this.audio.play('door_open');
    if (this.room.meshes.doorPivot) {
      this.room.meshes.doorPivot.rotation.y = -Math.PI / 2.2;
    }

    setTimeout(() => {
      document.getElementById('modal-door-console')?.classList.add('hidden');
      if (window.wayOutGame && typeof window.wayOutGame.playOutroVideo === 'function') {
        window.wayOutGame.playOutroVideo();
      } else {
        document.getElementById('modal-ending')?.classList.remove('hidden');
      }
    }, 1200);
  }

  closeExamination() {
    this.gameState.inspectingObject = null;
    document.querySelectorAll('.modal-examine, .modal-door, #modal-item-inspect, #modal-narrator-history').forEach(el => el.classList.add('hidden'));
  }
}

