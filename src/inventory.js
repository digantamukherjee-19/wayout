/**
 * WAY OUT - Inventory & Inspection System
 * Clean, restrained, dark institutional UI with automatic pickup notifications
 * and tap-to-inspect item detail cards.
 *
 * CRITICAL RULE: Items are NEVER removed or hidden once acquired!
 */

export const ITEM_DEFS = {
  strangeKey: {
    id: 'strangeKey',
    name: 'STRANGE KEY',
    shortLabel: 'KEY',
    iconSvg: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-1.5 1.5L14 9l-3-3 2.5-2.5a4.95 4.95 0 0 0-7 7L11 15l2 2 1.5-1.5M16 8l2 2m-4 2l2 2"/></svg>`,
    desc: 'A small brass key with unusual notches. Found in your pocket when you woke up. It looks designed for a drawer or small cabinet lock, not the heavy exit door.'
  },
  crowbar: {
    id: 'crowbar',
    name: 'CROWBAR',
    shortLabel: 'CROWBAR',
    iconSvg: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20L18 6l3 1-1 3-12 12-4-2z"/></svg>`,
    desc: 'A heavy metal tool. It looks strong enough to force something open.'
  },
  accessCard1: {
    id: 'accessCard1',
    name: 'ACCESS CARD',
    shortLabel: 'CARD',
    iconSvg: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`,
    desc: 'A magnetic clearance card found pried from the metal box. By itself, it does not release the final exit.'
  },
  phone: {
    id: 'phone',
    name: 'OLD PHONE',
    shortLabel: 'PHONE',
    iconSvg: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
    desc: 'An old mobile phone discovered in the concealed floor compartment. The battery still holds enough charge to display the lockscreen: 11:11 PM.',
    isPhone: true
  },
  cabinetKey: {
    id: 'cabinetKey',
    name: 'CABINET KEY',
    shortLabel: 'CAB KEY',
    iconSvg: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="4.5"/><path d="M11 12l10-10m-3 0l3 3m-5 1l2 2"/></svg>`,
    desc: 'A heavy steel key ejected from the door console after entering the correct PIN. Fits the padlock on the tall medical supply cabinet.'
  },
  accessCard2: {
    id: 'accessCard2',
    name: 'ACCESS CARD',
    shortLabel: 'CARD',
    iconSvg: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`,
    desc: 'A high-level security card retrieved from inside the cabinet. Encoded specifically for the final exit door release.'
  },
};

export class InventoryManager {
  constructor(gameState, audio) {
    this.gameState = gameState;
    this.audio = audio;
    this.container = document.getElementById('inventory-slots');

    // Toast elements
    this.toastEl = document.getElementById('pickup-toast');
    this.toastTitleEl = document.getElementById('pickup-toast-title');
    this.toastSubEl = document.getElementById('pickup-toast-sub');
    this.toastTimer = null;

    // Inspection modal elements
    this.inspectModal = document.getElementById('modal-item-inspect');
    this.inspectIconEl = document.getElementById('inspect-item-icon');
    this.inspectNameEl = document.getElementById('inspect-item-name');
    this.inspectDescEl = document.getElementById('inspect-item-desc');
    this.inspectPhoneScreenEl = document.getElementById('inspect-phone-screen');
    this.btnCloseInspect = document.getElementById('btn-close-item-inspect');

    this.init();
  }

  init() {
    this.gameState.on('stateChange', () => this.render());
    this.gameState.on('stateReset', () => this.render());
    this.gameState.on('itemCollected', ({ name }) => {
      this.showPickupToast(name, 'Added to inventory');
    });

    this.btnCloseInspect?.addEventListener('click', () => {
      this.audio.play('click');
      this.closeInspect();
    });

    this.render();
  }

  showPickupToast(name, sub = 'Added to inventory') {
    if (!this.toastEl) return;

    if (this.toastTitleEl) this.toastTitleEl.textContent = name;
    if (this.toastSubEl) this.toastSubEl.textContent = sub;

    this.audio.play('pickup');

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }

    this.toastEl.classList.remove('hidden');
    void this.toastEl.offsetWidth;
    this.toastEl.classList.add('show');

    this.toastTimer = setTimeout(() => {
      this.toastEl.classList.remove('show');
      setTimeout(() => {
        if (!this.toastEl.classList.contains('show')) {
          this.toastEl.classList.add('hidden');
        }
      }, 400);
    }, 1800);
  }

  openInspect(key) {
    const def = ITEM_DEFS[key];
    if (!def || !this.inspectModal) return;

    if (this.inspectIconEl) this.inspectIconEl.innerHTML = def.iconSvg;
    if (this.inspectNameEl) this.inspectNameEl.textContent = def.name;
    if (this.inspectDescEl) this.inspectDescEl.textContent = def.desc;

    if (this.inspectPhoneScreenEl) {
      if (def.isPhone) {
        this.inspectPhoneScreenEl.classList.remove('hidden');
      } else {
        this.inspectPhoneScreenEl.classList.add('hidden');
      }
    }

    this.inspectModal.classList.remove('hidden');
  }

  closeInspect() {
    if (this.inspectModal) {
      this.inspectModal.classList.add('hidden');
    }
  }

  render() {
    if (!this.container) return;
    const inv = this.gameState.inventory;
    this.container.innerHTML = '';

    const activeKeys = Object.keys(inv).filter(k => inv[k] === true);

    if (activeKeys.length === 0) {
      this.container.innerHTML = `<span class="inventory-empty-hint">Empty</span>`;
      return;
    }

    activeKeys.forEach(key => {
      const def = ITEM_DEFS[key];
      if (!def) return;

      const slot = document.createElement('div');
      slot.className = 'inv-slot';
      slot.dataset.itemKey = key;
      slot.setAttribute('title', def.name);
      slot.innerHTML = `
        <div class="inv-icon-wrap">${def.iconSvg}</div>
        <span class="inv-name">${def.shortLabel}</span>
      `;

      slot.addEventListener('click', (e) => {
        e.stopPropagation();
        this.audio.play('click');
        this.openInspect(key);
      });

      this.container.appendChild(slot);
    });
  }
}
