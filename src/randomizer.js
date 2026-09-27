/**
 * WAY OUT - Randomizer and Puzzle Configuration Generator
 * Includes Mulberry32 PRNG and an automated graph reachability validator.
 */

// Mulberry32 Seeded Pseudo-Random Number Generator
export function createRNG(seed) {
  let s = Math.floor(seed) >>> 0;
  return function () {
    s |= 0;
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function rngPick(rng, array) {
  return array[Math.floor(rng() * array.length)];
}

export function rngShuffle(rng, array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generates a full puzzle configuration based on a random seed.
 */
export function generatePuzzleConfig(seed) {
  const rng = createRNG(seed);

  // 1. Clock time puzzle: Hour (1-12) and minute (0, 15, 20, 25, 30, 40, 45)
  const candidateHours = [2, 3, 4, 7, 8, 9, 10, 11];
  const candidateMinutes = [15, 20, 25, 30, 35, 40, 45];
  const clockHour = rngPick(rng, candidateHours);
  const clockMinute = rngPick(rng, candidateMinutes);
  const clockTimeString = `${String(clockHour).padStart(2, '0')}:${String(clockMinute).padStart(2, '0')}`;

  // 2. Door Keypad 4-digit code (revealed via UV light behind painting)
  // Ensure 4 distinct digits
  const digitPool = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const shuffledDigits = rngShuffle(rng, digitPool);
  const doorCode = shuffledDigits.slice(0, 4).join('');

  // 3. Bookshelf 4-book sequence
  const bookColors = ['Red', 'Blue', 'Green', 'Gold'];
  const bookSequence = rngShuffle(rng, bookColors);

  // 4. Medicine Cabinet 3-digit combination code (from Patient chart / Prescription note)
  const cabDigitPool = [2, 3, 4, 5, 6, 7, 8, 9];
  const shuffledCabDigits = rngShuffle(rng, cabDigitPool);
  const cabinetCode = shuffledCabDigits.slice(0, 3).join('');

  // 5. Item placement randomization
  // Key items: key_small_silver and tool_uv_pen
  // Candidate hiding spots:
  // Spot A: Doctor's coat pocket
  // Spot B: Under bed mattress corner
  const swapStartingTools = rng() > 0.5;
  const coatPocketItem = swapStartingTools ? 'key_small_silver' : 'tool_uv_pen';
  const mattressItem = swapStartingTools ? 'tool_uv_pen' : 'key_small_silver';

  // 6. Luck-based Time Extension Gifts (+30s each, max 2 gifts)
  // Gift 1: 35% chance to appear in desk hollow secret compartment
  const gift1Roll = rng();
  const hasGift1 = gift1Roll < 0.35;

  // Gift 2: 25% chance to appear inside hollow book on the bookshelf
  const gift2Roll = rng();
  const hasGift2 = gift2Roll < 0.25;

  const config = {
    seed,
    clock: {
      hour: clockHour,
      minute: clockMinute,
      timeString: clockTimeString,
    },
    door: {
      overrideCode: doorCode,
    },
    bookshelf: {
      sequence: bookSequence,
      initialOrder: rngShuffle(rng, bookColors),
    },
    cabinet: {
      code: cabinetCode,
    },
    placements: {
      coatPocket: coatPocketItem,
      mattress: mattressItem,
      deskDrawer: 'tool_screwdriver', // Unlocked by key_small_silver
      floorboard: 'item_fuse',        // Pried by tool_screwdriver
      clockCompartment: 'item_key',   // Unlocked by setting clock hands
      bookshelfCompartment: 'item_card', // Unlocked by book sequence
      cabinetCompartment: 'item_crank',  // Unlocked by 3-digit tumbler
      paintingUV: 'item_code',           // Discovered using tool_uv_pen
    },
    gifts: {
      deskCompartment: hasGift1,
      hollowBook: hasGift2,
      totalGifts: (hasGift1 ? 1 : 0) + (hasGift2 ? 1 : 0),
    }
  };

  return config;
}

/**
 * Graph Reachability Validator
 * Simulates an optimal playthrough to ensure every puzzle is solvable,
 * all 5 escape items are reachable, and no circular deadlock or impossible state exists.
 */
export function validatePuzzleConfig(config) {
  const inventory = new Set();
  const discoveredClues = new Set();
  const solvedPuzzles = new Set();
  const usedEscapeItems = new Set();

  let steps = 0;
  const maxSteps = 20;
  let progressMade = true;

  while (progressMade && steps < maxSteps) {
    progressMade = false;
    steps++;

    // Step 1: Starting items reachable from room surfaces
    if (!inventory.has(config.placements.coatPocket)) {
      inventory.add(config.placements.coatPocket);
      progressMade = true;
    }

    if (!inventory.has(config.placements.mattress)) {
      inventory.add(config.placements.mattress);
      progressMade = true;
    }

    // Step 2: Desk notebook clues readable from desk inspection
    if (!discoveredClues.has('accident_time')) {
      discoveredClues.add('accident_time'); // Reveals config.clock.timeString
      discoveredClues.add('book_sequence'); // Reveals config.bookshelf.sequence
      discoveredClues.add('patient_chart'); // Reveals config.cabinet.code
      progressMade = true;
    }

    // Step 3: Clock puzzle
    if (discoveredClues.has('accident_time') && !solvedPuzzles.has('clock')) {
      solvedPuzzles.add('clock');
      inventory.add(config.placements.clockCompartment); // item_key
      progressMade = true;
    }

    // Step 4: Desk drawer
    if (inventory.has('key_small_silver') && !solvedPuzzles.has('desk_drawer')) {
      solvedPuzzles.add('desk_drawer');
      inventory.add(config.placements.deskDrawer); // tool_screwdriver
      progressMade = true;
    }

    // Step 5: Loose floorboard
    if (inventory.has('tool_screwdriver') && !solvedPuzzles.has('floorboard')) {
      solvedPuzzles.add('floorboard');
      inventory.add(config.placements.floorboard); // item_fuse
      progressMade = true;
    }

    // Step 6: Bookshelf puzzle
    if (discoveredClues.has('book_sequence') && !solvedPuzzles.has('bookshelf')) {
      solvedPuzzles.add('bookshelf');
      inventory.add(config.placements.bookshelfCompartment); // item_card
      progressMade = true;
    }

    // Step 7: Medicine Cabinet puzzle
    if (discoveredClues.has('patient_chart') && !solvedPuzzles.has('cabinet')) {
      solvedPuzzles.add('cabinet');
      inventory.add(config.placements.cabinetCompartment); // item_crank
      progressMade = true;
    }

    // Step 8: Painting UV clue & code
    if (inventory.has('tool_uv_pen') && !solvedPuzzles.has('painting_uv')) {
      solvedPuzzles.add('painting_uv');
      inventory.add(config.placements.paintingUV); // item_code
      progressMade = true;
    }

    // Step 9: Using the 5 escape items on the exit door
    if (inventory.has('item_key') && !usedEscapeItems.has('item_key')) {
      usedEscapeItems.add('item_key');
      progressMade = true;
    }
    if (inventory.has('item_code') && !usedEscapeItems.has('item_code')) {
      usedEscapeItems.add('item_code');
      progressMade = true;
    }
    if (inventory.has('item_card') && !usedEscapeItems.has('item_card')) {
      usedEscapeItems.add('item_card');
      progressMade = true;
    }
    if (inventory.has('item_crank') && !usedEscapeItems.has('item_crank')) {
      usedEscapeItems.add('item_crank');
      progressMade = true;
    }
    if (inventory.has('item_fuse') && !usedEscapeItems.has('item_fuse')) {
      usedEscapeItems.add('item_fuse');
      progressMade = true;
    }
  }

  const all5EscapeItemsDiscovered =
    inventory.has('item_key') &&
    inventory.has('item_code') &&
    inventory.has('item_card') &&
    inventory.has('item_crank') &&
    inventory.has('item_fuse');

  const doorFullyUnlocked = usedEscapeItems.size === 5;
  const giftsValid = config.gifts.totalGifts <= 2;

  const isValid = all5EscapeItemsDiscovered && doorFullyUnlocked && giftsValid;

  return {
    valid: isValid,
    stepsTaken: steps,
    all5EscapeItemsDiscovered,
    doorFullyUnlocked,
    giftsValid,
    usedEscapeItems: Array.from(usedEscapeItems),
    inventoryCount: inventory.size,
  };
}

/**
 * Generates a guaranteed valid configuration.
 * If validation fails, re-rolls with seed+1 until valid.
 */
export function generateValidPuzzleConfig(initialSeed) {
  let currentSeed = initialSeed;
  let attempts = 0;
  const maxAttempts = 50;

  while (attempts < maxAttempts) {
    const config = generatePuzzleConfig(currentSeed);
    const validation = validatePuzzleConfig(config);
    if (validation.valid) {
      return { config, validation };
    }
    currentSeed = (currentSeed + 7919) % 1000000;
    attempts++;
  }

  throw new Error(`Failed to generate a valid puzzle configuration after ${maxAttempts} attempts.`);
}
