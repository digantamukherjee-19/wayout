/**
 * Comprehensive Simulation Test Suite for WAY OUT
 * Tests full gameplay scenarios, state changes, edge cases, and randomized runs.
 */

import { GameState } from '../src/gameState.js';
import { generateValidPuzzleConfig, validatePuzzleConfig } from '../src/randomizer.js';
import { TimerManager } from '../src/timer.js';
import { HintSystem } from '../src/hintSystem.js';
import { PuzzleSystem } from '../src/puzzleSystem.js';
import { InteractionSystem } from '../src/interactionSystem.js';
import { SceneManager } from '../src/sceneManager.js';

console.log('=== RUNNING COMPREHENSIVE ESCAPE ROOM SIMULATION SUITE ===\n');

const mockAudio = {
  play: (sfx) => {},
  startAmbience: () => {},
  stopAmbience: () => {},
  setSoundEnabled: () => {},
  setMusicEnabled: () => {},
};

const mockNarrator = {
  messages: [],
  speak: function(text) { this.messages.push(text); },
  clear: function() { this.messages = []; },
};

function runFullPlaythrough(seed, simulateLoss = false) {
  const gameState = new GameState();
  const { config, validation } = generateValidPuzzleConfig(seed);
  gameState.reset(seed);
  gameState.set({ config, running: true, timeRemaining: 300 });

  const timer = new TimerManager(gameState, mockAudio, mockNarrator);
  const scene = new SceneManager(gameState, mockAudio);
  const puzzle = new PuzzleSystem(gameState, mockAudio, mockNarrator, timer);
  const interaction = new InteractionSystem(gameState, mockAudio, mockNarrator, scene, puzzle, timer);
  const hintSystem = new HintSystem(gameState);

  // 1. Initial State Assertions
  if (gameState.get().timeRemaining !== 300) throw new Error('Initial time must be 300');
  if (gameState.get().inventory.length !== 0) throw new Error('Initial inventory must be empty');
  if (gameState.countEscapeItemsUsed() !== 0) throw new Error('Initial escape items used must be 0');

  // 2. Test Invalid Item Usage
  gameState.addItem('fake_invalid_item');
  const invalidResult = interaction.applyItemToObject('fake_invalid_item', 'door_lock_deadbolt');
  if (invalidResult !== false) throw new Error('Invalid item must return false and not crash');
  gameState.removeItem('fake_invalid_item');

  // 3. Search starting spots (Coat Pocket & Mattress)
  interaction.collectItem(config.placements.coatPocket);
  interaction.collectItem(config.placements.mattress);
  if (!gameState.hasItem(config.placements.coatPocket)) throw new Error('Coat item not collected');
  if (!gameState.hasItem(config.placements.mattress)) throw new Error('Mattress item not collected');

  // 4. Test Time Extension Gifts
  if (config.gifts.deskCompartment) {
    interaction.collectExtensionGift('gift_desk_box');
  }
  if (config.gifts.hollowBook) {
    interaction.collectExtensionGift('gift_bookshelf_book');
  }
  if (gameState.get().extensionGiftsFound > 2) {
    throw new Error('Extension gifts exceeded max of 2');
  }

  // 5. Unlock Desk Drawer with Silver Key
  if (gameState.hasItem('key_small_silver')) {
    interaction.applyItemToObject('key_small_silver', 'desk_drawer_left');
    interaction.collectItem('tool_screwdriver');
  } else {
    throw new Error('Silver key missing from starting spots');
  }

  // 6. Pry loose floorboard with Screwdriver
  if (gameState.hasItem('tool_screwdriver')) {
    interaction.applyItemToObject('tool_screwdriver', 'loose_floorboard');
    interaction.collectItem('item_fuse');
  } else {
    throw new Error('Screwdriver missing');
  }

  // 7. Solve Wall Clock Puzzle
  puzzle.clockState.hour = config.clock.hour;
  puzzle.clockState.minute = config.clock.minute;
  puzzle.checkClockSolution();
  if (!gameState.isPuzzleSolved('clock')) throw new Error('Clock puzzle solve failed');
  interaction.collectItem('item_key');

  // 8. Solve Bookshelf Order Puzzle
  puzzle.bookshelfState.currentOrder = [...config.bookshelf.sequence];
  puzzle.checkBookshelfSolution();
  if (!gameState.isPuzzleSolved('bookshelf')) throw new Error('Bookshelf solve failed');
  interaction.collectItem('item_card');

  // 9. Solve Medicine Cabinet Tumblers
  puzzle.cabinetDials = config.cabinet.code.split('').map(Number);
  puzzle.checkCabinetSolution();
  if (!gameState.isPuzzleSolved('cabinet')) throw new Error('Cabinet solve failed');
  interaction.collectItem('item_crank');

  // 10. Reveal Painting UV Code
  puzzle.paintingTilted = true;
  puzzle.toggleUVLight();
  interaction.collectItem('item_code');

  // Verify all 5 escape items collected
  const escapeKeys = ['item_key', 'item_code', 'item_card', 'item_crank', 'item_fuse'];
  const allFound = escapeKeys.every(k => gameState.hasItem(k) || gameState.get().discoveredItems.includes(k));
  if (!allFound) throw new Error('Not all 5 escape items were discovered');

  if (simulateLoss) {
    // Simulate countdown to 0
    gameState.set({ timeRemaining: 1 });
    timer.tick();
    if (!gameState.get().gameOver) throw new Error('Game over state failed on timeout');
    return { status: 'GAMEOVER', giftsFound: gameState.get().extensionGiftsFound };
  }

  // 11. Apply 5 Escape Components to Door
  escapeKeys.forEach(k => {
    interaction.applyItemToObject(k, `door_lock_${k.replace('item_', '')}`);
  });
  // Keypad submit
  puzzle.keypadInput = config.door.overrideCode;
  puzzle.submitKeypad();

  if (gameState.countEscapeItemsUsed() !== 5) {
    throw new Error(`Expected 5 escape items used, found ${gameState.countEscapeItemsUsed()}`);
  }
  if (!gameState.get().escaped) {
    throw new Error('Escaped state not triggered after 5 items used');
  }

  return {
    status: 'ESCAPED',
    giftsFound: gameState.get().extensionGiftsFound,
    timeRemaining: gameState.get().timeRemaining,
    seed,
  };
}

// RUN 100 RANDOM PLAYTHROUGHS
let winCount = 0;
let lossCount = 0;
let giftCounts = { 0: 0, 1: 0, 2: 0 };

for (let i = 0; i < 100; i++) {
  const seed = Math.floor(Math.random() * 1000000);
  const result = runFullPlaythrough(seed, false);
  if (result.status === 'ESCAPED') {
    winCount++;
    giftCounts[result.giftsFound] = (giftCounts[result.giftsFound] || 0) + 1;
  }
}

// TEST TIMEOUT GAME OVER
for (let i = 0; i < 10; i++) {
  const seed = Math.floor(Math.random() * 1000000);
  const result = runFullPlaythrough(seed, true);
  if (result.status === 'GAMEOVER') {
    lossCount++;
  }
}

console.log(`✓ 100/100 Full Escapes simulated successfully without deadlocks!`);
console.log(`✓ 10/10 Timeout Game Overs verified.`);
console.log(`Gift occurrences across 100 runs:`, giftCounts);
console.log('\n=== ALL SIMULATION TESTS PASSED (100%) ===');
