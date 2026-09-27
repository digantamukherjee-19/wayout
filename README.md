# WAY OUT — 3D First-Person Escape Room Game

**WAY OUT** is a complete, polished, 3D first-person mobile-first psychological mystery escape room game. Built with Three.js (self-contained in `libs/three.min.js`), WebGL, vanilla ES Modules, and the Web Audio API.

---

## 🎮 Play Online / Run Locally

To play locally, run:

```bash
node server.js
```

Then open your browser to:
👉 **`http://localhost:3000`**

*(Zero external dependencies or build steps required. Can also be served by any static server like `npx http-server` or `python -m http.server 3000`.)*

---

## 🕹️ Controls & Navigation

### Mobile Controls:
- **Steering D-Pad (Bottom-Left)**:
  - `↑`: Walk forward
  - `↓`: Walk backward
  - `←`: Rotate view left (yaw rotation, does NOT strafe)
  - `→`: Rotate view right (yaw rotation, does NOT strafe)
- **Touch Look**: Drag on the 3D viewport to freely look around in first-person perspective.
- **`INTERACT` Button (Bottom-Right)**: Interacts with the currently examined/highlighted 3D object in crosshair range.
- **`BACK` Button**: Closes the current examination or modal inspection panel.

### Desktop Controls:
- **W / Arrow Up**: Move forward
- **S / Arrow Down**: Move backward
- **A / Arrow Left**: Rotate view left
- **D / Arrow Right**: Rotate view right
- **Mouse Drag**: Look around
- **Click or Space**: Interact with object

---

## 🔒 Strict Sequential Core Puzzle Chain

The game enforces a strict state machine with zero sequence-breaking:

1. **Step 1 — Strange Key**:
   - Player wakes up with the `Strange Key` already in their inventory.
2. **Step 2 — Desk Drawer -> Crowbar**:
   - The examination desk has Drawer 1 and Drawer 2.
   - Using the `Strange Key` on the locked drawer unlocks it, sliding it open in 3D to reveal the **Metal Tool / Crowbar**.
   - The other drawer contains harmless environmental material.
3. **Step 3 — Crowbar -> Small Box -> Access Card #1**:
   - 3 small boxes are placed in distinct areas across the room (bookshelf area, desk area, window area).
   - Using the `Crowbar` on the correct small box pries its lid open, revealing **Access Card #1**.
   - The other two boxes contain harmless environmental items.
4. **Step 4 — Carpet -> Hidden Compartment -> Phone (11:11 PM)**:
   - Interacting with the worn carpet peels back its corner to reveal a concealed floor hatch.
   - Opening the hatch reveals an **Old Mobile Phone**.
   - Examining the phone shows an illuminated green screen displaying **`11:11 PM`** (the 1111 PIN clue).
5. **Step 5 — Main Exit Door Section 1 (PIN 1111)**:
   - The door interaction screen strictly features **ONLY TWO SECTIONS**:
     - `SECTION 1 — PIN / CODE`
     - `SECTION 2 — ACCESS CARD`
   - Entering `1111` in Section 1 disengages Lock 1 (`LOCK 1 — UNLOCKED`) and releases the **Cabinet Key**.
6. **Step 6 — Cabinet Key -> Large Cabinet -> Access Card #2**:
   - Walking to the tall locked cabinet and using the `Cabinet Key` swings the heavy cabinet doors open in 3D, revealing **Access Card #2**.
7. **Step 7 — Access Card #2 -> Door Section 2 -> Escape**:
   - Returning to the exit door, Section 1 remains `LOCK 1 — UNLOCKED`.
   - In Section 2, swiping `Access Card #2` unlocks the final lock (`FINAL LOCK — UNLOCKED`).
   - Interacting with the door physically swings the heavy reinforced door open in 3D, triggering the dramatic escape ending!

---

## ⏱️ Two +30 Second Stopwatch Time Gifts

- Two physical 3D stopwatch-style timer devices with warm glowing dials are placed in the room:
  - *Gift #1*: On a side table near the bookshelf.
  - *Gift #2*: Tucked behind the bedside table frame.
- Approaching and clicking adds +30s to the 5:00 countdown timer (maximum 2 gifts = +60s total max bonus).
- Each device can only be collected once and disappears from the 3D scene.

---

## 💬 Narrator Chatbot (Top-Right Corner)

- Positioned in the **top-right corner** with a toggle button and unread indicator.
- Keeps a complete, scrollable conversation history of all story progression messages and observations.
- Delivers progressive, non-intrusive hints for each puzzle stage and gentle reminders if the player is stuck.

---

## 🧪 Automated Test Verification

Run the sequential test suite in Node.js:

```bash
node tests/testSequentialPuzzleChain.js
```
