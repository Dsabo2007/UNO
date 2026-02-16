// Simple audio synthesizer to avoid external assets
const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

export const playSound = (type: 'deal' | 'play' | 'draw' | 'uno' | 'win' | 'special' | 'wild') => {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  switch (type) {
    case 'deal':
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(400, now);
      oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      oscillator.start(now);
      oscillator.stop(now + 0.1);
      break;
    case 'play':
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(600, now);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      oscillator.start(now);
      oscillator.stop(now + 0.15);
      break;
    case 'draw':
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(300, now);
      oscillator.frequency.linearRampToValueAtTime(400, now + 0.1);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.linearRampToValueAtTime(0.01, now + 0.1);
      oscillator.start(now);
      oscillator.stop(now + 0.1);
      break;
    case 'special':
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(200, now);
      oscillator.frequency.linearRampToValueAtTime(800, now + 0.3);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.linearRampToValueAtTime(0.01, now + 0.3);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
      break;
    case 'wild':
      // Magical glimmer using multiple oscillators
      const osc2 = audioCtx.createOscillator();
      const gn2 = audioCtx.createGain();
      osc2.connect(gn2);
      gn2.connect(audioCtx.destination);

      oscillator.type = 'sine';
      osc2.type = 'triangle';

      // First tone ramping up
      oscillator.frequency.setValueAtTime(400, now);
      oscillator.frequency.linearRampToValueAtTime(1200, now + 0.6);
      
      // Second tone ramping up faster with harmonic offset
      osc2.frequency.setValueAtTime(600, now);
      osc2.frequency.linearRampToValueAtTime(1800, now + 0.6);

      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      
      gn2.gain.setValueAtTime(0.05, now);
      gn2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      oscillator.start(now);
      osc2.start(now);
      oscillator.stop(now + 0.6);
      osc2.stop(now + 0.6);
      break;
    case 'uno':
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(800, now);
      oscillator.frequency.setValueAtTime(600, now + 0.1);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.linearRampToValueAtTime(0.01, now + 0.4);
      oscillator.start(now);
      oscillator.stop(now + 0.4);
      break;
    case 'win':
      // Arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gn = audioCtx.createGain();
        osc.connect(gn);
        gn.connect(audioCtx.destination);
        osc.frequency.value = freq;
        gn.gain.setValueAtTime(0.05, now + i * 0.1);
        gn.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.5);
      });
      break;
  }
};