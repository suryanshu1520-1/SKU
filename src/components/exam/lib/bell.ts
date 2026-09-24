let audioCtx: AudioContext | null = null;

export function primeBell(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  } catch {
    // WebAudio not available or blocked; safe no-op
  }
}

export function playBell(): void {
  try {
    if (!audioCtx || audioCtx.state !== 'running') {
      return;
    }

    const ctx = audioCtx;
    const now = ctx.currentTime;

    // Tone 1: 880 Hz for 0.25 s (10 ms attack, 60 ms release)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.12, now + 0.01);
    gain1.gain.setValueAtTime(0.12, now + 0.19);
    gain1.gain.linearRampToValueAtTime(0, now + 0.25);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Tone 2: 660 Hz for 0.25 s (starts at now + 0.25 s)
    const t2 = now + 0.25;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(660, t2);

    gain2.gain.setValueAtTime(0, t2);
    gain2.gain.linearRampToValueAtTime(0.12, t2 + 0.01);
    gain2.gain.setValueAtTime(0.12, t2 + 0.19);
    gain2.gain.linearRampToValueAtTime(0, t2 + 0.25);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t2);
    osc2.stop(t2 + 0.25);
  } catch {
    // Audio output errors are safely swallowed
  }
}
