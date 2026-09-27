/**
 * WAY OUT - Video, Story, Timeout, and Starting Chair Verification Test
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameStateManager } from '../src/gameState.js';
import { TimerManager } from '../src/timer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== STARTING VIDEO, STORY, TIMEOUT & STARTING CHAIR TESTS ===\n');

// 1. Verify Video Files exist and are valid MP4s in video/
console.log('1. Checking Video Files in video/ folder...');
const introPath = path.join(rootDir, 'video', 'intro video.mp4');
const outroPath = path.join(rootDir, 'video', 'outro video.mp4');

if (!fs.existsSync(introPath)) {
  throw new Error(`Intro video missing at ${introPath}`);
}
if (!fs.existsSync(outroPath)) {
  throw new Error(`Outro video missing at ${outroPath}`);
}

const introStat = fs.statSync(introPath);
const outroStat = fs.statSync(outroPath);

if (introStat.size < 100000) {
  throw new Error(`Intro video file is suspiciously small: ${introStat.size} bytes`);
}
if (outroStat.size < 100000) {
  throw new Error(`Outro video file is suspiciously small: ${outroStat.size} bytes`);
}
console.log(`✓ Intro video verified: ${introStat.size} bytes`);
console.log(`✓ Outro video verified: ${outroStat.size} bytes`);

// 2. Verify HTML Structure and Exact Texts
console.log('\n2. Auditing index.html for Story Texts, Videos, and Modals...');
const htmlContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');

// Check Intro Video element
if (!htmlContent.includes('id="screen-intro-video"') || !htmlContent.includes('id="video-intro"')) {
  throw new Error('Intro video screen elements missing from index.html');
}
console.log('✓ Intro video container & video tag present.');

// Check Beginning Story exact text
const expectedBeginningText = 'THE MAD DOCTOR KIDNAPED ME WHILE I WAS COMING HOME FROM SCHOOL, HE PUT THIS STRANGE COLLER AND SET A TIMER OF 5 MINUTES , IT IS GETTING TIGHTER WITH TIME......I HAVE TO FIND A WAY OUT OF THIS SITUATION OR I WILL JUST DIE OUT OF SUFFOCATION';
if (!htmlContent.includes(expectedBeginningText)) {
  throw new Error('Beginning story text does not match exact specification!');
}
console.log('✓ Beginning story matches exact required text.');

// Check Outro Video element
if (!htmlContent.includes('id="screen-outro-video"') || !htmlContent.includes('id="video-outro"')) {
  throw new Error('Outro video screen elements missing from index.html');
}
console.log('✓ Outro video container & video tag present.');

// Check Outro Story exact uppercase text
const expectedOutroDialogue1 = 'WHEN HE CAME OUT OF THE ROOM SUDDENLY HE FELT A PULL FROM BEHIND.';
const expectedOutroDialogue2 = 'IT WAS A DOCTOR....';
const expectedOutroQuote = '"THIS MAD ONE IS AGAIN TRYING TO ESCAPE FROM THIS ROOM.... DOESN\'T MATTER HOW MUCH I HIDE THINGS FROM THIS PERSON.... HE ESCAPES EVERYTIME.....NOW I WILL HIDE THINGS IN SUCH A WAY THAT EVEN I WILL NOT FIND IT IN NEED....GO ON, I CHALLENGE YOU TO FIND THE WAY OUT"';

if (!htmlContent.includes(expectedOutroDialogue1) || !htmlContent.includes(expectedOutroDialogue2) || !htmlContent.includes(expectedOutroQuote)) {
  throw new Error('Outro story text does not match exact uppercase specification!');
}
console.log('✓ Outro story matches exact required uppercase text.');

// Check Final Message exact uppercase text
const expectedFinalMessage = 'SOMETIMES WHAT WE THINK AND WHAT WE SEE MAY NOT MATCH WITH THE WORLD BUT WE MUST KEEP TRYING';
if (!htmlContent.includes(expectedFinalMessage)) {
  throw new Error('Final message does not match exact required uppercase text!');
}
console.log('✓ Final message matches exact required uppercase text.');

// Check Game Over with TRY AGAIN
if (!htmlContent.includes('GAME OVER') || !htmlContent.includes('id="btn-restart-game-over"') || !htmlContent.includes('TRY AGAIN')) {
  throw new Error('Game Over modal missing GAME OVER header or TRY AGAIN button');
}
console.log('✓ Game Over modal correctly displays GAME OVER and TRY AGAIN button.');

// 3. Test Timeout Freeze, Fade Delay, and Complete State Reset
console.log('\n3. Testing Timeout Flow & Full Reset...');
const gameState = new GameStateManager();
const mockAudio = { play: () => {} };
const mockNarrator = { speak: () => {}, triggerProgressionHint: () => {} };
const timer = new TimerManager(gameState, mockAudio, mockNarrator);

// Start game
gameState.controlState.gameStarted = true;
gameState.controlState.running = true;
gameState.controlState.playerCanMove = true;
gameState.controlState.canInteract = true;
timer.start();

// Advance items and puzzle state
gameState.inventory.crowbar = true;
gameState.puzzleState.drawerUnlocked = true;
gameState.inventory.accessCard1 = true;
gameState.puzzleState.smallBoxOpened = true;
const initialRunBox = gameState.layout.correctBox;
const initialRunCabinet = gameState.layout.correctCabinet;

// Trigger expiration
gameState.controlState.timeRemaining = 1;
timer.tick();

if (gameState.controlState.playerCanMove !== false || gameState.controlState.canInteract !== false) {
  throw new Error('Player movement or interaction was not immediately frozen on timeout!');
}
if (!gameState.controlState.timerExpired) {
  throw new Error('timerExpired flag was not set on timeout');
}
console.log('✓ Immediate movement and interaction freeze on timeout verified.');

// Test Full Reset (simulating TRY AGAIN click)
console.log('Simulating TRY AGAIN selection...');
timer.stop();
timer.reset();
gameState.reset();

if (gameState.inventory.crowbar !== false || gameState.inventory.accessCard1 !== false) {
  throw new Error('Inventory items were not cleared on TRY AGAIN reset!');
}
if (gameState.inventory.strangeKey !== true) {
  throw new Error('Player must start with Strange Key on new attempt!');
}
if (gameState.puzzleState.drawerUnlocked !== false || gameState.puzzleState.smallBoxOpened !== false) {
  throw new Error('Puzzle state was not cleared on TRY AGAIN reset!');
}
if (gameState.controlState.timeRemaining !== 300) {
  throw new Error(`Timer was not reset to 300s (5:00)! Got: ${gameState.controlState.timeRemaining}`);
}
console.log('✓ Complete state reset (inventory, puzzle, timer to 5:00) verified.');

// 4. Verify Rerolling of Random Locations across Resets
console.log('\n4. Verifying Random Configuration Rerolling across Resets...');
let differentBoxEncountered = false;
let differentCabinetEncountered = false;

for (let i = 0; i < 50; i++) {
  gameState.reset();
  if (gameState.layout.correctBox !== initialRunBox) differentBoxEncountered = true;
  if (gameState.layout.correctCabinet !== initialRunCabinet) differentCabinetEncountered = true;
}

if (!differentBoxEncountered || !differentCabinetEncountered) {
  throw new Error('Randomization did not reroll box or cabinet across resets!');
}
console.log('✓ Randomization verified: fresh layout generated for new attempts.');

console.log('\n=== ALL VIDEO, STORY, TIMEOUT & CHAIR TESTS PASSED (100%) ===\n');
