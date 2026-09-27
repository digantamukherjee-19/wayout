/**
 * WAY OUT - First-Person 3D Camera & Mobile Navigation Controller
 * Implements smooth movement, rotational steering, touch-look, and AABB collision.
 * Respects strict freeze when playerCanMove is false.
 */

export class CameraController {
  constructor(camera, colliders, audio, gameState) {
    this.camera = camera;
    this.colliders = colliders;
    this.audio = audio;
    this.gameState = gameState;

    this.camera.position.set(0, 1.65, 3.2);
    this.yaw = -0.38;
    this.pitch = -0.05;
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);

    this.playerRadius = 0.35;
    this.moveSpeed = 3.6;
    this.rotSpeed = 2.4;

    this.moveForward = false;
    this.moveBackward = false;
    this.rotateLeft = false;
    this.rotateRight = false;

    this.lastFootstep = 0;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.isTouchLooking = false;

    this.bindControls();
  }

  bindControls() {
    const btnUp = document.getElementById('ctrl-up');
    const btnDown = document.getElementById('ctrl-down');
    const btnLeft = document.getElementById('ctrl-left');
    const btnRight = document.getElementById('ctrl-right');

    const bindButton = (el, onStart, onEnd) => {
      if (!el) return;
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); onStart(); });
      el.addEventListener('pointerup', (e) => { e.preventDefault(); e.stopPropagation(); onEnd(); });
      el.addEventListener('pointercancel', (e) => { e.preventDefault(); e.stopPropagation(); onEnd(); });
      el.addEventListener('pointerleave', (e) => { onEnd(); });
    };

    bindButton(btnUp, () => { this.moveForward = true; }, () => { this.moveForward = false; });
    bindButton(btnDown, () => { this.moveBackward = true; }, () => { this.moveBackward = false; });
    bindButton(btnLeft, () => { this.rotateLeft = true; }, () => { this.rotateLeft = false; });
    bindButton(btnRight, () => { this.rotateRight = true; }, () => { this.rotateRight = false; });

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || !this.gameState.controlState.playerCanMove) return;
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.moveForward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.moveBackward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.rotateLeft = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.rotateRight = true;
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.moveForward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.moveBackward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.rotateLeft = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.rotateRight = false;
          break;
      }
    });

    const viewport = document.getElementById('webgl-canvas');
    if (viewport) {
      viewport.addEventListener('pointerdown', (e) => {
        if (!this.gameState.controlState.playerCanMove) return;
        if (e.pointerType === 'touch' || e.button === 0) {
          this.isTouchLooking = true;
          this.touchStartX = e.clientX;
          this.touchStartY = e.clientY;
        }
      });

      window.addEventListener('pointermove', (e) => {
        if (!this.isTouchLooking || !this.gameState.controlState.playerCanMove) return;
        const dx = e.clientX - this.touchStartX;
        const dy = e.clientY - this.touchStartY;
        this.touchStartX = e.clientX;
        this.touchStartY = e.clientY;

        this.yaw -= dx * 0.004;
        this.pitch -= dy * 0.003;
        this.pitch = Math.max(-0.6, Math.min(0.6, this.pitch));
      });

      window.addEventListener('pointerup', () => { this.isTouchLooking = false; });
      window.addEventListener('pointercancel', () => { this.isTouchLooking = false; });
    }
  }

  update(delta) {
    // FREEZE CHECK: If playerCanMove is false (e.g. at 00:00 or in menu), completely freeze!
    if (!this.gameState.controlState.playerCanMove) {
      this.moveForward = false;
      this.moveBackward = false;
      this.rotateLeft = false;
      this.rotateRight = false;
      this.isTouchLooking = false;
      return;
    }

    if (this.rotateLeft) {
      this.yaw += this.rotSpeed * delta;
    }
    if (this.rotateRight) {
      this.yaw -= this.rotSpeed * delta;
    }

    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);

    let moveDir = 0;
    if (this.moveForward) moveDir += 1;
    if (this.moveBackward) moveDir -= 1;

    if (moveDir !== 0) {
      const step = moveDir * this.moveSpeed * delta;
      const dx = -Math.sin(this.yaw) * step;
      const dz = -Math.cos(this.yaw) * step;

      const targetX = this.camera.position.x + dx;
      const targetZ = this.camera.position.z + dz;

      if (!this.checkCollision(targetX, this.camera.position.z)) {
        this.camera.position.x = targetX;
      }
      if (!this.checkCollision(this.camera.position.x, targetZ)) {
        this.camera.position.z = targetZ;
      }

      const now = performance.now();
      if (now - this.lastFootstep > 420) {
        this.lastFootstep = now;
        this.audio.play('footstep');
      }
    }

    this.camera.position.y = 1.65;
  }

  checkCollision(x, z) {
    const r = this.playerRadius;
    for (const c of this.colliders) {
      if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) {
        return true;
      }
    }
    return false;
  }

  resetPosition() {
    this.camera.position.set(0, 1.65, 3.2);
    this.yaw = -0.38;
    this.pitch = -0.05;
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
    this.moveForward = false;
    this.moveBackward = false;
    this.rotateLeft = false;
    this.rotateRight = false;
    this.isTouchLooking = false;
  }
}
