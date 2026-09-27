/**
 * WAY OUT - Progressive Hint System
 * Provides 3 tiers of dynamic hints (Subtle, Specific, Direct) based on current puzzle state.
 */

export class HintSystem {
  constructor(gameState) {
    this.gameState = gameState;
  }

  /**
   * Evaluates current game state and returns progressive hints for the next bottleneck.
   */
  getCurrentHints() {
    const state = this.gameState.get();
    const config = state.config;
    if (!config) {
      return {
        level1: 'Explore the room and inspect objects closely.',
        level2: 'Check personal items and clothing hanging in the room.',
        level3: 'Search the doctor\'s coat and bed mattress for initial tools.',
      };
    }

    const hasCoatItem = state.discoveredItems.includes(config.placements.coatPocket);
    const hasMattressItem = state.discoveredItems.includes(config.placements.mattress);
    const hasSilverKey = state.inventory.includes('key_small_silver') || state.usedItems.includes('key_small_silver');
    const hasScrewdriver = state.inventory.includes('tool_screwdriver') || state.usedItems.includes('tool_screwdriver');
    const hasUV = state.inventory.includes('tool_uv_pen');

    // Escape components status
    const hasKey = state.inventory.includes('item_key') || state.escapeItemsUsed.item_key;
    const hasCode = state.inventory.includes('item_code') || state.escapeItemsUsed.item_code;
    const hasCard = state.inventory.includes('item_card') || state.escapeItemsUsed.item_card;
    const hasCrank = state.inventory.includes('item_crank') || state.escapeItemsUsed.item_crank;
    const hasFuse = state.inventory.includes('item_fuse') || state.escapeItemsUsed.item_fuse;

    // Stage 1: Starting items
    if (!hasCoatItem || !hasMattressItem) {
      return {
        target: 'Room Surfaces',
        level1: 'There are small items tucked away in everyday room fixtures.',
        level2: 'Check the pockets of hanging garments and corners of the hospital bed.',
        level3: 'Tap the hanging doctor\'s white coat and the hospital bed mattress corner.',
      };
    }

    // Stage 2: Desk Drawer & Screwdriver
    if (!hasScrewdriver && hasSilverKey) {
      return {
        target: 'Desk Drawer',
        level1: 'A key in hand must have a matching lock in the room.',
        level2: 'The examination desk has a locked drawer on the left.',
        level3: 'Select the Small Silver Key from your inventory and unlock the left desk drawer.',
      };
    }

    // Stage 3: Clock Puzzle (Brass Key)
    if (!hasKey) {
      return {
        target: 'Wall Clock',
        level1: 'Time was frozen at the moment of impact. Look for medical records.',
        level2: 'The notebook on the desk contains an incident report with an exact admission timestamp.',
        level3: `Inspect the wall clock and set the hands to ${config.clock.timeString} to open the secret clock face latch.`,
      };
    }

    // Stage 4: Loose Floorboard (Relay Fuse)
    if (!hasFuse) {
      return {
        target: 'Loose Floorboard',
        level1: 'The floorboards near the front of the room look uneven and hollow.',
        level2: 'Something metallic is wedged beneath the loose plank, but your bare hands cannot lift it.',
        level3: 'Select the Flathead Screwdriver from your inventory and pry open the loose floorboard.',
      };
    }

    // Stage 5: Bookshelf Puzzle (Master Keycard)
    if (!hasCard) {
      return {
        target: 'Bookshelf Sequence',
        level1: 'Knowledge is categorized by order. Look for color markers left in the clinical notes.',
        level2: 'The open journal on the desk has a ribbon bookmark marking colored volumes.',
        level3: `Rearrange the 4 colored volumes on the bookshelf in the sequence: ${config.bookshelf.sequence.join(' → ')}.`,
      };
    }

    // Stage 6: Medicine Cabinet (Wheel Crank)
    if (!hasCrank) {
      return {
        target: 'Medicine Cabinet',
        level1: 'Prescribed medicines are kept under lock and key. Numbers can heal or unlock.',
        level2: 'Check the prescription notes and bed chart for a 3-digit medication code.',
        level3: `Set the medicine cabinet combination dials to [${config.cabinet.code}] to open the locker.`,
      };
    }

    // Stage 7: Painting UV Code (Door Keypad)
    if (!hasCode) {
      return {
        target: 'Oil Painting',
        level1: 'What the naked eye sees in the painting is only half the truth.',
        level2: 'Ultraviolet light reveals hidden phosphorescent pigments on the canvas and wall.',
        level3: 'Select the Ultraviolet Penlight in inventory, inspect the painting, and tap the frame to reveal the 4-digit code.',
      };
    }

    // Stage 8: Door Escape Assembly
    const missingEscape = [];
    if (!state.escapeItemsUsed.item_key) missingEscape.push('Insert Antique Key into Deadbolt');
    if (!state.escapeItemsUsed.item_code) missingEscape.push(`Enter ${config.door.overrideCode} on Keypad`);
    if (!state.escapeItemsUsed.item_card) missingEscape.push('Swipe Master Keycard in Reader');
    if (!state.escapeItemsUsed.item_crank) missingEscape.push('Mount & Turn Pressure Wheel Crank');
    if (!state.escapeItemsUsed.item_fuse) missingEscape.push('Insert Relay Fuse into Power Box');

    return {
      target: 'Final Exit Door',
      level1: 'You have gathered all five vital components. The heavy exit door awaits.',
      level2: 'Inspect the door up close and slot each of the five items into its corresponding mechanism.',
      level3: `Remaining steps: ${missingEscape.join(', ')}. Then hit the master release!`,
    };
  }
}
