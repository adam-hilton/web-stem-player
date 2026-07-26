// Stem engine: N stems, sample-accurate sync, gapless looping.
//
// Per-stem chain:
//   AudioBufferSourceNode -> gain (volume/mute) -> panner -+-> master -> destination
//                                                          |
//                                                          +-> send (Phase 2 gap:
//                                                              output intentionally
//                                                              unconnected)
//
// Sync/looping rely on every source sharing one start time and one loopEnd, so
// they stay locked together indefinitely. Buffers are padded to a common length
// at decode time — a shorter buffer would otherwise clamp its own loopEnd and
// drift out of phase after the first cycle.

const RAMP = 0.015; // seconds; short ramp keeps gain/pan changes click-free

export class StemEngine {
  constructor(stems) {
    this.stems = stems;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);

    this.channels = stems.map((stem) => {
      const gain = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner();
      const send = this.ctx.createGain();

      gain.connect(panner);
      panner.connect(this.master); // dry path
      panner.connect(send); // parallel send tap
      send.gain.value = 0; // silent, and output unconnected until Phase 2

      return {
        label: stem.label,
        buffer: null,
        source: null,
        gain,
        panner,
        send,
        volume: stem.volume ?? 0.8,
        muted: false,
      };
    });

    this.duration = 0;
    this.playing = false;
    this._startCtxTime = 0; // ctx.currentTime at which playback began
    this._startOffset = 0; // position within the loop at that moment
    this._pausedAt = 0;
  }

  async load(onProgress) {
    let done = 0;
    const buffers = await Promise.all(
      this.stems.map(async (stem) => {
        // credentials omitted; R2 must send Access-Control-Allow-Origin
        const res = await fetch(stem.url);
        if (!res.ok) throw new Error(`${stem.url}: HTTP ${res.status}`);
        const bytes = await res.arrayBuffer();
        const buffer = await this.ctx.decodeAudioData(bytes);
        onProgress?.(++done, this.stems.length);
        return buffer;
      })
    );

    const frames = Math.max(...buffers.map((b) => b.length));
    const rate = buffers[0].sampleRate;
    this.duration = frames / rate;

    buffers.forEach((buffer, i) => {
      this.channels[i].buffer = buffer.length === frames ? buffer : pad(this.ctx, buffer, frames);
      this._applyGain(i, 0);
      this.channels[i].panner.pan.value = this.stems[i].pan ?? 0;
    });
  }

  play() {
    if (this.playing || !this.duration) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    // Small lookahead so every source is scheduled before the clock reaches it —
    // this is what makes the start sample-accurate rather than best-effort.
    const at = this.ctx.currentTime + 0.05;
    const offset = this._pausedAt % this.duration;

    for (const ch of this.channels) {
      const source = this.ctx.createBufferSource();
      source.buffer = ch.buffer;
      source.loop = true;
      source.loopStart = 0;
      source.loopEnd = this.duration;
      source.connect(ch.gain);
      source.start(at, offset);
      ch.source = source;
    }

    this._startCtxTime = at;
    this._startOffset = offset;
    this.playing = true;
  }

  pause() {
    if (!this.playing) return;
    this._pausedAt = this.position;
    for (const ch of this.channels) {
      ch.source.stop();
      ch.source.disconnect();
      ch.source = null;
    }
    this.playing = false;
  }

  toggle() {
    this.playing ? this.pause() : this.play();
  }

  // Seeking means re-scheduling: an already-started source can't be moved.
  seek(seconds) {
    const target = clamp(seconds, 0, this.duration);
    if (this.playing) {
      this.pause();
      this._pausedAt = target;
      this.play();
    } else {
      this._pausedAt = target;
    }
  }

  get position() {
    if (!this.playing) return this._pausedAt;
    const elapsed = this.ctx.currentTime - this._startCtxTime;
    if (elapsed < 0) return this._startOffset; // still inside the lookahead
    return (this._startOffset + elapsed) % this.duration;
  }

  setVolume(i, volume) {
    this.channels[i].volume = volume;
    this._applyGain(i);
  }

  setMuted(i, muted) {
    this.channels[i].muted = muted;
    this._applyGain(i);
  }

  setPan(i, pan) {
    this.channels[i].panner.pan.setTargetAtTime(pan, this.ctx.currentTime, RAMP);
  }

  _applyGain(i, ramp = RAMP) {
    const ch = this.channels[i];
    const value = ch.muted ? 0 : ch.volume;
    if (ramp) ch.gain.gain.setTargetAtTime(value, this.ctx.currentTime, ramp);
    else ch.gain.gain.value = value;
  }
}

function pad(ctx, buffer, frames) {
  const out = ctx.createBuffer(buffer.numberOfChannels, frames, buffer.sampleRate);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    out.copyToChannel(buffer.getChannelData(c), c, 0);
  }
  return out;
}

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
