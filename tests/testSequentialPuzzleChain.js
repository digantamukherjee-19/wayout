/**
 * WAY OUT - Automated Unit & Integration Tests for Randomized Sequential Puzzle Rules
 * Tests:
 * 1. Automatic item collection upon opening containers.
 * 2. Strict non-consumption of required items.
 * 3. Prevention of double-pickups and duplicate cards.
 * 4. Locked object feedback messages.
 * 5. Randomized Access Card #1 across 3 Small Boxes.
 * 6. Randomized Access Card #2 across 2 Cabinets (Correct vs Misleading).
 * 7. Verification across multiple runs that layout changes between games but stays fixed during a game.
 */

import { GameStateManager } from '../src/gameState.js';

console.log('=== RUNNING RANDOMIZED SEQUENTIAL PUZZLE & AUTO-PICKUP TESTS ===\n');

const gameState = new GameStateManager();

// 1. Initial State Assertions
console.log('1. Checking Initial Inventory...');
if (gameState.inventory.strangeKey !== true) {
  throw new Error('Player must start with strangeKey === true!');
}
if (gameState.inventory.crowbar !== false || gameState.inventory.cabinetKey !== false) {
  throw new Error('Other items must be false at start');
}
console.log('✓ Player starts with Strange Key in inventory.');

// 2. Misleading Cabinet Initial Interaction
console.log('2. Testing Misleading Cabinet Interaction...');
const misleadingCabId = gameState.layout.misleadingCabinet;
const misRes = gameState.tryInteractCabinet(misleadingCabId);
if (misRes.success !== false || misRes.message !== 'Not the perfect key.') {
  throw new Error(`Expected "Not the perfect key.", got "${misRes.message}"`);
}
if (gameState.puzzleState.cabinetUnlocked !== false || gameState.inventory.accessCard2 !== false) {
  throw new Error('Misleading cabinet must NEVER unlock or award accessCard2!');
}
console.log(`✓ Misleading cabinet (${misleadingCabId}) returns "Not the perfect key." and remains closed.`);

// 2b. Locked feedback when no key
console.log('2b. Testing Locked Drawer Feedback...');
const lockedState = new GameStateManager();
lockedState.inventory.strangeKey = false;
const lockedDrawerRes = lockedState.tryUnlockDrawer('drawer_1');
if (lockedDrawerRes.success !== false || lockedDrawerRes.message !== "It's locked.") {
  throw new Error(`Expected "It's locked.", got "${lockedDrawerRes.message}"`);
}
console.log('✓ Locked drawer feedback verified: "It\'s locked."');

// 3. Desk Drawer Unlocking -> Automatic Crowbar Pickup
console.log('3. Testing Desk Drawer & Automatic Crowbar Pickup...');
// Try wrong drawer (clutter)
const clutterRes = gameState.tryUnlockDrawer('drawer_2');
if (clutterRes.success !== false || clutterRes.reason !== 'clutter') {
  throw new Error('Drawer 2 must contain environmental clutter');
}

// Unlock correct drawer with Strange Key
let collectedEventItem = null;
gameState.on('itemCollected', ({ name }) => { collectedEventItem = name; });

const unlockRes = gameState.tryUnlockDrawer('drawer_1');
if (!unlockRes.success || !gameState.puzzleState.drawerUnlocked) {
  throw new Error('Drawer 1 failed to unlock with Strange Key');
}

// AUTOMATIC PICKUP CHECK: Crowbar MUST be collected automatically!
if (gameState.inventory.crowbar !== true) {
  throw new Error('Crowbar was not automatically added to inventory on drawer opening!');
}
if (unlockRes.itemName !== 'CROWBAR' || collectedEventItem !== 'CROWBAR') {
  throw new Error('CROWBAR pickup event or response data missing');
}
// NON-CONSUMPTION CHECK: Strange Key MUST REMAIN in inventory!
if (gameState.inventory.strangeKey !== true) {
  throw new Error('Strange Key was removed from inventory! It must NEVER be consumed.');
}
console.log('✓ Drawer 1 unlocked. Crowbar automatically collected. Strange Key remains in inventory.');

// Test double-pickup prevention on drawer
const reDrawer = gameState.tryUnlockDrawer('drawer_1');
if (!reDrawer.already) {
  throw new Error('Re-interacting with opened drawer did not flag already open');
}
console.log('✓ Re-interacting with drawer does not duplicate pickup.');

// 4. Small Boxes: Randomized Access Card #1
console.log('4. Testing Small Boxes & Randomized Access Card #1 Pickup...');
const allBoxes = ['box_1', 'box_2', 'box_3'];
const correctBox = gameState.layout.correctBox;
const incorrectBoxes = allBoxes.filter(b => b !== correctBox);

// Test locked feedback without crowbar
const noCrowbarState = new GameStateManager();
const lockedBoxRes = noCrowbarState.tryOpenSmallBox(correctBox);
if (lockedBoxRes.success !== false || lockedBoxRes.message !== 'I need something strong enough to open this.') {
  throw new Error(`Expected "I need something strong enough to open this.", got "${lockedBoxRes.message}"`);
}
console.log('✓ Locked box feedback verified: "I need something strong enough to open this."');

// Open an incorrect box first with Crowbar
const wrongBox = incorrectBoxes[0];
const wrongBoxRes = gameState.tryOpenSmallBox(wrongBox);
if (!wrongBoxRes.success || wrongBoxRes.isCorrect !== false) {
  throw new Error('Incorrect box should open with isCorrect: false');
}
if (gameState.inventory.accessCard1 !== false) {
  throw new Error('Incorrect box must NOT award Access Card #1!');
}
console.log(`✓ Incorrect box (${wrongBox}) pried open with Crowbar -> Harmless clutter, no card awarded.`);

// Re-opening incorrect box
const reWrongRes = gameState.tryOpenSmallBox(wrongBox);
if (!reWrongRes.already) {
  throw new Error('Re-opening opened box did not flag already open');
}

// Open the randomized correct small box
const correctBoxRes = gameState.tryOpenSmallBox(correctBox);
if (!correctBoxRes.success || !correctBoxRes.isCorrect || !gameState.puzzleState.smallBoxOpened) {
  throw new Error(`Correct small box (${correctBox}) failed to open with Crowbar`);
}

// AUTOMATIC PICKUP CHECK: Access Card #1 MUST be collected automatically!
if (gameState.inventory.accessCard1 !== true) {
  throw new Error('Access Card #1 was not automatically added to inventory on correct box opening!');
}
// NON-CONSUMPTION CHECK: Crowbar MUST REMAIN in inventory!
if (gameState.inventory.crowbar !== true) {
  throw new Error('Crowbar was removed from inventory! It must NEVER be consumed.');
}
console.log(`✓ Correct box (${correctBox}) opened -> Access Card #1 automatically added. Crowbar retained.`);

// Open the other incorrect box after getting card -> Must not award duplicate card!
const otherWrongBox = incorrectBoxes[1];
const otherWrongRes = gameState.tryOpenSmallBox(otherWrongBox);
if (!otherWrongRes.success || otherWrongRes.isCorrect !== false || otherWrongRes.itemCollected) {
  throw new Error('Second incorrect box must not award duplicate item!');
}
console.log('✓ Subsequent boxes opened do not yield duplicate cards.');

// 5. Carpet -> Compartment -> Automatic Phone Pickup
console.log('5. Testing Carpet & Phone Clue...');
const carpetRes = gameState.interactCarpet();
if (!carpetRes.revealed || !gameState.puzzleState.carpetRevealed) {
  throw new Error('Carpet failed to reveal');
}

const phoneTime = gameState.examinePhone();
if (phoneTime !== '11:11 PM') {
  throw new Error('Phone must display 11:11 PM');
}
console.log('✓ Phone examined and displays 11:11 PM.');

// 6. Exit Door Lock 1 (PIN 1111) -> Automatic Cabinet Key Pickup
console.log('6. Testing Exit Door Section 1 (PIN 1111) & Automatic Cabinet Key...');
const badPin = gameState.tryDoorPin('0000');
if (badPin.success !== false) {
  throw new Error('Incorrect PIN should be rejected');
}

const goodPin = gameState.tryDoorPin('1111');
if (!goodPin.success || !gameState.puzzleState.firstLockUnlocked) {
  throw new Error('PIN 1111 failed to unlock Lock 1');
}

// AUTOMATIC PICKUP CHECK: Cabinet Key MUST be collected automatically!
if (gameState.inventory.cabinetKey !== true) {
  throw new Error('Cabinet Key was not awarded upon entering 1111');
}
if (!gameState.inventory.strangeKey || !gameState.inventory.crowbar || !gameState.inventory.accessCard1) {
  throw new Error('Previous items were lost after entering PIN 1111');
}
console.log('✓ PIN 1111 unlocked Lock 1. Cabinet Key automatically awarded. All previous items retained.');

// 7. Cabinets: Randomized Correct vs Misleading
console.log('7. Testing Randomized Cabinets & Automatic Access Card #2 Pickup...');
const correctCabId = gameState.layout.correctCabinet;
console.log(`  Current run layout: correctCabinet = "${correctCabId}", misleadingCabinet = "${misleadingCabId}"`);

// Locked feedback check on correct cabinet without cabinet key
const noCabKeyState = new GameStateManager();
noCabKeyState.puzzleState.firstLockUnlocked = true;
const lockedCabRes = noCabKeyState.tryInteractCabinet(noCabKeyState.layout.correctCabinet);
if (lockedCabRes.success !== false || lockedCabRes.message !== "It's locked.") {
  throw new Error(`Expected "It's locked.", got "${lockedCabRes.message}"`);
}
console.log('✓ Locked cabinet feedback on correct cabinet verified: "It\'s locked."');

// Misleading cabinet with key still returns "Not the perfect key."
const misWithKeyRes = gameState.tryInteractCabinet(misleadingCabId);
if (misWithKeyRes.success !== false || misWithKeyRes.message !== 'Not the perfect key.') {
  throw new Error(`Misleading cabinet must return "Not the perfect key.", got "${misWithKeyRes.message}"`);
}
console.log('✓ Misleading cabinet with Cabinet Key still replies "Not the perfect key." and remains closed.');

// Open correct cabinet with Cabinet Key & Lock 1 progression
const cabRes = gameState.tryInteractCabinet(correctCabId);
if (!cabRes.success || !gameState.puzzleState.cabinetUnlocked) {
  throw new Error(`Correct cabinet (${correctCabId}) failed to unlock with Cabinet Key & Lock 1 unlocked`);
}

// AUTOMATIC PICKUP CHECK: Access Card #2 MUST be collected automatically!
if (gameState.inventory.accessCard2 !== true) {
  throw new Error('Access Card #2 was not automatically added to inventory on cabinet opening!');
}
// NON-CONSUMPTION CHECK: Cabinet Key MUST REMAIN in inventory!
if (gameState.inventory.cabinetKey !== true) {
  throw new Error('Cabinet Key was removed from inventory! It must NEVER be consumed.');
}
console.log(`✓ Correct cabinet (${correctCabId}) unlocked -> Access Card #2 automatically collected. Cabinet Key retained.`);

// 8. Door Section 2 (Access Card #2) & Escape
console.log('8. Testing Door Section 2 (Access Card #2) & Final Escape...');
// Final door locked feedback without card
const noCardState = new GameStateManager();
const lockedDoorRes = noCardState.tryDoorAccessCard();
if (lockedDoorRes.success !== false || lockedDoorRes.message !== 'The final lock is still secured.') {
  throw new Error(`Expected "The final lock is still secured.", got "${lockedDoorRes.message}"`);
}
console.log('✓ Locked final door feedback verified: "The final lock is still secured."');

const cardRes = gameState.tryDoorAccessCard();
if (!cardRes.success || !gameState.puzzleState.finalLockUnlocked) {
  throw new Error('Access Card #2 failed to unlock Final Door Lock');
}

// NON-CONSUMPTION CHECK: Access Card #2 MUST REMAIN in inventory!
if (gameState.inventory.accessCard2 !== true) {
  throw new Error('Access Card #2 was removed from inventory! It must NEVER be consumed.');
}
console.log('✓ Final Lock unlocked. Access Card #2 remains in inventory.');

// Final escape trigger
const escapeRes = gameState.tryEscapeDoor();
if (!escapeRes.success || !gameState.puzzleState.escaped) {
  throw new Error('Escape door failed to open');
}
console.log('✓ Door physically opened. Escaped state confirmed.');

// 9. Final Inventory Check: ALL 6 ITEMS STILL PRESENT!
console.log('9. Checking Final Inventory Integrity...');
const expectedItems = ['strangeKey', 'crowbar', 'accessCard1', 'phone', 'cabinetKey', 'accessCard2'];
for (const item of expectedItems) {
  if (gameState.inventory[item] !== true) {
    throw new Error(`Item "${item}" was not retained in final inventory!`);
  }
}
console.log('✓ All 6 items permanently retained in inventory at game completion:');
console.log(' ', gameState.inventory);

// 10. Multi-Run Randomization & Stability Verification across 100 Runs
console.log('10. Testing Randomization Distribution across 100 Runs...');
const boxCounts = { box_1: 0, box_2: 0, box_3: 0 };
const cabCounts = { cabinet: 0, brown_cabinet: 0 };

for (let i = 0; i < 100; i++) {
  const g = new GameStateManager();
  const b = g.layout.correctBox;
  const c = g.layout.correctCabinet;
  if (!boxCounts.hasOwnProperty(b)) throw new Error(`Invalid box selected: ${b}`);
  if (!cabCounts.hasOwnProperty(c)) throw new Error(`Invalid cabinet selected: ${c}`);
  boxCounts[b]++;
  cabCounts[c]++;
}

console.log('  100-run box distribution:', boxCounts);
console.log('  100-run cabinet distribution:', cabCounts);

if (boxCounts.box_1 === 0 || boxCounts.box_2 === 0 || boxCounts.box_3 === 0) {
  throw new Error('Randomization did not cover all 3 small boxes!');
}
if (cabCounts.cabinet === 0 || cabCounts.brown_cabinet === 0) {
  throw new Error('Randomization did not cover both cabinets!');
}
console.log('✓ Randomization verified: all 3 boxes and both cabinets are dynamically selected across runs.');

console.log('\n=== ALL RANDOMIZED SPECIFICATION TESTS PASSED (100%) ===');
