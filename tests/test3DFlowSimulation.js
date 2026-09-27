/**
 * WAY OUT - Comprehensive End-to-End Simulation Test for 3D Game Flow & UI Requirements
 */

import { GameStateManager } from '../src/gameState.js';
import { TimerManager } from '../src/timer.js';
import { ITEM_DEFS } from '../src/inventory.js';

console.log('=== STARTING 3D ESCAPE ROOM COMPREHENSIVE FLOW SIMULATION ===\n');

// 1. Check Item Definitions for clean icons and descriptions
console.log('1. Validating Item Definitions and Display Attributes...');
const requiredItemKeys = ['strangeKey', 'crowbar', 'accessCard1', 'phone', 'cabinetKey', 'accessCard2'];
for (const key of requiredItemKeys) {
  const def = ITEM_DEFS[key];
  if (!def || !def.name || !def.shortLabel || !def.iconSvg || !def.desc) {
    throw new Error(`Item definition for "${key}" is incomplete!`);
  }
}
console.log('✓ All 6 items have valid definitions, clean monochrome SVG icons, and descriptions.');

// 2. Initial Setup
console.log('2. Testing Initial Startup State...');
const gameState = new GameStateManager();
const mockAudio = { play: (name) => { collectedSounds.push(name); } };
const mockNarrator = {
  speak: (text) => { narratorLogs.push(text); },
  triggerProgressionHint: (stage) => { hintLogs.push(stage); }
};

const collectedSounds = [];
const narratorLogs = [];
const hintLogs = [];

if (gameState.inventory.strangeKey !== true) {
  throw new Error('Strange Key must start in inventory');
}
if (gameState.controlState.playerCanMove || gameState.controlState.canInteract) {
  throw new Error('Player must not be able to move or interact before game starts');
}
console.log('✓ Initial state verified: player has Strange Key, gameplay frozen until START GAME.');

// 3. Start Gameplay
console.log('3. Simulating START GAME Click...');
gameState.controlState.gameStarted = true;
gameState.controlState.running = true;
gameState.controlState.playerCanMove = true;
gameState.controlState.canInteract = true;

const timer = new TimerManager(gameState, mockAudio, mockNarrator);
timer.start();
console.log('✓ Game active. Timer started at:', timer.format(gameState.controlState.timeRemaining));

// 3b. Randomized Misleading Cabinet Interaction
const misleadingCab = gameState.layout.misleadingCabinet;
const correctCab = gameState.layout.correctCabinet;
console.log(`3b. Simulating Misleading Cabinet Interaction (${misleadingCab})...`);
const misleadRes = gameState.tryInteractCabinet(misleadingCab);
if (misleadRes.success !== false || misleadRes.message !== 'Not the perfect key.') {
  throw new Error(`Expected "Not the perfect key.", got "${misleadRes.message}"`);
}
console.log(`✓ Misleading Cabinet (${misleadingCab}) selected -> Returns "Not the perfect key.", remains closed.`);

// 4. Drawer & Automatic Crowbar Pickup
console.log('4. Simulating Drawer Interaction...');
const dRes = gameState.tryUnlockDrawer('drawer_1');
if (!dRes.success || gameState.inventory.crowbar !== true) {
  throw new Error('Crowbar was not automatically added to inventory on unlocking drawer');
}
if (gameState.inventory.strangeKey !== true) {
  throw new Error('Strange Key was consumed! Must remain in inventory.');
}
console.log('✓ Drawer unlocked -> Crowbar automatically in inventory. Strange Key retained.');

// 5. Small Box & Automatic Access Card #1 Pickup (Randomized Box)
const correctBox = gameState.layout.correctBox;
console.log(`5. Simulating Small Box Opening (${correctBox})...`);
const bRes = gameState.tryOpenSmallBox(correctBox);
if (!bRes.success || gameState.inventory.accessCard1 !== true) {
  throw new Error('Access Card #1 was not automatically added to inventory on box opening');
}
if (gameState.inventory.crowbar !== true) {
  throw new Error('Crowbar was consumed! Must remain in inventory.');
}
console.log(`✓ Small Box (${correctBox}) pried open -> Access Card #1 automatically in inventory. Crowbar retained.`);

// 6. Carpet & Compartment & Automatic Phone Pickup
console.log('6. Simulating Carpet & Floor Compartment...');
gameState.interactCarpet();
const cRes = gameState.openCompartment();
if (!cRes.success || gameState.inventory.phone !== true || gameState.puzzleState.phoneFound !== true) {
  throw new Error('Phone was not automatically added to inventory on opening compartment');
}
const timeClue = gameState.examinePhone();
if (timeClue !== '11:11 PM') {
  throw new Error('Phone clue must read 11:11 PM');
}
console.log('✓ Floor compartment opened -> Phone automatically in inventory. Phone reveals 11:11 PM.');

// 7. Door Lock 1 (PIN 1111) & Automatic Cabinet Key Pickup
console.log('7. Simulating Keypad Entry 1111...');
const pinRes = gameState.tryDoorPin('1111');
if (!pinRes.success || gameState.inventory.cabinetKey !== true || !gameState.puzzleState.firstLockUnlocked) {
  throw new Error('Cabinet Key was not automatically awarded on PIN 1111');
}
console.log('✓ Lock 1 unlocked -> Cabinet Key automatically in inventory. Previous items retained.');

// 8. Cabinet & Automatic Access Card #2 Pickup (Randomized Cabinet)
console.log(`8. Simulating Correct Cabinet Unlocking (${correctCab})...`);
const cabRes = gameState.tryInteractCabinet(correctCab);
if (!cabRes.success || gameState.inventory.accessCard2 !== true || !gameState.puzzleState.cabinetUnlocked) {
  throw new Error('Access Card #2 was not automatically added to inventory on unlocking cabinet');
}
if (gameState.inventory.cabinetKey !== true) {
  throw new Error('Cabinet Key was consumed! Must remain in inventory.');
}
console.log(`✓ Cabinet (${correctCab}) unlocked -> Access Card #2 automatically in inventory. Cabinet Key retained.`);

// 9. Door Lock 2 (Access Card #2) & Escape
console.log('9. Simulating Final Door Lock & Escape...');
const cardRes = gameState.tryDoorAccessCard();
if (!cardRes.success || !gameState.puzzleState.finalLockUnlocked) {
  throw new Error('Final door lock failed to unlock with Access Card #2');
}
if (gameState.inventory.accessCard2 !== true) {
  throw new Error('Access Card #2 was consumed! Must remain in inventory.');
}

const escRes = gameState.tryEscapeDoor();
if (!escRes.success || !gameState.puzzleState.escaped) {
  throw new Error('Final escape failed');
}
console.log('✓ Final Lock unlocked -> Door physically opened -> Escaped successfully!');

// 10. Complete Inventory Integrity Check
console.log('10. Verifying Complete Inventory Non-Consumption Integrity...');
const finalInv = gameState.inventory;
console.log('Final Inventory State:', finalInv);
for (const k of requiredItemKeys) {
  if (finalInv[k] !== true) {
    throw new Error(`Item ${k} missing from final inventory!`);
  }
}
console.log('✓ All 6 items permanently in inventory.');

// 11. Timer Warnings Simulation
console.log('11. Testing Timer Warnings...');
timer.warnings[30] = false;
timer.checkWarnings(30);
if (!timer.warnings[30]) {
  throw new Error('Timer warning at 30 seconds failed to trigger');
}
timer.warnings[10] = false;
timer.checkWarnings(10);
if (!timer.warnings[10]) {
  throw new Error('Timer warning at 10 seconds failed to trigger');
}
console.log('✓ Timer warning triggers at 00:30 and 00:10 verified.');

timer.stop();

console.log('\n=== COMPREHENSIVE SIMULATION PASSED 100% ===');
