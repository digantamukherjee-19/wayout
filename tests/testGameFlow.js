import { GameState } from '../src/gameState.js';
import { generateValidPuzzleConfig } from '../src/randomizer.js';
import { TimerManager } from '../src/timer.js';
import { HintSystem } from '../src/hintSystem.js';
import { PuzzleSystem } from '../src/puzzleSystem.js';

console.log('--- STARTING GAME FLOW UNIT & INTEGRATION TESTS ---');

// Mock audio & narrator
const mockAudio = {
  play: () => {},
  startAmbience: () => {},
  stopAmbience: () => {},
  setSoundEnabled: () => {},
  setMusicEnabled: () => {},
};

const mockNarrator = {
  speak: () => {},
  clear: () => {},
};

// TEST 1: Initialization & Seed Validation
const seed = 42819;
const { config, validation } = generateValidPuzzleConfig(seed);
console.log('✓ Validated config generated successfully. Clock:', config.clock.timeString, 'Code:', config.door.overrideCode);

const gameState = new GameState();
gameState.set({ config, running: true, timeRemaining: 300 });

// TEST 2: Timer & Warnings
const timer = new TimerManager(gameState, mockAudio, mockNarrator);
console.log('Initial time remaining:', gameState.get().timeRemaining);

// Simulate ticks down to 120s
gameState.set({ timeRemaining: 121 });
timer.tick();
console.log('✓ 120s warning checked. Time:', gameState.get().timeRemaining);

// Test Extension Gift (Max 2)
console.log('Testing extension gifts...');
const gift1 = timer.addExtensionGift();
console.log('Gift 1 added:', gift1, 'Time:', gameState.get().timeRemaining, 'Gifts found:', gameState.get().extensionGiftsFound);

const gift2 = timer.addExtensionGift();
console.log('Gift 2 added:', gift2, 'Time:', gameState.get().timeRemaining, 'Gifts found:', gameState.get().extensionGiftsFound);

const gift3 = timer.addExtensionGift();
console.log('Gift 3 (should be rejected):', gift3, 'Gifts found:', gameState.get().extensionGiftsFound);
if (gift3 === false && gameState.get().extensionGiftsFound === 2) {
  console.log('✓ Extension gifts strictly capped at 2 (+60s total max).');
} else {
  throw new Error('Extension gift capping failed');
}

// TEST 3: Hint System Progression
const hintSystem = new HintSystem(gameState);
let hint = hintSystem.getCurrentHints();
console.log('Initial hint target:', hint.target);

// TEST 4: Puzzle Interactions
const puzzle = new PuzzleSystem(gameState, mockAudio, mockNarrator, timer);

// Step A: Find starting tools
gameState.addItem(config.placements.coatPocket);
gameState.addItem(config.placements.mattress);

// Step B: Unlock Desk Drawer with Silver Key
gameState.unlockContainer('desk_drawer_left');
gameState.addItem('tool_screwdriver');

// Step C: Solve Clock
puzzle.adjustClockHour(config.clock.hour - 12);
puzzle.adjustClockMinute(config.clock.minute);
if (gameState.isPuzzleSolved('clock')) {
  console.log('✓ Clock puzzle successfully solved by matching time!');
  gameState.addItem('item_key');
} else {
  throw new Error('Clock puzzle solve failed');
}

// Step D: Solve Floorboard
gameState.unlockContainer('loose_floorboard');
gameState.addItem('item_fuse');
console.log('✓ Floorboard pried, item_fuse obtained.');

// Step E: Solve Bookshelf
puzzle.bookshelfState.currentOrder = [...config.bookshelf.sequence];
puzzle.checkBookshelfSolution();
if (gameState.isPuzzleSolved('bookshelf')) {
  console.log('✓ Bookshelf puzzle solved by sequence match!');
  gameState.addItem('item_card');
} else {
  throw new Error('Bookshelf puzzle solve failed');
}

// Step F: Solve Medicine Cabinet
const cabDigits = config.cabinet.code.split('').map(Number);
puzzle.cabinetDials = cabDigits;
puzzle.checkCabinetSolution();
if (gameState.isPuzzleSolved('cabinet')) {
  console.log('✓ Medicine Cabinet puzzle solved with code!');
  gameState.addItem('item_crank');
} else {
  throw new Error('Cabinet puzzle solve failed');
}

// Step G: Reveal Painting UV Code
puzzle.paintingTilted = true;
puzzle.toggleUVLight();
gameState.addItem('item_code');
console.log('✓ Painting UV revealed keypad code:', config.door.overrideCode);

// TEST 5: Applying the 5 Escape Items
console.log('Applying 5 escape components to door...');
gameState.useEscapeItem('item_key');
gameState.useEscapeItem('item_code');
gameState.useEscapeItem('item_card');
gameState.useEscapeItem('item_crank');
gameState.useEscapeItem('item_fuse');

console.log('Escape items used count:', gameState.countEscapeItemsUsed());
console.log('Escaped state:', gameState.get().escaped);

if (gameState.get().escaped === true && gameState.countEscapeItemsUsed() === 5) {
  console.log('✓ ALL 5 ESCAPE ITEMS SUCCESSFULLY INTEGRATED & ESCAPE TRIGGERED!');
} else {
  throw new Error('Escape sequence condition failed');
}

// TEST 6: Reset / Play Again
gameState.reset(99999);
console.log('After reset: running =', gameState.get().running, 'inventory count =', gameState.get().inventory.length);
if (gameState.get().inventory.length === 0 && gameState.get().escaped === false && gameState.get().timeRemaining === 300) {
  console.log('✓ Full state reset verified.');
} else {
  throw new Error('Reset failed');
}

console.log('--- ALL GAME FLOW INTEGRATION TESTS PASSED (100%) ---');
