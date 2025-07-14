/**
 * audio.js - Audio management for Ahead by Eight game
 */

class AudioManager {
    constructor() {
        this.sounds = {};
        this.volume = 0.7; // Default volume
        this.enabled = true;
        
        // Initialize sounds
        this.loadSounds();
    }
    
    // Load game sounds
    loadSounds() {
        this.sounds.cardFlip = new Audio('sounds/カードをめくる.mp3');
        this.sounds.cardFlip.volume = this.volume;
        
        // Preload the audio
        this.sounds.cardFlip.preload = 'auto';
        
        // Handle loading errors
        this.sounds.cardFlip.addEventListener('error', (e) => {
            console.warn('Could not load card flip sound:', e);
        });
    }
    
    // Play card flip sound and return a promise that resolves when the sound finishes
    playCardFlip() {
        if (!this.enabled) return Promise.resolve();
        
        return new Promise((resolve) => {
            try {
                // Reset audio to beginning
                this.sounds.cardFlip.currentTime = 0;
                
                // Add event listener for when sound finishes
                const onEnded = () => {
                    this.sounds.cardFlip.removeEventListener('ended', onEnded);
                    resolve();
                };
                
                this.sounds.cardFlip.addEventListener('ended', onEnded);
                
                // Play the sound
                this.sounds.cardFlip.play()
                    .catch(error => {
                        console.warn('Could not play card flip sound:', error);
                        this.sounds.cardFlip.removeEventListener('ended', onEnded);
                        resolve(); // Resolve even if sound fails
                    });
            } catch (error) {
                console.warn('Error playing card flip sound:', error);
                resolve(); // Resolve even if error occurs
            }
        });
    }
    
    // Set volume for all sounds
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        Object.values(this.sounds).forEach(sound => {
            sound.volume = this.volume;
        });
    }
    
    // Enable/disable sounds
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    
    // Get current settings
    getSettings() {
        return {
            volume: this.volume,
            enabled: this.enabled
        };
    }
}

// Create global audio manager instance
window.audioManager = new AudioManager();
