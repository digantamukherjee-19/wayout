/**
 * WAY OUT - Save System (Settings & Preferences)
 * Light-weight LocalStorage manager for audio toggles, text scaling, and display settings.
 * Intentionally does NOT persist puzzle state so each PLAY AGAIN generates a fresh mystery.
 */

const STORAGE_KEY = 'wayout_game_settings_v1';

export class SaveSystem {
  static loadSettings() {
    const defaults = {
      sound: true,
      music: true,
      textSize: 'medium', // 'small', 'medium', 'large'
      highContrast: false,
    };

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaults, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('LocalStorage not available, using default settings');
    }
    return defaults;
  }

  static saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Could not save settings to LocalStorage');
    }
  }
}
