import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf8');
const idMatches = [...html.matchAll(/id=["']([^"']+)["']/g)].map(m => m[1]);
const htmlIds = new Set(idMatches);

const jsFiles = [
  'src/game.js',
  'src/gameState.js',
  'src/inventory.js',
  'src/narratorChatbot.js',
  'src/interactionManager.js',
  'src/room3d.js',
  'src/cameraController.js',
  'src/timer.js',
  'src/audio.js'
];

const missing = [];
for (const file of jsFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const jsIdMatches = [...content.matchAll(/getElementById\(['"]([^'"]+)['"]/g)].map(m => m[1]);
  for (const id of jsIdMatches) {
    if (!htmlIds.has(id)) {
      missing.push({ file, id });
    }
  }
}

console.log('Checked', jsFiles.length, 'files. Total IDs defined in HTML:', htmlIds.size);
if (missing.length === 0) {
  console.log('ALL getElementById references match HTML elements 100%!');
} else {
  console.log('Missing IDs found:', missing);
  process.exit(1);
}
