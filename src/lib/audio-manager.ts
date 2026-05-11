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
      // Soft premium UI hover sound (Tick/Pop)
      this.audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
      this.audio.volume = 0.04;
      this.audio.preload = "auto";
      
      // Detect desktop/mouse users specifically
      this.isDesktop = window.matchMedia("(pointer: fine)").matches;

      // Gate audio activation behind first user interaction to comply with autoplay policies
      const enable = () => {
        this.enabled = true;
        // Safari/Chrome warm-up
        if (this.audio) {
          this.audio.play().then(() => {
            this.audio?.pause();
            if (this.audio) this.audio.currentTime = 0;
          }).catch(() => {});
        }
        window.removeEventListener('click', enable);
        window.removeEventListener('keydown', enable);
      };
      
      window.addEventListener('click', enable);
      window.addEventListener('keydown', enable);
    }
  }

  /**
   * Triggers the soft hover sound with a debounce to prevent spamming
   */
  playHover() {
    const now = Date.now();
    if (this.enabled && this.isDesktop && this.audio && (now - this.lastPlayTime > 60)) {
      this.lastPlayTime = now;
      const clone = this.audio.cloneNode() as HTMLAudioElement;
      clone.volume = 0.04;
      clone.play().catch(() => {});
    }
  }
}

export const audioManager = typeof window !== 'undefined' ? new AudioManager() : null;
