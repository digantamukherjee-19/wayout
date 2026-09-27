/**
 * WAY OUT - Objects Data
 * Defines interactive and atmospheric objects in the room and their inspection panels.
 */

export const ROOM_OBJECTS = {
  door: {
    id: 'door',
    name: 'Heavy Reinforced Door',
    shortName: 'Exit Door',
    description: 'A fortified steel door with 5 distinct security locks blocking the only exit.',
    interactionType: 'inspect',
    inspectScene: 'inspect_door',
    requiresItem: null,
    bounds: { x: 38, y: 18, width: 24, height: 68 }, // percentage in room viewport
  },

  bed: {
    id: 'bed',
    name: 'Hospital Bed',
    shortName: 'Bed',
    description: 'A cold, iron-framed bed with rumpled hospital sheets and an askew pillow.',
    interactionType: 'inspect',
    inspectScene: 'inspect_bed',
    bounds: { x: 4, y: 52, width: 28, height: 38 },
  },

  desk: {
    id: 'desk',
    name: 'Doctor\'s Examination Desk',
    shortName: 'Desk',
    description: 'A heavy mahogany desk littered with clinical files, medical notes, and locked drawers.',
    interactionType: 'inspect',
    inspectScene: 'inspect_desk',
    bounds: { x: 68, y: 50, width: 28, height: 42 },
  },

  wall_clock: {
    id: 'wall_clock',
    name: 'Mechanical Wall Clock',
    shortName: 'Wall Clock',
    description: 'A brass-rimmed institutional clock. The hands can be manually synchronized.',
    interactionType: 'inspect',
    inspectScene: 'inspect_clock',
    bounds: { x: 26, y: 14, width: 9, height: 16 },
  },

  painting: {
    id: 'painting',
    name: 'Oil Painting: "The Crossroads"',
    shortName: 'Painting',
    description: 'A somber painting of a rainy highway intersection at dusk. It feels slightly crooked.',
    interactionType: 'inspect',
    inspectScene: 'inspect_painting',
    bounds: { x: 65, y: 15, width: 14, height: 22 },
  },

  bookshelf: {
    id: 'bookshelf',
    name: 'Oak Bookshelf',
    shortName: 'Bookshelf',
    description: 'Shelves packed with psychiatry journals and colored reference volumes.',
    interactionType: 'inspect',
    inspectScene: 'inspect_bookshelf',
    bounds: { x: 84, y: 22, width: 14, height: 45 },
  },

  medicine_cabinet: {
    id: 'medicine_cabinet',
    name: 'Medicine Cabinet',
    shortName: 'Medicine Cabinet',
    description: 'A wall-mounted white metal cabinet with a frosted glass cross and a combination dial.',
    interactionType: 'inspect',
    inspectScene: 'inspect_cabinet',
    bounds: { x: 5, y: 22, width: 12, height: 22 },
  },

  loose_floorboard: {
    id: 'loose_floorboard',
    name: 'Loose Floorboard',
    shortName: 'Floorboard',
    description: 'A wooden floor plank that wobbles when stepped on. Something metallic glints in the crack.',
    interactionType: 'inspect',
    inspectScene: 'inspect_floorboard',
    bounds: { x: 34, y: 84, width: 18, height: 10 },
  },

  coat_rack: {
    id: 'coat_rack',
    name: 'Doctor\'s White Coat',
    shortName: 'Doctor\'s Coat',
    description: 'A lab coat hanging on a wall peg. The breast pocket looks weighed down.',
    interactionType: 'inspect',
    inspectScene: 'inspect_coat',
    bounds: { x: 19, y: 28, width: 6, height: 35 },
  },

  window: {
    id: 'window',
    name: 'Barred Window',
    shortName: 'Window',
    description: 'Heavy iron bars block a view of pouring rain and swaying tree branches outside.',
    interactionType: 'inspect',
    inspectScene: 'inspect_window',
    bounds: { x: 38, y: 4, width: 24, height: 12 },
  },
};
