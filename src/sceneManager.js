/**
 * WAY OUT - Scene & View Transition Manager
 * Handles switching between the main 2D room view, close-up inspection overlays, and dialog modals.
 */

export class SceneManager {
  constructor(gameState, audio) {
    this.gameState = gameState;
    this.audio = audio;
    this.activeModal = null;
  }

  goToRoom() {
    this.audio.play('click');
    this.gameState.set({
      currentScene: 'room',
      activeInspectObject: null,
    });
    this.gameState.emit('sceneChange', { scene: 'room', target: null });
  }

  inspectObject(objectId) {
    this.audio.play('click');
    const sceneName = `inspect_${objectId}`;
    this.gameState.set({
      currentScene: sceneName,
      activeInspectObject: objectId,
    });
    this.gameState.emit('sceneChange', { scene: sceneName, target: objectId });
  }

  openModal(modalId) {
    this.activeModal = modalId;
    this.gameState.emit('modalOpened', { modalId });
  }

  closeModal(modalId) {
    if (this.activeModal === modalId) {
      this.activeModal = null;
    }
    this.gameState.emit('modalClosed', { modalId });
  }
}
