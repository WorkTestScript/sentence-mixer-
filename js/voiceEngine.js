/**
 * Voice Engine Module
 * Handles all speech synthesis functionality
 */

class VoiceEngine {
  constructor() {
    this.voiceSelect = null;
    this.speedControl = null;
    this.pitchControl = null;
    this.volumeControl = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the voice engine with control elements
   * @param {HTMLElement} voiceSelect - Voice selection dropdown
   * @param {HTMLElement} speedControl - Speed control input
   * @param {HTMLElement} pitchControl - Pitch control input
   * @param {HTMLElement} volumeControl - Volume control input
   */
  init(voiceSelect, speedControl, pitchControl, volumeControl) {
    this.voiceSelect = voiceSelect;
    this.speedControl = speedControl;
    this.pitchControl = pitchControl;
    this.volumeControl = volumeControl;
    this.isInitialized = true;
    this.loadVoices();
  }

  /**
   * Load available voices into the voice select dropdown
   */
  loadVoices() {
    if (!this.isInitialized) return;
    
    const voices = speechSynthesis.getVoices();
    this.voiceSelect.innerHTML = voices
      .map((voice) => `<option value="${voice.name}">${voice.name} (${voice.lang})</option>`)
      .join("");
    this.loadVoiceSettings();
  }

  /**
   * Load voice settings from localStorage
   */
  loadVoiceSettings() {
    if (!this.isInitialized) return;
    
    this.voiceSelect.value = localStorage.getItem("voice") || this.voiceSelect.value;
    this.speedControl.value = localStorage.getItem("speed") || 1;
    this.pitchControl.value = localStorage.getItem("pitch") || 1;
    this.volumeControl.value = localStorage.getItem("volume") || 1;
  }

  /**
   * Save voice settings to localStorage
   */
  saveSettings() {
    if (!this.isInitialized) return;
    
    localStorage.setItem("voice", this.voiceSelect.value);
    localStorage.setItem("speed", this.speedControl.value);
    localStorage.setItem("pitch", this.pitchControl.value);
    localStorage.setItem("volume", this.volumeControl.value);
  }

  /**
   * Speak text with current voice settings
   * @param {string} text - Text to speak
   * @param {function} onEnd - Callback function when speech ends
   * @param {boolean} autoClose - Whether to auto-close popup after speech
   */
  speak(text, onEnd = null, autoClose = false) {
    if (!this.isInitialized) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice =
      speechSynthesis.getVoices().find((voice) => voice.name === this.voiceSelect.value) ||
      speechSynthesis.getVoices()[0];
    utterance.rate = Number.parseFloat(this.speedControl.value);
    utterance.pitch = Number.parseFloat(this.pitchControl.value);
    utterance.volume = Number.parseFloat(this.volumeControl.value);
    
    utterance.onend = () => {
      if (onEnd) onEnd();
      this.notifySpeechEnd();
      this.triggerOnSpeechEndCallback();
    };

    speechSynthesis.speak(utterance);
  }

  /**
   * Method that gets called when speech ends - can be overridden or extended
   */
  notifySpeechEnd() {
    // This method can be extended or used as a callback when speech finishes
  }

  /**
   * Set a callback function to be called when speech ends
   * @param {function} callback - Function to call when speech finishes
   */
  setOnSpeechEndCallback(callback) {
    this.onSpeechEndCallback = callback;
  }

  /**
   * Internal method to call the speech end callback
   */
  triggerOnSpeechEndCallback() {
    if (this.onSpeechEndCallback && typeof this.onSpeechEndCallback === 'function') {
      this.onSpeechEndCallback();
    }
  }

  /**
   * Stop current speech
   */
  stop() {
    speechSynthesis.cancel();
  }

  /**
   * Get current voice settings
   * @returns {object} Current voice settings
   */
  getSettings() {
    if (!this.isInitialized) return {};
    
    return {
      voice: this.voiceSelect.value,
      speed: this.speedControl.value,
      pitch: this.pitchControl.value,
      volume: this.volumeControl.value
    };
  }

  /**
   * Set voice settings
   * @param {object} settings - Voice settings to apply
   */
  setSettings(settings) {
    if (!this.isInitialized) return;
    
    if (settings.voice) this.voiceSelect.value = settings.voice;
    if (settings.speed) this.speedControl.value = settings.speed;
    if (settings.pitch) this.pitchControl.value = settings.pitch;
    if (settings.volume) this.volumeControl.value = settings.volume;
  }

  /**
   * Check if speech is currently active
   * @returns {boolean} True if speech is active
   */
  isSpeaking() {
    return speechSynthesis.speaking;
  }

  /**
   * Get available voices
   * @returns {Array} Array of available voices
   */
  getAvailableVoices() {
    return speechSynthesis.getVoices();
  }
}

// Create global instance
const voiceEngine = new VoiceEngine();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VoiceEngine;
}
