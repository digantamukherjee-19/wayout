/**
 * WAY OUT - Master 3D First-Person Escape Room Game Coordinator
 *
 * Implements the exact corrected specifications:
 * - 3-step startup sequence:
 *   1. 2-second Title Screen ("WAY OUT")
 *   2. Opening Story with "NEXT" button
 *   3. Start Game Screen with "START GAME" button
 * - Timer begins strictly after START GAME
 * - Narrator chatbox always visible in top-right corner
 * - Inventory never consumes required items
 * - Immediate freeze at 00:00 followed by 3+ second black fade before Game Over
 * - Ending story sequence followed by final message and Play Again / Exit
 */

import { GameStateManager } from './gameState.js';
import { AudioManager } from './audio.js';
import { Room3D } from './room3d.js';
import { CameraController } from './cameraController.js';
import { InteractionManager } from './interactionManager.js';
import { NarratorChatbot } from './narratorChatbot.js';
import { InventoryManager } from './inventory.js';
import { TimerManager } from './timer.js';

export class Game {
  constructor() {
    this.gameState = new GameStateManager();
    this.audio = new AudioManager();

    this.initThree();

    this.room = new Room3D(this.scene, this.gameState);
    this.cameraController = new CameraController(this.camera, this.room.colliders, this.audio, this.gameState);
    this.narrator = new NarratorChatbot(this.gameState, this.audio);
    this.timer = new TimerManager(this.gameState, this.audio, this.narrator);
    this.interaction = new InteractionManager(
      this.camera,
      this.room,
      this.gameState,
      this.audio,
      this.narrator,
      this.timer
    );
    this.inventory = new InventoryManager(this.gameState, this.audio);

    this.clock = new THREE.Clock();

    this.bindUI();
    this.startStartupSequence();

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    this.canvas = document.getElementById('webgl-canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e17);
    this.scene.fog = new THREE.FogExp2(0x0a0e17, 0.045);

    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 40);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // --- STARTUP FLOW (Section 11, 12, 13, 14) ---
  startStartupSequence() {
    // Hide in-game HUD & Narrator during introduction
    document.getElementById('hud-top')?.classList.add('hidden');
    document.getElementById('narrator-panel')?.classList.add('hidden');
    document.getElementById('bottom-dock')?.classList.add('hidden');
    document.getElementById('crosshair')?.classList.add('hidden');

    const screenTitle = document.getElementById('screen-title-2s');
    const screenIntro = document.getElementById('screen-intro-video');
    const screenStory = document.getElementById('screen-opening-story');
    const screenStart = document.getElementById('screen-start-game');

    // Reset video states
    const videoIntro = document.getElementById('video-intro');
    if (videoIntro) {
      videoIntro.pause();
      videoIntro.currentTime = 0;
    }
    const videoOutro = document.getElementById('video-outro');
    if (videoOutro) {
      videoOutro.pause();
      videoOutro.currentTime = 0;
    }
    document.getElementById('screen-outro-video')?.classList.add('hidden');

    // 1. SCREEN 1: Centered title "WAY OUT" for 2 seconds
    screenTitle?.classList.remove('hidden');
    screenIntro?.classList.add('hidden');
    screenStory?.classList.add('hidden');
    screenStart?.classList.add('hidden');

    setTimeout(() => {
      // 2. Automatically transition to INTRO VIDEO
      screenTitle?.classList.add('hidden');
      this.playIntroVideo();
    }, 2000);
  }

  playIntroVideo() {
    const screenIntro = document.getElementById('screen-intro-video');
    const videoIntro = document.getElementById('video-intro');
    const screenStory = document.getElementById('screen-opening-story');

    if (!videoIntro) {
      screenStory?.classList.remove('hidden');
      return;
    }

    screenIntro?.classList.remove('hidden');
    videoIntro.currentTime = 0;

    let finished = false;
    const onEnded = () => {
      if (finished) return;
      finished = true;
      videoIntro.removeEventListener('ended', onEnded);
      videoIntro.pause();
      screenIntro?.classList.add('hidden');
      // 3. BEGINNING STORY POPUP APPEARS
      screenStory?.classList.remove('hidden');
    };

    videoIntro.addEventListener('ended', onEnded, { once: true });

    // Handle touch/click anywhere on video screen to unmute if auto-muted
    const handleTap = () => {
      if (videoIntro.paused) {
        videoIntro.play().catch(() => {});
      } else if (videoIntro.muted) {
        videoIntro.muted = false;
      }
    };
    if (screenIntro) screenIntro.onclick = handleTap;

    // Start playing video automatically without requiring user to press a button
    const playPromise = videoIntro.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.warn('Intro video unmuted autoplay restricted by browser, playing muted:', err);
        videoIntro.muted = true;
        videoIntro.play().catch(e => {
          console.error('Intro video play failed:', e);
        });
      });
    }
  }

  playOutroVideo() {
    this.timer.stop();
    this.gameState.controlState.playerCanMove = false;
    this.gameState.controlState.canInteract = false;
    this.gameState.controlState.running = false;

    // Hide all in-game HUD & popups
    document.getElementById('hud-top')?.classList.add('hidden');
    document.getElementById('narrator-panel')?.classList.add('hidden');
    document.getElementById('bottom-dock')?.classList.add('hidden');
    document.getElementById('interact-prompt')?.classList.add('hidden');
    document.getElementById('pickup-toast')?.classList.add('hidden');
    document.getElementById('modal-door-console')?.classList.add('hidden');
    document.getElementById('crosshair')?.classList.add('hidden');

    const screenOutro = document.getElementById('screen-outro-video');
    const videoOutro = document.getElementById('video-outro');
    const modalEnding = document.getElementById('modal-ending');

    if (!videoOutro) {
      modalEnding?.classList.remove('hidden');
      return;
    }

    screenOutro?.classList.remove('hidden');
    videoOutro.currentTime = 0;

    let finished = false;
    const onEnded = () => {
      if (finished) return;
      finished = true;
      videoOutro.removeEventListener('ended', onEnded);
      videoOutro.pause();
      screenOutro?.classList.add('hidden');
      // When outro video finishes, show Outro Story Popup
      modalEnding?.classList.remove('hidden');
    };

    videoOutro.addEventListener('ended', onEnded, { once: true });

    const handleTap = () => {
      if (videoOutro.paused) {
        videoOutro.play().catch(() => {});
      } else if (videoOutro.muted) {
        videoOutro.muted = false;
      }
    };
    if (screenOutro) screenOutro.onclick = handleTap;

    const playPromise = videoOutro.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.warn('Outro video unmuted autoplay restricted, playing muted:', err);
        videoOutro.muted = true;
        videoOutro.play().catch(e => {
          console.error('Outro video play failed:', e);
        });
      });
    }
  }

  bindUI() {
    // Timer digits HUD updater
    this.gameState.on('stateChange', (state) => {
      const timerEl = document.getElementById('timer-display');
      if (timerEl) {
        timerEl.textContent = this.timer.format(state.controlState.timeRemaining);
      }
    });

    // Opening Story -> NEXT button -> leads to START GAME Screen
    document.getElementById('btn-story-next')?.addEventListener('click', () => {
      this.audio.play('click');
      document.getElementById('screen-opening-story')?.classList.add('hidden');
      document.getElementById('screen-start-game')?.classList.remove('hidden');
    });

    // START GAME button -> Starts Gameplay, 5:00 Timer, Movement, Narrator
    document.getElementById('btn-start-game')?.addEventListener('click', () => {
      this.audio.play('click');
      document.getElementById('screen-start-game')?.classList.add('hidden');
      this.beginActiveGameplay();
    });

    // Door Modal: PIN submit (Section 1)
    document.getElementById('btn-door-pin-submit')?.addEventListener('click', () => {
      const pin = document.getElementById('door-pin-input')?.value || '';
      this.interaction.submitDoorPin(pin);
    });

    // Door Modal: Access Card submit (Section 2)
    document.getElementById('btn-door-card-submit')?.addEventListener('click', () => {
      this.interaction.submitDoorCard();
    });

    // Door Modal: Close button
    document.getElementById('btn-close-door')?.addEventListener('click', () => {
      this.audio.play('click');
      this.interaction.closeExamination();
    });

    // Phone Examination Modal: Close button
    document.getElementById('btn-close-phone')?.addEventListener('click', () => {
      this.audio.play('click');
      this.interaction.closeExamination();
    });

    // Item Inspection Modal: Close button
    document.getElementById('btn-close-item-inspect')?.addEventListener('click', () => {
      this.audio.play('click');
      this.interaction.closeExamination();
    });

    // Narrator History Modal: Close button
    document.getElementById('btn-close-narrator-history')?.addEventListener('click', () => {
      this.audio.play('click');
      this.interaction.closeExamination();
    });

    // Ending Story -> NEXT button -> leads to Final Message Screen
    document.getElementById('btn-ending-next')?.addEventListener('click', () => {
      this.audio.play('click');
      document.getElementById('modal-ending')?.classList.add('hidden');
      document.getElementById('modal-final-message')?.classList.remove('hidden');
    });

    // Final Message Screen: PLAY AGAIN
    document.getElementById('btn-play-again-final')?.addEventListener('click', () => {
      this.audio.play('click');
      document.getElementById('exit-fallback-msg')?.classList.add('hidden');
      document.getElementById('modal-final-message')?.classList.add('hidden');
      this.resetToStartup();
    });

    // Final Message Screen: EXIT (Browser-Safe Close with Graceful Fallback)
    document.getElementById('btn-exit-final')?.addEventListener('click', () => {
      this.audio.play('click');
      try {
        window.close();
      } catch (err) {
        console.warn('window.close() prevented by browser security policy:', err);
      }
      // If browser blocks window.close(), display clean non-intrusive fallback message
      const fallbackEl = document.getElementById('exit-fallback-msg');
      if (fallbackEl) {
        fallbackEl.classList.remove('hidden');
      }
    });

    // Game Over: PLAY AGAIN
    document.getElementById('btn-restart-game-over')?.addEventListener('click', () => {
      this.audio.play('click');
      document.getElementById('modal-game-over')?.classList.add('hidden');
      document.getElementById('death-fade-overlay')?.classList.remove('fading-out');
      document.getElementById('death-fade-overlay')?.classList.add('hidden');
      this.resetToStartup();
    });

    // Event listener for dynamic phone reveal upon Access Card #1 collection
    this.gameState.on('accessCard1Found', () => {
      this.room.revealPhone();
    });
  }

  beginActiveGameplay() {
    this.gameState.controlState.gameStarted = true;
    this.gameState.controlState.running = true;
    this.gameState.controlState.playerCanMove = true;
    this.gameState.controlState.canInteract = true;
    this.gameState.controlState.timerExpired = false;
    this.gameState.controlState.timeRemaining = 300;

    // Verify all critical room objects exist and are ready
    try {
      this.room.validateRoomObjects();
    } catch (e) {
      console.error('Room object validation error:', e);
    }

    // Show HUD, always-visible Narrator Chatbox, Bottom Controls, and Crosshair
    document.getElementById('hud-top')?.classList.remove('hidden');
    document.getElementById('narrator-panel')?.classList.remove('hidden');
    document.getElementById('bottom-dock')?.classList.remove('hidden');
    document.getElementById('crosshair')?.classList.remove('hidden');

    this.timer.start();
    this.narrator.triggerProgressionHint('start');
  }

  resetToStartup() {
    this.timer.stop();
    this.timer.reset();
    this.gameState.reset();
    this.cameraController.resetPosition();

    // Reset video elements
    const videoIntro = document.getElementById('video-intro');
    if (videoIntro) {
      videoIntro.pause();
      videoIntro.currentTime = 0;
    }
    const videoOutro = document.getElementById('video-outro');
    if (videoOutro) {
      videoOutro.pause();
      videoOutro.currentTime = 0;
    }

    // Reset 3D mesh states
    if (this.room.meshes.drawer1) this.room.meshes.drawer1.position.x = -0.58;
    if (this.room.meshes.drawer2) this.room.meshes.drawer2.position.x = -0.58;
    if (this.room.meshes.crowbar) this.room.meshes.crowbar.visible = false;
    if (this.room.meshes.phone) this.room.meshes.phone.visible = false;
    if (this.room.meshes.doorPivot) this.room.meshes.doorPivot.rotation.y = 0;
    if (this.room.meshes.doorLed1) this.room.meshes.doorLed1.material.color.setHex(0xef4444);
    if (this.room.meshes.doorLed2) this.room.meshes.doorLed2.material.color.setHex(0xef4444);

    // Reset both cabinets
    if (this.room.meshes.cabinetDoorLeft) this.room.meshes.cabinetDoorLeft.rotation.y = 0;
    if (this.room.meshes.cabinetDoorRight) this.room.meshes.cabinetDoorRight.rotation.y = 0;
    if (this.room.meshes.padlock) this.room.meshes.padlock.visible = true;
    if (this.room.meshes.brownDoorLeft) this.room.meshes.brownDoorLeft.rotation.y = 0;
    if (this.room.meshes.brownDoorRight) this.room.meshes.brownDoorRight.rotation.y = 0;
    if (this.room.meshes.accessCard2) this.room.meshes.accessCard2.visible = false;

    // Reset all 3 small boxes
    ['box1', 'box2', 'box3'].forEach(k => {
      const b = this.room.meshes[k];
      if (b && b.children[1]) {
        b.children[1].rotation.x = 0;
        b.children[1].position.z = 0;
      }
    });
    if (this.room.meshes.accessCard1) this.room.meshes.accessCard1.visible = false;

    // Re-position cards inside newly randomized box and cabinet
    this.room.setupRandomizedCardLocations();

    if (this.room.meshes.gift1) this.room.meshes.gift1.visible = true;
    if (this.room.meshes.gift2) this.room.meshes.gift2.visible = true;

    // Reset modals and toasts
    document.getElementById('exit-fallback-msg')?.classList.add('hidden');
    document.getElementById('modal-narrator-history')?.classList.add('hidden');
    document.getElementById('modal-item-inspect')?.classList.add('hidden');
    document.getElementById('modal-examine-phone')?.classList.add('hidden');
    document.getElementById('modal-door-console')?.classList.add('hidden');
    document.getElementById('modal-ending')?.classList.add('hidden');
    document.getElementById('modal-final-message')?.classList.add('hidden');
    document.getElementById('modal-game-over')?.classList.add('hidden');
    document.getElementById('screen-intro-video')?.classList.add('hidden');
    document.getElementById('screen-outro-video')?.classList.add('hidden');
    document.getElementById('death-fade-overlay')?.classList.remove('fading-out');
    document.getElementById('death-fade-overlay')?.classList.add('hidden');
    document.getElementById('crosshair')?.classList.add('hidden');
    document.getElementById('pickup-toast')?.classList.add('hidden');
    document.getElementById('pickup-toast')?.classList.remove('show');

    // Restart the complete startup sequence (Title -> Intro Video -> Story -> Start)
    this.startStartupSequence();
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const s = this.gameState.getState();

    // Freeze camera and raycasting if playerCanMove is false or modal is open
    if (s.controlState.playerCanMove && !s.inspectingObject) {
      this.cameraController.update(delta);
      this.interaction.update();
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.wayOutGame = new Game();
});
