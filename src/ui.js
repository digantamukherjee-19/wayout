/**
 * WAY OUT - User Interface & Scene Renderer
 * Manages responsive SVGs, close-up inspection screens, dials, modals, and HUD updates.
 */

import { ROOM_OBJECTS } from './data/objects.js';
import { ITEMS_DATA } from './data/items.js';

export class UIRenderer {
  constructor(gameState, audio, narrator, interactionSystem, sceneManager, puzzleSystem, timerManager) {
    this.gameState = gameState;
    this.audio = audio;
    this.narrator = narrator;
    this.interaction = interactionSystem;
    this.scene = sceneManager;
    this.puzzle = puzzleSystem;
    this.timer = timerManager;

    // DOM references
    this.dom = {
      app: document.getElementById('app'),
      viewport: document.getElementById('room-viewport'),
      inspectionOverlay: document.getElementById('inspection-overlay'),
      inspectionContent: document.getElementById('inspection-content'),
      inspectionTitle: document.getElementById('inspection-title'),
      inspectionCloseBtn: document.getElementById('btn-close-inspect'),
      timerDisplay: document.getElementById('timer-display'),
      escapeCounter: document.getElementById('escape-counter'),
      btnHint: document.getElementById('btn-hint'),
      btnSettings: document.getElementById('btn-settings'),
      btnSoundToggle: document.getElementById('btn-sound-toggle'),
      btnDebug: document.getElementById('btn-debug'),

      // Modals
      openingModal: document.getElementById('modal-opening'),
      btnStartGame: document.getElementById('btn-start-game'),
      hintModal: document.getElementById('modal-hint'),
      hintLevelText: document.getElementById('hint-text'),
      hintTargetLabel: document.getElementById('hint-target'),
      btnNextHintLevel: document.getElementById('btn-next-hint-level'),
      btnCloseHint: document.getElementById('btn-close-hint'),

      settingsModal: document.getElementById('modal-settings'),
      btnCloseSettings: document.getElementById('btn-close-settings'),
      toggleSound: document.getElementById('toggle-sound'),
      toggleMusic: document.getElementById('toggle-music'),
      selectTextSize: document.getElementById('select-text-size'),

      gameOverModal: document.getElementById('modal-game-over'),
      btnRestartGameOver: document.getElementById('btn-restart-game-over'),
      btnExitGameOver: document.getElementById('btn-exit-game-over'),

      endingModal: document.getElementById('modal-ending'),
      finalPopupModal: document.getElementById('modal-final-popup'),
      btnPlayAgain: document.getElementById('btn-play-again'),
      btnExitFinal: document.getElementById('btn-exit-final'),

      debugModal: document.getElementById('modal-debug'),
      btnCloseDebug: document.getElementById('btn-close-debug'),

      floatingNotification: document.getElementById('floating-notification'),
      portraitWarning: document.getElementById('portrait-warning'),
    };

    this.init();
  }

  init() {
    this.bindEvents();
    this.renderRoomSVGBase();
  }

  bindEvents() {
    // HUD buttons
    this.dom.btnHint?.addEventListener('click', () => this.showHintModal());
    this.dom.btnCloseHint?.addEventListener('click', () => this.dom.hintModal.classList.add('hidden'));

    this.dom.btnSettings?.addEventListener('click', () => this.showSettingsModal());
    this.dom.btnCloseSettings?.addEventListener('click', () => this.dom.settingsModal.classList.add('hidden'));

    this.dom.btnSoundToggle?.addEventListener('click', () => {
      const current = this.gameState.get().settings.sound;
      const next = !current;
      this.gameState.set({ settings: { ...this.gameState.get().settings, sound: next, music: next } });
      this.audio.setSoundEnabled(next);
      this.audio.setMusicEnabled(next);
      this.updateAudioIcons();
    });

    this.dom.inspectionCloseBtn?.addEventListener('click', () => this.scene.goToRoom());

    // Debug button
    this.dom.btnDebug?.addEventListener('click', () => this.showDebugModal());
    this.dom.btnCloseDebug?.addEventListener('click', () => this.dom.debugModal.classList.add('hidden'));

    // Game state listeners
    this.gameState.on('stateChange', ({ current }) => {
      this.updateHUD(current);
    });

    this.gameState.on('sceneChange', ({ scene, target }) => {
      if (scene === 'room') {
        this.hideInspection();
      } else {
        this.showInspection(target);
      }
    });

    this.gameState.on('timeExtension', ({ added }) => {
      this.showFloatingText(`+${added} SECONDS`);
    });

    this.gameState.on('gameOver', () => {
      this.dom.gameOverModal.classList.remove('hidden');
    });

    this.gameState.on('allEscapeItemsUsed', () => {
      this.triggerEscapeSequence();
    });
  }

  updateHUD(state) {
    if (this.dom.timerDisplay) {
      this.dom.timerDisplay.textContent = this.timer.formatTime(state.timeRemaining);
      if (state.timeRemaining <= 30) {
        this.dom.timerDisplay.classList.add('urgent');
      } else {
        this.dom.timerDisplay.classList.remove('urgent');
      }
    }

    if (this.dom.escapeCounter) {
      const count = Object.values(state.escapeItemsUsed).filter(Boolean).length;
      this.dom.escapeCounter.textContent = `${count}/5`;
    }
  }

  updateAudioIcons() {
    const isMuted = !this.gameState.get().settings.sound;
    if (this.dom.btnSoundToggle) {
      this.dom.btnSoundToggle.innerHTML = isMuted
        ? `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`
        : `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
    }
  }

  showFloatingText(text) {
    const el = this.dom.floatingNotification;
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden', 'anim-float');
    void el.offsetWidth; // trigger reflow
    el.classList.add('anim-float');
    setTimeout(() => {
      el.classList.add('hidden');
    }, 2500);
  }

  // === ROOM SVG SCENE ===
  renderRoomSVGBase() {
    if (!this.dom.viewport) return;

    this.dom.viewport.innerHTML = `
      <svg class="room-svg" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="lampGlow" cx="50%" cy="10%" r="70%">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="0.25"/>
            <stop offset="45%" stop-color="#fef08a" stop-opacity="0.08"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0.85"/>
          </radialGradient>
          <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#16222f"/>
            <stop offset="65%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#090d16"/>
          </linearGradient>
          <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#1f2937"/>
            <stop offset="100%" stop-color="#111827"/>
          </linearGradient>
          <filter id="shadowFilter" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="2" dy="5" stdDeviation="4" flood-color="#000" flood-opacity="0.6"/>
          </filter>
        </defs>

        <!-- Back Wall -->
        <rect x="0" y="0" width="1000" height="420" fill="url(#wallGrad)"/>

        <!-- Perspective Wall Lines & Baseboard -->
        <line x1="0" y1="420" x2="1000" y2="420" stroke="#334155" stroke-width="4"/>
        <rect x="0" y="416" width="1000" height="8" fill="#1e293b"/>

        <!-- Floor with Wooden Perspective Planks -->
        <rect x="0" y="420" width="1000" height="180" fill="url(#floorGrad)"/>
        <g stroke="#0f172a" stroke-width="1.5" opacity="0.65">
          <line x1="120" y1="420" x2="0" y2="600"/>
          <line x1="280" y1="420" x2="160" y2="600"/>
          <line x1="440" y1="420" x2="380" y2="600"/>
          <line x1="600" y1="420" x2="620" y2="600"/>
          <line x1="760" y1="420" x2="840" y2="600"/>
          <line x1="900" y1="420" x2="1000" y2="580"/>
        </g>

        <!-- High Barred Window -->
        <g id="hotspot-window" class="room-hotspot" data-object-id="window" cursor="pointer">
          <rect x="380" y="24" width="240" height="72" rx="4" fill="#0c1322" stroke="#334155" stroke-width="4"/>
          <!-- Window panes and glowing rain -->
          <rect x="386" y="30" width="112" height="60" fill="#1e293b" opacity="0.4"/>
          <rect x="502" y="30" width="112" height="60" fill="#1e293b" opacity="0.4"/>
          <!-- Bars -->
          <line x1="420" y1="24" x2="420" y2="96" stroke="#475569" stroke-width="4"/>
          <line x1="460" y1="24" x2="460" y2="96" stroke="#475569" stroke-width="4"/>
          <line x1="540" y1="24" x2="540" y2="96" stroke="#475569" stroke-width="4"/>
          <line x1="580" y1="24" x2="580" y2="96" stroke="#475569" stroke-width="4"/>
          <!-- Window Title Label -->
          <text x="500" y="65" fill="#64748b" font-size="11" text-anchor="middle" font-family="sans-serif">BARRED WINDOW</text>
        </g>

        <!-- Hanging Doctor's Coat -->
        <g id="hotspot-coat_rack" class="room-hotspot" data-object-id="coat_rack" cursor="pointer">
          <!-- Peg -->
          <circle cx="210" cy="180" r="6" fill="#78350f"/>
          <!-- Lab coat silhouette -->
          <path d="M195 186 C180 200, 175 290, 170 360 L245 360 C240 290, 235 200, 220 186 Z" fill="#e2e8f0" filter="url(#shadowFilter)"/>
          <path d="M195 186 L205 240 L210 240 L220 186" fill="#cbd5e1"/>
          <!-- Breast Pocket -->
          <rect x="182" y="240" width="18" height="22" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1.5" rx="1"/>
          <text x="207" y="380" fill="#94a3b8" font-size="11" text-anchor="middle">DOCTOR'S COAT</text>
        </g>

        <!-- Medicine Cabinet -->
        <g id="hotspot-medicine_cabinet" class="room-hotspot" data-object-id="medicine_cabinet" cursor="pointer">
          <rect x="40" y="140" width="110" height="150" fill="#f8fafc" stroke="#94a3b8" stroke-width="3" rx="4" filter="url(#shadowFilter)"/>
          <rect x="48" y="148" width="94" height="134" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1"/>
          <!-- Red Cross -->
          <rect x="88" y="195" width="14" height="40" fill="#ef4444"/>
          <rect x="75" y="208" width="40" height="14" fill="#ef4444"/>
          <!-- Handle & Lock -->
          <circle cx="132" cy="215" r="4" fill="#64748b"/>
          <text x="95" y="310" fill="#94a3b8" font-size="11" text-anchor="middle">MEDICINE CABINET</text>
        </g>

        <!-- Wall Clock -->
        <g id="hotspot-wall_clock" class="room-hotspot" data-object-id="wall_clock" cursor="pointer">
          <circle cx="310" cy="150" r="50" fill="#334155" stroke="#f59e0b" stroke-width="5" filter="url(#shadowFilter)"/>
          <circle cx="310" cy="150" r="42" fill="#fef3c7"/>
          <!-- Ticks -->
          <circle cx="310" cy="114" r="3" fill="#1e293b"/>
          <circle cx="346" cy="150" r="3" fill="#1e293b"/>
          <circle cx="310" cy="186" r="3" fill="#1e293b"/>
          <circle cx="274" cy="150" r="3" fill="#1e293b"/>
          <!-- Hands -->
          <line x1="310" y1="150" x2="310" y2="124" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
          <line x1="310" y1="150" x2="332" y2="150" stroke="#1e293b" stroke-width="2" stroke-linecap="round"/>
          <circle cx="310" cy="150" r="4" fill="#b45309"/>
          <text x="310" y="220" fill="#94a3b8" font-size="11" text-anchor="middle">WALL CLOCK</text>
        </g>

        <!-- Heavy Steel Exit Door -->
        <g id="hotspot-door" class="room-hotspot" data-object-id="door" cursor="pointer">
          <!-- Door Frame -->
          <rect x="420" y="100" width="160" height="320" fill="#1e293b" stroke="#475569" stroke-width="6" rx="4" filter="url(#shadowFilter)"/>
          <rect x="432" y="112" width="136" height="296" fill="#334155"/>
          <!-- Reinforced Steel Plates -->
          <rect x="444" y="125" width="112" height="70" fill="#1e293b" stroke="#475569" stroke-width="2" rx="2"/>
          <rect x="444" y="210" width="112" height="85" fill="#1e293b" stroke="#475569" stroke-width="2" rx="2"/>
          <rect x="444" y="310" width="112" height="85" fill="#1e293b" stroke="#475569" stroke-width="2" rx="2"/>
          <!-- 5 Status Lights Bar -->
          <g id="door-status-leds">
            <circle id="room-led-1" cx="455" cy="140" r="4" fill="#ef4444"/>
            <circle id="room-led-2" cx="475" cy="140" r="4" fill="#ef4444"/>
            <circle id="room-led-3" cx="500" cy="140" r="4" fill="#ef4444"/>
            <circle id="room-led-4" cx="525" cy="140" r="4" fill="#ef4444"/>
            <circle id="room-led-5" cx="545" cy="140" r="4" fill="#ef4444"/>
          </g>
          <!-- Pressure Locking Wheel representation -->
          <circle cx="500" cy="252" r="24" fill="#475569" stroke="#94a3b8" stroke-width="3"/>
          <circle cx="500" cy="252" r="8" fill="#1e293b"/>
          <!-- Push Bar Handle -->
          <rect x="445" y="340" width="110" height="12" fill="#ef4444" stroke="#991b1b" stroke-width="2" rx="3"/>
          <text x="500" y="440" fill="#f87171" font-size="13" font-weight="bold" text-anchor="middle">EXIT DOOR (5 LOCKS)</text>
        </g>

        <!-- Oil Painting -->
        <g id="hotspot-painting" class="room-hotspot" data-object-id="painting" cursor="pointer">
          <rect x="650" y="110" width="120" height="150" fill="#451a03" stroke="#f59e0b" stroke-width="5" rx="3" filter="url(#shadowFilter)"/>
          <!-- Canvas: Dark Crossroads -->
          <rect x="660" y="120" width="100" height="130" fill="#0f172a"/>
          <!-- Misty road intersection in painting -->
          <path d="M660 250 L710 180 L760 250 Z" fill="#334155"/>
          <line x1="710" y1="180" x2="710" y2="250" stroke="#facc15" stroke-dasharray="3 3"/>
          <!-- Distant headlights / truck glow -->
          <circle cx="704" cy="180" r="3" fill="#fef08a"/>
          <circle cx="716" cy="180" r="3" fill="#fef08a"/>
          <text x="710" y="278" fill="#94a3b8" font-size="11" text-anchor="middle">PAINTING</text>
        </g>

        <!-- Bookshelf -->
        <g id="hotspot-bookshelf" class="room-hotspot" data-object-id="bookshelf" cursor="pointer">
          <!-- Shelf Frame -->
          <rect x="830" y="130" width="140" height="280" fill="#291b12" stroke="#451a03" stroke-width="5" filter="url(#shadowFilter)"/>
          <line x1="830" y1="210" x2="970" y2="210" stroke="#451a03" stroke-width="4"/>
          <line x1="830" y1="290" x2="970" y2="290" stroke="#451a03" stroke-width="4"/>
          <line x1="830" y1="370" x2="970" y2="370" stroke="#451a03" stroke-width="4"/>
          <!-- Books on shelves -->
          <!-- Top shelf books -->
          <rect x="840" y="150" width="14" height="58" fill="#991b1b"/>
          <rect x="856" y="145" width="16" height="63" fill="#1e3a8a"/>
          <rect x="874" y="152" width="14" height="56" fill="#065f46"/>
          <rect x="890" y="148" width="18" height="60" fill="#854d0e"/>
          <!-- Middle shelf prominent books -->
          <g id="room-shelf-middle-books">
            <rect x="842" y="225" width="22" height="63" fill="#dc2626" stroke="#991b1b"/>
            <rect x="868" y="222" width="22" height="66" fill="#2563eb" stroke="#1d4ed8"/>
            <rect x="894" y="227" width="22" height="61" fill="#16a34a" stroke="#15803d"/>
            <rect x="920" y="224" width="22" height="64" fill="#eab308" stroke="#ca8a04"/>
          </g>
          <text x="900" y="426" fill="#94a3b8" font-size="11" text-anchor="middle">BOOKSHELF</text>
        </g>

        <!-- Hospital Bed -->
        <g id="hotspot-bed" class="room-hotspot" data-object-id="bed" cursor="pointer">
          <!-- Iron Headboard -->
          <rect x="25" y="320" width="8" height="150" fill="#475569"/>
          <line x1="33" y1="340" x2="33" y2="440" stroke="#64748b" stroke-width="4"/>
          <!-- Mattress & Blanket -->
          <polygon points="33,380 260,395 240,490 25,470" fill="#cbd5e1" filter="url(#shadowFilter)"/>
          <polygon points="100,400 260,395 240,490 85,480" fill="#3b82f6" opacity="0.8"/>
          <!-- Pillow -->
          <polygon points="40,385 95,388 90,430 35,425" fill="#f8fafc" stroke="#e2e8f0"/>
          <!-- Bed Legs -->
          <line x1="30" y1="465" x2="30" y2="520" stroke="#475569" stroke-width="6"/>
          <line x1="240" y1="485" x2="240" y2="540" stroke="#475569" stroke-width="6"/>
          <text x="140" y="525" fill="#94a3b8" font-size="11" text-anchor="middle">HOSPITAL BED</text>
        </g>

        <!-- Doctor's Desk & Drawers -->
        <g id="hotspot-desk" class="room-hotspot" data-object-id="desk" cursor="pointer">
          <!-- Desk Top -->
          <polygon points="660,380 940,380 960,450 640,450" fill="#451a03" stroke="#291b12" stroke-width="3" filter="url(#shadowFilter)"/>
          <!-- Desk Body & Left/Right pedestal -->
          <rect x="655" y="445" width="290" height="95" fill="#291b12"/>
          <!-- Left Drawer Pedestal -->
          <rect x="665" y="455" width="110" height="75" fill="#451a03" stroke="#78350f" stroke-width="2"/>
          <circle cx="720" cy="492" r="4" fill="#fbbf24"/>
          <!-- Right Drawer Pedestal -->
          <rect x="825" y="455" width="110" height="75" fill="#451a03" stroke="#78350f" stroke-width="2"/>
          <circle cx="880" cy="492" r="4" fill="#fbbf24"/>
          <!-- Journal on desk -->
          <polygon points="720,395 800,395 810,435 730,435" fill="#f8fafc" stroke="#cbd5e1"/>
          <line x1="765" y1="395" x2="775" y2="435" stroke="#94a3b8" stroke-width="2"/>
          <!-- Desk Lamp -->
          <path d="M850 430 L870 375 L890 380" fill="none" stroke="#64748b" stroke-width="4"/>
          <ellipse cx="895" cy="385" rx="14" ry="9" fill="#1e293b" stroke="#f59e0b" stroke-width="2"/>
          <text x="800" y="565" fill="#94a3b8" font-size="11" text-anchor="middle">EXAMINATION DESK</text>
        </g>

        <!-- Loose Floorboard in Foreground -->
        <g id="hotspot-loose_floorboard" class="room-hotspot" data-object-id="loose_floorboard" cursor="pointer">
          <polygon points="340,510 520,510 500,545 320,545" fill="#374151" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="4 2"/>
          <line x1="330" y1="527" x2="510" y2="527" stroke="#111827" stroke-width="2"/>
          <!-- Metallic glint in the crack -->
          <circle cx="430" cy="528" r="3" fill="#38bdf8"/>
          <text x="420" y="565" fill="#fbbf24" font-size="11" font-weight="bold" text-anchor="middle">LOOSE FLOORBOARD</text>
        </g>

        <!-- Atmospheric Ceiling Lamp & Ambient Lighting Overlay -->
        <line x1="500" y1="0" x2="500" y2="60" stroke="#475569" stroke-width="3"/>
        <ellipse cx="500" cy="64" rx="20" ry="8" fill="#1e293b"/>
        <circle cx="500" cy="68" r="5" fill="#fef08a"/>
        <rect x="0" y="0" width="1000" height="600" fill="url(#lampGlow)" pointer-events="none"/>
      </svg>
    `;

    // Attach click/touch listeners to hotspots
    const hotspots = this.dom.viewport.querySelectorAll('.room-hotspot');
    hotspots.forEach(hotspot => {
      const objId = hotspot.dataset.objectId;
      hotspot.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.interaction.handleRoomObjectTap(objId);
      });
    });
  }

  // === CLOSE-UP INSPECTION SYSTEM ===
  showInspection(objectId) {
    if (!this.dom.inspectionOverlay || !this.dom.inspectionContent) return;

    const objDef = ROOM_OBJECTS[objectId];
    if (this.dom.inspectionTitle) {
      this.dom.inspectionTitle.textContent = objDef ? objDef.name : 'Inspection';
    }

    this.dom.inspectionContent.innerHTML = '';
    this.dom.inspectionOverlay.classList.remove('hidden');

    switch (objectId) {
      case 'door':
        this.renderInspectDoor();
        break;
      case 'desk':
        this.renderInspectDesk();
        break;
      case 'wall_clock':
        this.renderInspectClock();
        break;
      case 'painting':
        this.renderInspectPainting();
        break;
      case 'bookshelf':
        this.renderInspectBookshelf();
        break;
      case 'medicine_cabinet':
        this.renderInspectCabinet();
        break;
      case 'loose_floorboard':
        this.renderInspectFloorboard();
        break;
      case 'coat_rack':
        this.renderInspectCoat();
        break;
      case 'bed':
        this.renderInspectBed();
        break;
      case 'window':
        this.renderInspectWindow();
        break;
      default:
        this.dom.inspectionContent.innerHTML = `<p class="inspect-desc">${objDef ? objDef.description : ''}</p>`;
    }
  }

  hideInspection() {
    if (this.dom.inspectionOverlay) {
      this.dom.inspectionOverlay.classList.add('hidden');
    }
  }

  // --- 1. INSPECT DOOR ---
  renderInspectDoor() {
    const state = this.gameState.get();
    const config = state.config;
    const used = state.escapeItemsUsed;

    const usedCount = Object.values(used).filter(Boolean).length;
    const canEscape = usedCount === 5;

    this.dom.inspectionContent.innerHTML = `
      <div class="inspect-door-panel">
        <div class="door-status-banner ${canEscape ? 'ready' : ''}">
          <span class="status-title">SECURITY INTERLOCKS: ${usedCount}/5 DISENGAGED</span>
          <span class="status-sub">${canEscape ? 'ALL LOCKS CLEARED — PUSH MASTER RELEASE BAR TO ESCAPE!' : 'Requires 5 distinct components to release the door.'}</span>
        </div>

        <div class="door-modules-grid">
          <!-- Module 1: Deadbolt Keyhole -->
          <div class="door-module ${used.item_key ? 'disengaged' : ''}" id="module-deadbolt">
            <div class="module-header">
              <span class="led ${used.item_key ? 'green' : 'red'}"></span>
              <h4>1. MECHANICAL DEADBOLT</h4>
            </div>
            <p class="module-desc">Heavy hardened steel cylinder lock.</p>
            <button class="action-btn" id="btn-use-key">
              ${used.item_key ? '✓ UNLOCKED' : (state.selectedItem === 'item_key' ? 'INSERT ANTIQUE KEY' : 'NEEDS BRASS KEY')}
            </button>
          </div>

          <!-- Module 2: Electronic Keypad -->
          <div class="door-module ${used.item_code ? 'disengaged' : ''}" id="module-keypad">
            <div class="module-header">
              <span class="led ${used.item_code ? 'green' : 'red'}"></span>
              <h4>2. CIPHER KEYPAD</h4>
            </div>
            <div class="keypad-display" id="keypad-screen">
              ${used.item_code ? 'ACCESS GRANTED' : (this.puzzle.keypadInput ? this.puzzle.keypadInput.padEnd(4, '-') : 'ENTER 4 DIGITS')}
            </div>
            ${!used.item_code ? `
              <div class="keypad-grid">
                ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="keypad-btn" data-digit="${n}">${n}</button>`).join('')}
                <button class="keypad-btn action" id="btn-keypad-clear">CLR</button>
                <button class="keypad-btn" data-digit="0">0</button>
                <button class="keypad-btn action" id="btn-keypad-enter">ENT</button>
              </div>
            ` : '<div class="module-done">OVERRIDE ACCEPTED</div>'}
          </div>

          <!-- Module 3: Keycard Swipe -->
          <div class="door-module ${used.item_card ? 'disengaged' : ''}" id="module-card">
            <div class="module-header">
              <span class="led ${used.item_card ? 'green' : 'red'}"></span>
              <h4>3. MAGNETIC CARD READER</h4>
            </div>
            <p class="module-desc">Auxiliary electromagnetic latch sensor.</p>
            <button class="action-btn" id="btn-use-card">
              ${used.item_card ? '✓ CARD SWIPED' : (state.selectedItem === 'item_card' ? 'SWIPE MASTER KEYCARD' : 'NEEDS ACCESS CARD')}
            </button>
          </div>

          <!-- Module 4: Wheel Crank -->
          <div class="door-module ${used.item_crank ? 'disengaged' : ''}" id="module-crank">
            <div class="module-header">
              <span class="led ${used.item_crank ? 'green' : 'red'}"></span>
              <h4>4. PRESSURE VALVE WHEEL</h4>
            </div>
            <p class="module-desc">Multi-point steel deadbolt retractor hub.</p>
            <button class="action-btn" id="btn-use-crank">
              ${used.item_crank ? '✓ BARS RETRACTED' : (state.selectedItem === 'item_crank' ? 'MOUNT & TURN CRANK' : 'NEEDS VALVE CRANK')}
            </button>
          </div>

          <!-- Module 5: Relay Fuse -->
          <div class="door-module ${used.item_fuse ? 'disengaged' : ''}" id="module-fuse">
            <div class="module-header">
              <span class="led ${used.item_fuse ? 'green' : 'red'}"></span>
              <h4>5. POWER JUNCTION FUSE</h4>
            </div>
            <p class="module-desc">Hydraulic actuator power relay terminal.</p>
            <button class="action-btn" id="btn-use-fuse">
              ${used.item_fuse ? '✓ POWER ACTIVE' : (state.selectedItem === 'item_fuse' ? 'INSERT RELAY FUSE' : 'NEEDS RELAY FUSE')}
            </button>
          </div>
        </div>

        <!-- Master Release Bar -->
        <div class="master-release-container">
          <button class="master-release-btn ${canEscape ? 'active pulsate' : 'disabled'}" id="btn-master-escape">
            ${canEscape ? '⚡ PUSH MASTER RELEASE BAR (ESCAPE) ⚡' : '🔒 MASTER RELEASE BAR (LOCKED)'}
          </button>
        </div>
      </div>
    `;

    // Bind Module Interactions
    document.getElementById('btn-use-key')?.addEventListener('click', () => {
      if (used.item_key) return;
      if (state.selectedItem === 'item_key') {
        this.interaction.applyItemToObject('item_key', 'door_lock_deadbolt');
        this.renderInspectDoor();
      } else {
        this.narrator.speak('The deadbolt requires the Antique Brass Key. Select it from your inventory.');
      }
    });

    document.getElementById('btn-use-card')?.addEventListener('click', () => {
      if (used.item_card) return;
      if (state.selectedItem === 'item_card') {
        this.interaction.applyItemToObject('item_card', 'door_lock_card');
        this.renderInspectDoor();
      } else {
        this.narrator.speak('The magnetic reader requires the Facility Master Keycard.');
      }
    });

    document.getElementById('btn-use-crank')?.addEventListener('click', () => {
      if (used.item_crank) return;
      if (state.selectedItem === 'item_crank') {
        this.interaction.applyItemToObject('item_crank', 'door_lock_crank');
        this.renderInspectDoor();
      } else {
        this.narrator.speak('The central pressure hub requires the heavy Locking Wheel Crank.');
      }
    });

    document.getElementById('btn-use-fuse')?.addEventListener('click', () => {
      if (used.item_fuse) return;
      if (state.selectedItem === 'item_fuse') {
        this.interaction.applyItemToObject('item_fuse', 'door_lock_fuse');
        this.renderInspectDoor();
      } else {
        this.narrator.speak('The power junction box requires the High-Voltage Relay Fuse.');
      }
    });

    // Keypad digit clicks
    const digitBtns = this.dom.inspectionContent.querySelectorAll('.keypad-btn[data-digit]');
    digitBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.puzzle.pressKeypadDigit(btn.dataset.digit);
        const screen = document.getElementById('keypad-screen');
        if (screen) screen.textContent = this.puzzle.keypadInput || 'ENTER 4 DIGITS';
      });
    });

    document.getElementById('btn-keypad-clear')?.addEventListener('click', () => {
      this.puzzle.clearKeypad();
      const screen = document.getElementById('keypad-screen');
      if (screen) screen.textContent = 'ENTER 4 DIGITS';
    });

    document.getElementById('btn-keypad-enter')?.addEventListener('click', () => {
      this.puzzle.submitKeypad();
      this.renderInspectDoor();
    });

    // Master Escape button
    document.getElementById('btn-master-escape')?.addEventListener('click', () => {
      if (canEscape) {
        this.triggerEscapeSequence();
      } else {
        this.audio.play('error');
        this.narrator.speak(`The door is still securely locked. (${usedCount}/5 mechanisms cleared).`);
      }
    });
  }

  // --- 2. INSPECT DESK ---
  renderInspectDesk() {
    const state = this.gameState.get();
    const config = state.config;
    const isDrawerUnlocked = state.unlockedContainers.has('desk_drawer_left');
    const hasScrewdriver = state.discoveredItems.includes('tool_screwdriver');
    const hasGift1 = config.gifts.deskCompartment;
    const collectedGift1 = state.unlockedContainers.has('gift_desk_box');

    this.dom.inspectionContent.innerHTML = `
      <div class="inspect-desk-container">
        <!-- Open Clinical Journal / Notebook -->
        <div class="desk-journal">
          <div class="journal-header">
            <h3>DR. ARTHUR VANCE — CLINICAL INCIDENT DOSSIER</h3>
            <span class="file-tag">CONFIDENTIAL FILE #104-M</span>
          </div>
          <div class="journal-body">
            <p><strong>SUBJECT:</strong> Unidentified male, post-trauma admission.</p>
            <p><strong>INCIDENT:</strong> Violent collision with heavy transport vehicle at highway junction.</p>
            <p class="highlight-clue">
              <strong>ADMISSION RECORD:</strong> Incident recorded precisely at 
              <span class="time-stamp">${config.clock.timeString} HRS</span>. Clock in observation room must remain synced.
            </p>
            <p class="highlight-clue">
              <strong>SEDATIVE DOSAGE:</strong> Administer formula 
              <span class="rx-stamp">RX-${config.cabinet.code}</span> from wall medical cabinet.
            </p>
            <div class="ribbon-bookmark">
              <strong>TREATISE SHELVING PROTOCOL:</strong>
              <div class="ribbon-sequence">
                ${config.bookshelf.sequence.map(c => `<span class="ribbon-color color-${c.toLowerCase()}">${c}</span>`).join(' → ')}
              </div>
            </div>
          </div>
        </div>

        <!-- Desk Drawers Section -->
        <div class="desk-drawers-row">
          <div class="desk-drawer-card ${isDrawerUnlocked ? 'unlocked' : 'locked'}">
            <h4>LEFT DESK DRAWER</h4>
            <div class="drawer-view">
              ${isDrawerUnlocked ? `
                <div class="drawer-open">
                  <p>Drawer is open.</p>
                  ${!hasScrewdriver ? `
                    <button class="collect-btn" id="btn-collect-screwdriver">
                      <span class="btn-icon">${ITEMS_DATA.tool_screwdriver.iconSvg}</span>
                      TAKE FLATHEAD SCREWDRIVER
                    </button>
                  ` : '<p class="item-taken">Screwdriver collected.</p>'}
                </div>
              ` : `
                <div class="drawer-locked">
                  <p>Secured by a small keyhole.</p>
                  <button class="action-btn" id="btn-unlock-drawer">
                    ${state.selectedItem === 'key_small_silver' ? 'UNLOCK WITH SILVER KEY' : 'INSPECT LOCK'}
                  </button>
                </div>
              `}
            </div>
          </div>

          <!-- Secret Desk Organizer Niche (Luck-based Gift 1) -->
          ${hasGift1 ? `
            <div class="desk-drawer-card gift-niche">
              <h4>CONCEALED DESK NICHE</h4>
              <div class="drawer-view">
                ${!collectedGift1 ? `
                  <button class="gift-btn" id="btn-collect-gift1">
                    ⚡ ADRENALINE AMPOULE (+30 SECONDS)
                  </button>
                ` : '<p class="item-taken">Adrenaline ampoule used (+30s added).</p>'}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // Drawer Unlock interaction
    document.getElementById('btn-unlock-drawer')?.addEventListener('click', () => {
      if (state.selectedItem === 'key_small_silver') {
        this.interaction.applyItemToObject('key_small_silver', 'desk_drawer_left');
        this.renderInspectDesk();
      } else {
        this.narrator.speak('This drawer requires a small silver key.');
      }
    });

    // Collect screwdriver
    document.getElementById('btn-collect-screwdriver')?.addEventListener('click', () => {
      this.interaction.collectItem('tool_screwdriver');
      this.renderInspectDesk();
    });

    // Collect Gift 1
    document.getElementById('btn-collect-gift1')?.addEventListener('click', () => {
      this.interaction.collectExtensionGift('gift_desk_box');
      this.renderInspectDesk();
    });
  }

  // --- 3. INSPECT WALL CLOCK ---
  renderInspectClock() {
    const state = this.gameState.get();
    const config = state.config;
    const isSolved = this.puzzle.clockState.solved || state.isPuzzleSolved('clock');
    const hasBrassKey = state.discoveredItems.includes('item_key');

    const h = this.puzzle.clockState.hour;
    const m = this.puzzle.clockState.minute;

    // Calculate rotation angles
    const minuteDeg = m * 6;
    const hourDeg = (h % 12) * 30 + m * 0.5;

    this.dom.inspectionContent.innerHTML = `
      <div class="inspect-clock-container">
        <p class="inspect-subtitle">Institutional brass wall clock. The hands can be adjusted manually.</p>

        <div class="clock-display-visual">
          <svg viewBox="0 0 240 240" class="clock-svg">
            <circle cx="120" cy="120" r="110" fill="#334155" stroke="#f59e0b" stroke-width="8"/>
            <circle cx="120" cy="120" r="95" fill="#fef3c7"/>
            <!-- Clock Numerals -->
            <text x="120" y="48" font-size="20" font-weight="bold" fill="#1e293b" text-anchor="middle">12</text>
            <text x="195" y="128" font-size="20" font-weight="bold" fill="#1e293b" text-anchor="middle">3</text>
            <text x="120" y="202" font-size="20" font-weight="bold" fill="#1e293b" text-anchor="middle">6</text>
            <text x="45" y="128" font-size="20" font-weight="bold" fill="#1e293b" text-anchor="middle">9</text>
            <!-- Hour Hand -->
            <line x1="120" y1="120" x2="120" y2="70" stroke="#1e293b" stroke-width="6" stroke-linecap="round"
              transform="rotate(${hourDeg} 120 120)"/>
            <!-- Minute Hand -->
            <line x1="120" y1="120" x2="120" y2="45" stroke="#b45309" stroke-width="4" stroke-linecap="round"
              transform="rotate(${minuteDeg} 120 120)"/>
            <circle cx="120" cy="120" r="8" fill="#f59e0b"/>
          </svg>

          <div class="clock-readout">
            TIME SET: <span>${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}</span>
          </div>
        </div>

        ${!isSolved ? `
          <div class="clock-controls">
            <div class="control-row">
              <span class="control-label">HOUR:</span>
              <button class="step-btn" id="btn-clock-h-down">-1</button>
              <button class="step-btn" id="btn-clock-h-up">+1</button>
            </div>
            <div class="control-row">
              <span class="control-label">MINUTE:</span>
              <button class="step-btn" id="btn-clock-m-down">-5</button>
              <button class="step-btn" id="btn-clock-m-up">+5</button>
            </div>
          </div>
        ` : `
          <div class="clock-compartment-opened">
            <div class="hatch-alert">⚡ SECRET CLOCK COMPARTMENT SPRUNG OPEN!</div>
            ${!hasBrassKey ? `
              <button class="collect-btn" id="btn-collect-brass-key">
                <span class="btn-icon">${ITEMS_DATA.item_key.iconSvg}</span>
                TAKE ANTIQUE BRASS KEY (ESCAPE ITEM 1/5)
              </button>
            ` : '<p class="item-taken">Antique Brass Key collected.</p>'}
          </div>
        `}
      </div>
    `;

    document.getElementById('btn-clock-h-up')?.addEventListener('click', () => {
      this.puzzle.adjustClockHour(1);
      this.renderInspectClock();
    });
    document.getElementById('btn-clock-h-down')?.addEventListener('click', () => {
      this.puzzle.adjustClockHour(-1);
      this.renderInspectClock();
    });
    document.getElementById('btn-clock-m-up')?.addEventListener('click', () => {
      this.puzzle.adjustClockMinute(5);
      this.renderInspectClock();
    });
    document.getElementById('btn-clock-m-down')?.addEventListener('click', () => {
      this.puzzle.adjustClockMinute(-5);
      this.renderInspectClock();
    });

    document.getElementById('btn-collect-brass-key')?.addEventListener('click', () => {
      this.interaction.collectItem('item_key');
      this.renderInspectClock();
    });
  }

  // --- 4. INSPECT PAINTING ---
  renderInspectPainting() {
    const state = this.gameState.get();
    const config = state.config;
    const hasUV = state.hasItem('tool_uv_pen');
    const isTilted = this.puzzle.paintingTilted;
    const isUVOn = this.puzzle.uvLightOn;

    this.dom.inspectionContent.innerHTML = `
      <div class="inspect-painting-container ${isUVOn ? 'uv-active' : ''}">
        <div class="painting-frame-wrapper ${isTilted ? 'tilted' : ''}" id="painting-frame">
          <div class="painting-canvas">
            <div class="canvas-art">
              <svg viewBox="0 0 320 220" width="100%" height="100%">
                <rect width="320" height="220" fill="#0f172a"/>
                <!-- Rainy highway scene -->
                <path d="M0 220 L160 110 L320 220 Z" fill="#1e293b"/>
                <line x1="160" y1="110" x2="160" y2="220" stroke="#ca8a04" stroke-width="3" stroke-dasharray="8 6"/>
                <circle cx="150" cy="110" r="5" fill="#fef08a" opacity="0.9"/>
                <circle cx="170" cy="110" r="5" fill="#fef08a" opacity="0.9"/>
                <!-- Rain streaks -->
                <line x1="40" y1="20" x2="20" y2="60" stroke="#38bdf8" stroke-width="1" opacity="0.5"/>
                <line x1="120" y1="10" x2="100" y2="50" stroke="#38bdf8" stroke-width="1" opacity="0.5"/>
                <line x1="260" y1="30" x2="240" y2="70" stroke="#38bdf8" stroke-width="1" opacity="0.5"/>
              </svg>
            </div>
            <div class="plaque">"THE CROSSROADS" — 1974</div>
          </div>

          <!-- Hidden wall backing behind frame -->
          <div class="frame-behind ${isTilted ? 'revealed' : ''}">
            <div class="wall-scratches">
              ${isUVOn ? `
                <div class="uv-glow-cipher">
                  <div class="uv-title">⚡ EMERGENCY OVERRIDE</div>
                  <div class="uv-digits">${config.door.overrideCode}</div>
                  <div class="uv-sub">(DOOR KEYPAD CODE)</div>
                </div>
              ` : `
                <div class="faint-smudges">
                  Faint invisible residue and scratch marks on the plaster...
                </div>
              `}
            </div>
          </div>
        </div>

        <div class="painting-actions">
          <button class="action-btn" id="btn-tilt-painting">
            ${isTilted ? 'STRAIGHTEN PAINTING' : 'TILTE FRAME TO INSPECT BEHIND'}
          </button>

          ${hasUV ? `
            <button class="action-btn uv-btn ${isUVOn ? 'active' : ''}" id="btn-toggle-uv">
              ${isUVOn ? '💡 TURN OFF UV PENLIGHT' : '🟣 SHINE UV PENLIGHT'}
            </button>
          ` : `
            <div class="tool-hint">You need an ultraviolet light source to inspect the markings.</div>
          `}
        </div>
      </div>
    `;

    document.getElementById('btn-tilt-painting')?.addEventListener('click', () => {
      this.puzzle.togglePaintingTilt();
      this.renderInspectPainting();
    });

    document.getElementById('btn-toggle-uv')?.addEventListener('click', () => {
      this.puzzle.toggleUVLight();
      this.renderInspectPainting();
    });
  }

  // --- 5. INSPECT BOOKSHELF ---
  renderInspectBookshelf() {
    const state = this.gameState.get();
    const config = state.config;
    const isSolved = this.puzzle.bookshelfState.solved || state.isPuzzleSolved('bookshelf');
    const hasCard = state.discoveredItems.includes('item_card');
    const hasGift2 = config.gifts.hollowBook;
    const collectedGift2 = state.unlockedContainers.has('gift_bookshelf_book');

    const currentOrder = this.puzzle.bookshelfState.currentOrder;

    this.dom.inspectionContent.innerHTML = `
      <div class="inspect-bookshelf-container">
        <p class="inspect-subtitle">Rearrange the 4 colored medical treatises into the order indicated by the notebook's ribbon.</p>

        <div class="books-shelf-display">
          ${currentOrder.map((color, idx) => `
            <div class="book-spine color-${color.toLowerCase()}" data-index="${idx}">
              <div class="book-title">VOL. ${idx + 1}</div>
              <div class="book-color-label">${color}</div>
              ${!isSolved ? `
                <div class="book-arrows">
                  <button class="arrow-btn btn-left" data-shift="-1" data-index="${idx}">◀</button>
                  <button class="arrow-btn btn-right" data-shift="1" data-index="${idx}">▶</button>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>

        ${isSolved ? `
          <div class="bookshelf-unlocked-panel">
            <div class="hatch-alert">⚡ FALSE BOOK SHELF SLID BACKWARD!</div>
            ${!hasCard ? `
              <button class="collect-btn" id="btn-collect-card">
                <span class="btn-icon">${ITEMS_DATA.item_card.iconSvg}</span>
                TAKE FACILITY MASTER KEYCARD (ESCAPE ITEM 2/5)
              </button>
            ` : '<p class="item-taken">Master Keycard collected.</p>'}
          </div>
        ` : ''}

        ${hasGift2 ? `
          <div class="hollow-book-niche">
            <h4>HOLLOW DICTIONARY</h4>
            ${!collectedGift2 ? `
              <button class="gift-btn" id="btn-collect-gift2">
                ⚡ ADRENALINE AMPOULE (+30 SECONDS)
              </button>
            ` : '<p class="item-taken">Adrenaline ampoule used (+30s added).</p>'}
          </div>
        ` : ''}
      </div>
    `;

    // Book shift buttons
    const arrowBtns = this.dom.inspectionContent.querySelectorAll('.arrow-btn');
    arrowBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        const shift = parseInt(btn.dataset.shift, 10);
        this.puzzle.shiftBook(idx, shift);
        this.renderInspectBookshelf();
      });
    });

    document.getElementById('btn-collect-card')?.addEventListener('click', () => {
      this.interaction.collectItem('item_card');
      this.renderInspectBookshelf();
    });

    document.getElementById('btn-collect-gift2')?.addEventListener('click', () => {
      this.interaction.collectExtensionGift('gift_bookshelf_book');
      this.renderInspectBookshelf();
    });
  }

  // --- 6. INSPECT MEDICINE CABINET ---
  renderInspectCabinet() {
    const state = this.gameState.get();
    const isSolved = state.isPuzzleSolved('cabinet');
    const hasCrank = state.discoveredItems.includes('item_crank');
    const dials = this.puzzle.cabinetDials;

    this.dom.inspectionContent.innerHTML = `
      <div class="inspect-cabinet-container">
        <p class="inspect-subtitle">Wall medical locker secured by a 3-digit combination tumbler.</p>

        <div class="cabinet-tumbler-row">
          ${[0, 1, 2].map(idx => `
            <div class="tumbler-column">
              ${!isSolved ? `<button class="dial-btn btn-up" data-dial="${idx}" data-delta="1">▲</button>` : ''}
              <div class="dial-digit">${dials[idx]}</div>
              ${!isSolved ? `<button class="dial-btn btn-down" data-dial="${idx}" data-delta="-1">▼</button>` : ''}
            </div>
          `).join('')}
        </div>

        ${isSolved ? `
          <div class="cabinet-open-panel">
            <div class="hatch-alert">✓ COMBINATION MATCHED — CABINET OPEN</div>
            ${!hasCrank ? `
              <button class="collect-btn" id="btn-collect-crank">
                <span class="btn-icon">${ITEMS_DATA.item_crank.iconSvg}</span>
                TAKE HEAVY WHEEL CRANK (ESCAPE ITEM 3/5)
              </button>
            ` : '<p class="item-taken">Wheel Crank collected.</p>'}
          </div>
        ` : `
          <div class="clue-reminder">
            Hint: Check the patient's prescription code (RX-...) in the clinical notes.
          </div>
        `}
      </div>
    `;

    const dialBtns = this.dom.inspectionContent.querySelectorAll('.dial-btn');
    dialBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const dial = parseInt(btn.dataset.dial, 10);
        const delta = parseInt(btn.dataset.delta, 10);
        this.puzzle.adjustCabinetDial(dial, delta);
        this.renderInspectCabinet();
      });
    });

    document.getElementById('btn-collect-crank')?.addEventListener('click', () => {
      this.interaction.collectItem('item_crank');
      this.renderInspectCabinet();
    });
  }

  // --- 7. INSPECT FLOORBOARD ---
  renderInspectFloorboard() {
    const state = this.gameState.get();
    const isPried = state.unlockedContainers.has('loose_floorboard');
    const hasFuse = state.discoveredItems.includes('item_fuse');

    this.dom.inspectionContent.innerHTML = `
      <div class="inspect-floorboard-container">
        <p class="inspect-subtitle">A heavy wooden floorboard is uneven and wobbly.</p>

        <div class="floorboard-detail">
          ${isPried ? `
            <div class="floorboard-pried">
              <p>The plank is pried upward, revealing the dusty subfloor cavity.</p>
              ${!hasFuse ? `
                <button class="collect-btn" id="btn-collect-fuse">
                  <span class="btn-icon">${ITEMS_DATA.item_fuse.iconSvg}</span>
                  TAKE HIGH-VOLTAGE RELAY FUSE (ESCAPE ITEM 4/5)
                </button>
              ` : '<p class="item-taken">Relay Fuse collected.</p>'}
            </div>
          ` : `
            <div class="floorboard-stuck">
              <p>The board is tightly wedged into the tongue-and-groove joint. Bare fingers cannot pry it open.</p>
              <button class="action-btn" id="btn-pry-board">
                ${state.selectedItem === 'tool_screwdriver' ? 'PRY WITH SCREWDRIVER' : 'TRY TO PRY OPEN'}
              </button>
            </div>
          `}
        </div>
      </div>
    `;

    document.getElementById('btn-pry-board')?.addEventListener('click', () => {
      if (state.selectedItem === 'tool_screwdriver') {
        this.interaction.applyItemToObject('tool_screwdriver', 'loose_floorboard');
        this.renderInspectFloorboard();
      } else {
        this.narrator.speak('I need a sturdy flat tool to pry this heavy board open.');
      }
    });

    document.getElementById('btn-collect-fuse')?.addEventListener('click', () => {
      this.interaction.collectItem('item_fuse');
      this.renderInspectFloorboard();
    });
  }

  // --- 8. INSPECT DOCTOR'S COAT ---
  renderInspectCoat() {
    const state = this.gameState.get();
    const config = state.config;
    const coatItem = config.placements.coatPocket;
    const isFound = state.discoveredItems.includes(coatItem);
    const itemDef = ITEMS_DATA[coatItem];

    this.dom.inspectionContent.innerHTML = `
      <div class="inspect-coat-container">
        <p class="inspect-subtitle">Doctor Arthur Vance's white laboratory coat hanging from a brass peg.</p>
        <div class="coat-pocket-area">
          ${!isFound ? `
            <button class="collect-btn" id="btn-search-coat">
              SEARCH BREAST POCKET
            </button>
          ` : `
            <p class="item-taken">Pockets searched. Obtained ${itemDef ? itemDef.name : 'item'}.</p>
          `}
        </div>
      </div>
    `;

    document.getElementById('btn-search-coat')?.addEventListener('click', () => {
      this.interaction.collectItem(coatItem);
      this.renderInspectCoat();
    });
  }

  // --- 9. INSPECT BED ---
  renderInspectBed() {
    const state = this.gameState.get();
    const config = state.config;
    const bedItem = config.placements.mattress;
    const isFound = state.discoveredItems.includes(bedItem);
    const itemDef = ITEMS_DATA[bedItem];

    this.dom.inspectionContent.innerHTML = `
      <div class="inspect-bed-container">
        <p class="inspect-subtitle">An iron hospital cot with coarse linen and an askew pillow.</p>
        <div class="bed-search-area">
          ${!isFound ? `
            <button class="collect-btn" id="btn-search-bed">
              LIFT PILLOW & MATTRESS CORNER
            </button>
          ` : `
            <p class="item-taken">Bed investigated. Obtained ${itemDef ? itemDef.name : 'item'}.</p>
          `}
        </div>
      </div>
    `;

    document.getElementById('btn-search-bed')?.addEventListener('click', () => {
      this.interaction.collectItem(bedItem);
      this.renderInspectBed();
    });
  }

  // --- 10. INSPECT WINDOW ---
  renderInspectWindow() {
    this.dom.inspectionContent.innerHTML = `
      <div class="inspect-window-container">
        <p class="inspect-subtitle">A high barred window overlooking rainswept grounds.</p>
        <div class="window-atmosphere">
          <p>Heavy steel bars are set deep into the concrete masonry. Cold rain washes down the glass pane.</p>
          <p class="window-quote">"Third floor... Outside is darkness and stormy pine trees. There is no escaping through here. The only WAY OUT is through that heavy door."</p>
        </div>
      </div>
    `;
  }

  // === ESCAPE & ENDING CINEMATIC ===
  triggerEscapeSequence() {
    this.audio.play('door_open');
    this.gameState.set({ escaped: true, running: false });

    // Show ending sequence as specified in Section 17 & 18 of prompt
    setTimeout(() => {
      this.hideInspection();
      this.dom.endingModal.classList.remove('hidden');
      this.audio.play('puzzle_solve');
    }, 1000);
  }

  // === HINT MODAL ===
  showHintModal() {
    const hints = this.dom.hintModal;
    if (!hints) return;

    const hintData = this.getHintData();
    if (this.dom.hintTargetLabel) {
      this.dom.hintTargetLabel.textContent = `TARGET: ${hintData.target || 'Next Objective'}`;
    }

    let level = this.gameState.get().currentHintLevel || 1;
    let hintText = level === 1 ? hintData.level1 : (level === 2 ? hintData.level2 : hintData.level3);

    if (this.dom.hintLevelText) {
      this.dom.hintLevelText.textContent = hintText;
    }

    if (this.dom.btnNextHintLevel) {
      this.dom.btnNextHintLevel.textContent = level < 3 ? `Request Stronger Hint (Level ${level + 1}/3)` : 'Max Hint Level Reached';
      this.dom.btnNextHintLevel.onclick = () => {
        if (level < 3) {
          level++;
          this.gameState.set({ currentHintLevel: level });
          hintText = level === 2 ? hintData.level2 : hintData.level3;
          this.dom.hintLevelText.textContent = hintText;
          this.dom.btnNextHintLevel.textContent = level < 3 ? `Request Stronger Hint (Level ${level + 1}/3)` : 'Max Hint Level Reached';
          this.audio.play('click');
        }
      };
    }

    hints.classList.remove('hidden');
  }

  getHintData() {
    // Dynamically retrieve from hintSystem
    return window.wayOutHintSystem.getCurrentHints();
  }

  showSettingsModal() {
    if (!this.dom.settingsModal) return;
    const settings = this.gameState.get().settings;

    if (this.dom.toggleSound) this.dom.toggleSound.checked = settings.sound;
    if (this.dom.toggleMusic) this.dom.toggleMusic.checked = settings.music;
    if (this.dom.selectTextSize) this.dom.selectTextSize.value = settings.textSize;

    this.dom.toggleSound.onchange = (e) => {
      this.gameState.set({ settings: { ...this.gameState.get().settings, sound: e.target.checked } });
      this.audio.setSoundEnabled(e.target.checked);
      this.updateAudioIcons();
    };

    this.dom.toggleMusic.onchange = (e) => {
      this.gameState.set({ settings: { ...this.gameState.get().settings, music: e.target.checked } });
      this.audio.setMusicEnabled(e.target.checked);
    };

    this.dom.selectTextSize.onchange = (e) => {
      this.gameState.set({ settings: { ...this.gameState.get().settings, textSize: e.target.value } });
      document.body.className = `text-${e.target.value}`;
    };

    this.dom.settingsModal.classList.remove('hidden');
  }

  showDebugModal() {
    if (!this.dom.debugModal) return;
    const state = this.gameState.get();
    const debugInfo = document.getElementById('debug-state-info');
    if (debugInfo) {
      debugInfo.textContent = JSON.stringify({
        seed: state.randomSeed,
        timeRemaining: state.timeRemaining,
        inventory: state.inventory,
        escapeItemsUsed: state.escapeItemsUsed,
        solvedPuzzles: Array.from(state.solvedPuzzles),
        config: state.config,
      }, null, 2);
    }
    this.dom.debugModal.classList.remove('hidden');
  }
}
