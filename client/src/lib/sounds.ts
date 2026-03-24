/**
 * Sound Effects using Web Audio API
 * No external audio files needed — generates tones programmatically.
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume: number = 0.3
) {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    // Silently fail if audio context is not available
  }
}

/** Ascending two-tone chime for correct answers */
export function playCorrectSound() {
  playTone(523.25, 0.15, "sine", 0.25); // C5
  setTimeout(() => playTone(659.25, 0.2, "sine", 0.3), 100); // E5
}

/** Descending buzz for incorrect answers */
export function playIncorrectSound() {
  playTone(200, 0.3, "square", 0.15); // Low buzz
}

/** Triumphant ascending arpeggio for level up / lesson complete */
export function playLevelUpSound() {
  playTone(523.25, 0.15, "sine", 0.2);  // C5
  setTimeout(() => playTone(659.25, 0.15, "sine", 0.2), 100);  // E5
  setTimeout(() => playTone(783.99, 0.15, "sine", 0.25), 200); // G5
  setTimeout(() => playTone(1046.5, 0.3, "sine", 0.3), 300);   // C6
}

/** Quick "ding" for XP gain */
export function playXPSound() {
  playTone(880, 0.12, "sine", 0.2); // A5 ping
}

/** Soft "whoosh" for heart loss */
export function playHeartLossSound() {
  playTone(330, 0.25, "sawtooth", 0.1); // Low E4
  setTimeout(() => playTone(220, 0.3, "sawtooth", 0.08), 150); // Lower A3
}

/** Quick tap sound for button interactions */
export function playTapSound() {
  playTone(1200, 0.05, "sine", 0.1);
}
