// Midnight Vault — sound, synthesized with WebAudio and nothing else: no audio
// files, no network. The context is created on the first key or click (browsers
// block sound before a gesture), and every effect is a short oscillator or noise
// burst. A mute toggle (M) silences it all.

/** Build the soundboard. Every method is a no-op until unlock() runs. */
export function createSoundboard() {
  let context = null;
  let muted = false;
  let humNodes = null;

  /** Create (or resume) the audio context after a user gesture. Safe to call often. */
  function unlock() {
    try {
      if (context === null) {
        const AudioContext = window.AudioContext ?? window.webkitAudioContext;
        if (!AudioContext) return;
        context = new AudioContext();
      }
      if (context.state === 'suspended') void context.resume();
    } catch {
      context = null;
    }
  }

  /** One short tone: frequency, seconds, shape, volume, and an optional slide to. */
  function tone(freq, seconds, shape, volume, slideTo) {
    if (context === null || muted) return;
    try {
      const now = context.currentTime;
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = shape;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), now + seconds);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(now);
      osc.stop(now + seconds + 0.02);
    } catch {
      // Sound is garnish: a failure here must never break the game.
    }
  }

  /** A burst of filtered noise: footsteps, smoke, the EMP crackle. */
  function noise(seconds, volume, lowFreq) {
    if (context === null || muted) return;
    try {
      const now = context.currentTime;
      const length = Math.max(1, Math.floor(context.sampleRate * seconds));
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = context.createBufferSource();
      source.buffer = buffer;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowFreq;
      const gain = context.createGain();
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);
      source.start(now);
    } catch {
      // Sound is garnish: a failure here must never break the game.
    }
  }

  /** A low room hum while playing, so the vault never feels dead silent. */
  function startHum() {
    if (context === null || muted || humNodes !== null) return;
    try {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.value = 55;
      gain.gain.value = 0.025;
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start();
      humNodes = { osc, gain };
    } catch {
      humNodes = null;
    }
  }

  function stopHum() {
    if (humNodes === null) return;
    try {
      humNodes.osc.stop();
    } catch {
      // Already stopped.
    }
    humNodes = null;
  }

  return {
    unlock,
    toggleMute() {
      muted = !muted;
      if (muted) stopHum();
      return muted;
    },
    get muted() {
      return muted;
    },
    startHum,
    stopHum,
    /** A soft step, quieter while sneaking. */
    step(sneaking) {
      noise(0.05, sneaking ? 0.02 : 0.045, 420);
    },
    /** The click of a picked-up piece of loot, rising with its value. */
    pickup(kind) {
      if (kind === 'diamond') {
        tone(880, 0.12, 'sine', 0.16);
        setTimeout(() => tone(1318, 0.22, 'sine', 0.16), 90);
        setTimeout(() => tone(1760, 0.3, 'sine', 0.14), 180);
      } else {
        tone(660, 0.1, 'triangle', 0.14);
        setTimeout(() => tone(990, 0.16, 'triangle', 0.12), 70);
      }
    },
    /** A short rising blip while a watcher has eyes on the thief. */
    spotted() {
      tone(520, 0.14, 'square', 0.05, 760);
    },
    /** The alarm climbing: one harsh buzz per quarter of the meter. */
    alarmTick() {
      tone(220, 0.18, 'sawtooth', 0.07, 180);
    },
    smoke() {
      noise(0.5, 0.12, 900);
    },
    emp() {
      noise(0.35, 0.14, 2400);
      tone(1200, 0.3, 'square', 0.05, 90);
    },
    /** The caught sting: a falling minor phrase. */
    caught() {
      tone(392, 0.22, 'sawtooth', 0.1);
      setTimeout(() => tone(311, 0.3, 'sawtooth', 0.1), 180);
      setTimeout(() => tone(233, 0.5, 'sawtooth', 0.1), 380);
    },
    /** The getaway fanfare: a rising major arpeggio. */
    win() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => setTimeout(() => tone(freq, 0.32, 'triangle', 0.14), i * 110));
    },
    click() {
      tone(440, 0.05, 'square', 0.05);
    },
  };
}
