import { generateValidPuzzleConfig, validatePuzzleConfig, generatePuzzleConfig } from '../src/randomizer.js';

console.log('Testing Randomizer and Puzzle Validator across 200 random seeds...');

let totalTested = 200;
let passed = 0;
let failed = 0;
let giftCountDistribution = { 0: 0, 1: 0, 2: 0 };

for (let i = 0; i < totalTested; i++) {
  const seed = Math.floor(Math.random() * 1000000);
  const { config, validation } = generateValidPuzzleConfig(seed);

  if (validation.valid && validation.all5EscapeItemsDiscovered && validation.doorFullyUnlocked) {
    passed++;
    giftCountDistribution[config.gifts.totalGifts] = (giftCountDistribution[config.gifts.totalGifts] || 0) + 1;
  } else {
    failed++;
    console.error(`Validation failed on seed ${seed}:`, validation);
  }
}

console.log(`Results: ${passed}/${totalTested} valid configurations verified!`);
console.log('Gift distribution across test runs:', giftCountDistribution);

if (failed === 0) {
  console.log('ALL PUZZLE VALIDATION TESTS PASSED 100%!');
} else {
  process.exit(1);
}
