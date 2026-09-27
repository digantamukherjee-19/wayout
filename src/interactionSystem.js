/**
 * WAY OUT - Interaction Coordinator
 * Manages tap/click interactions, item usage validation, and discovery mechanics.
 */

import { ROOM_OBJECTS } from './data/objects.js';
import { ITEMS_DATA } from './data/items.js';

export class InteractionSystem {
  constructor(gameState, audio, narrator, sceneManager, puzzleSystem, timerManager) {
    this.gameState = gameState;
    this.audio = audio;
    this.narrator = narrator;
    this.sceneManager = sceneManager;
    this.puzzle = puzzleSystem;
    this.timer = timerManager;
  }

  /**
   * Called when player taps an interactive object in the main room viewport.
   */
  handleRoomObjectTap(objectId) {
    const state = this.gameState.get();
    if (!state.running || state.gameOver || state.escaped) return;

    const objDef = ROOM_OBJECTS[objectId];
    if (!objDef) return;

    state.inspectedObjects.add(objectId);

    // If the player has an item selected, check if this object is a direct use target
    const selectedItem = state.selectedItem;
    if (selectedItem) {
      const itemDef = ITEMS_DATA[selectedItem];
      // If item can be used directly or requires inspection first
      if (itemDef && itemDef.useTarget === objectId) {
        this.applyItemToObject(selectedItem, objectId);
        return;
      }
    }

    // Default action: Open close-up inspection view
    this.sceneManager.inspectObject(objectId);
  }

  /**
   * Uses an item on a compatible target.
   */
  applyItemToObject(itemId, targetId) {
    const state = this.gameState.get();
    const config = state.config;

    // 1. Antique Brass Key on Door Deadbolt
    if (itemId === 'item_key' && (targetId === 'door_lock_deadbolt' || targetId === 'door_lock_key' || targetId === 'door')) {
      this.audio.play('unlock');
      this.gameState.removeItem('item_key');
      this.gameState.useEscapeItem('item_key');
      this.narrator.speak('The brass key turned smoothly in the deadbolt! Upper cylinder unlocked.');
      return true;
    }

    // 2. Override Code on Door Keypad
    if (itemId === 'item_code' && (targetId === 'door_lock_keypad' || targetId === 'door_lock_code' || targetId === 'door')) {
      this.audio.play('unlock');
      this.gameState.removeItem('item_code');
      this.gameState.useEscapeItem('item_code');
      this.narrator.speak('Emergency override code entered! Electronic security bolts disengaged.');
      return true;
    }

    // 3. Access Card on Door Magnetic Reader
    if (itemId === 'item_card' && (targetId === 'door_lock_card' || targetId === 'door')) {
      this.audio.play('unlock');
      this.gameState.removeItem('item_card');
      this.gameState.useEscapeItem('item_card');
      this.narrator.speak('Access card validated! The auxiliary electromagnetic lock released.');
      return true;
    }

    // 4. Wheel Crank on Door Locking Hub
    if (itemId === 'item_crank' && (targetId === 'door_lock_crank' || targetId === 'door')) {
      this.audio.play('unlock');
      this.gameState.removeItem('item_crank');
      this.gameState.useEscapeItem('item_crank');
      this.narrator.speak('Crank wheel locked onto the hub and turned! Heavy locking bars retracted.');
      return true;
    }

    // 5. Relay Fuse on Door Power Junction Box
    if (itemId === 'item_fuse' && (targetId === 'door_lock_fuse' || targetId === 'door')) {
      this.audio.play('unlock');
      this.gameState.removeItem('item_fuse');
      this.gameState.useEscapeItem('item_fuse');
      this.narrator.speak('Relay fuse slotted in! Power restored to the hydraulic door actuator.');
      return true;
    }

    // 5. Small Silver Key on Desk Drawer
    if (itemId === 'key_small_silver' && targetId === 'desk_drawer_left') {
      this.audio.play('unlock');
      this.gameState.removeItem('key_small_silver');
      this.gameState.unlockContainer('desk_drawer_left');
      this.narrator.speak('The small key unlocked the desk drawer. There\'s a sturdy tool inside!');
      return true;
    }

    // 6. Flathead Screwdriver on Loose Floorboard
    if (itemId === 'tool_screwdriver' && targetId === 'loose_floorboard') {
      this.audio.play('drawer');
      this.gameState.unlockContainer('loose_floorboard');
      this.narrator.speak('Pried the loose floorboard up! A high-voltage relay fuse was hidden underneath.');
      return true;
    }

    // Incompatible combination
    this.audio.play('error');
    this.narrator.speak('That doesn\'t seem to work here.');
    return false;
  }

  /**
   * Collects an item found inside an inspection view or compartment.
   */
  collectItem(itemId) {
    const state = this.gameState.get();
    if (state.discoveredItems.includes(itemId)) return;

    this.audio.play('pickup');
    this.gameState.addItem(itemId);

    const itemDef = ITEMS_DATA[itemId];
    if (itemDef && itemDef.isEscapeItem) {
      const count = Object.values(state.escapeItemsUsed).filter(Boolean).length +
        state.inventory.filter(id => ITEMS_DATA[id]?.isEscapeItem).length;
      this.narrator.speak(`Found ${itemDef.name}! This is one of the 5 crucial escape components.`);
    } else if (itemDef) {
      this.narrator.speak(`Obtained ${itemDef.name}. ${itemDef.description}`);
    }
  }

  /**
   * Collects a luck-based Time Extension Gift (+30s).
   */
  collectExtensionGift(giftId) {
    const state = this.gameState.get();
    if (state.unlockedContainers.has(giftId)) return;

    const added = this.timer.addExtensionGift();
    if (added) {
      this.gameState.unlockContainer(giftId);
    }
  }
}
