"use client";

/**
 * @fileOverview Singleton manager for professional platform sound effects.
 * Handles desktop detection and browser interaction gates.
 */
class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private enabled = false;
  private isDesktop = false;
  private lastPlayTime = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      // Static asset served from /public/sounds/hover.mp3
      this.audio = new Audio('/sounds/hover.mp3');
      this.audio.volume = 0.15; // Set to a professional, audible level
      this.audio.preload = "auto";
      
      // Detect desktop/mouse users specifically
      this.isDesktop = window.matchMedia("(pointer: fine)").matches;

      // Gate audio activation behind first user interaction to comply with browser autoplay policies
      const enable = () => {
        this.enabled = true;
        // Warm up the audio context
        if (this.audio) {
          this.audio.play().then(() => {
            this.audio?.pause();
            if (this.audio) this.audio.currentTime = 0;
          }).catch(() => {
            // Silently fail if source is missing (expected until file is uploaded)
          });
        }
        window.removeEventListener('click', enable);
        window.removeEventListener('keydown', enable);
      };
      
      window.addEventListener('click', enable);
      window.addEventListener('keydown', enable);
    }
  }

  /**
   * Triggers the soft hover sound with a debounce to prevent overlapping audio spam.
   */
  playHover() {
    const now = Date.now();
    // Debounce playback (70ms) to ensure sound doesn't stutter during rapid mouse movement
    if (this.enabled && this.isDesktop && this.audio && (now - this.lastPlayTime > 70)) {
      this.lastPlayTime = now;
      
      // Use a clone to allow overlapping playback for rapid interactions
      const clone = this.audio.cloneNode() as HTMLAudioElement;
      clone.volume = 0.15;
      
      clone.play().catch(() => {
        // Fallback silently if the file is missing from /public/sounds/
      });
    }
  }
}

export const audioManager = typeof window !== 'undefined' ? new AudioManager() : null;
