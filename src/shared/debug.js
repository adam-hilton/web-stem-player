// On-device diagnostics, mounted only for ?debug=1.
//
// Exists because the failure this was written for — silent on iPhone, fine on
// every desktop browser — can't be inspected from the phone without tethering to
// a Mac. The one question worth answering there is whether the audio graph is
// producing signal at all, because it splits the causes cleanly:
//
//   state running + level moving + no sound  -> output routing / audio session,
//                                               not the graph. Nothing in this
//                                               repo will fix it.
//   state running + level pinned at 0.000    -> the graph is silent. A real bug,
//                                               and it's ours.
//   state suspended / interrupted            -> the context never started.
//
// The analyser taps master, so it reads post-fader, post-mute, post-pan — the
// same signal that reaches the destination.

export function mountDebug(engine, root) {
  const analyser = engine.ctx.createAnalyser();
  analyser.fftSize = 2048;
  engine.master.connect(analyser);

  const panel = document.createElement('pre');
  panel.className = 'debug';
  root.append(panel);

  const samples = new Float32Array(analyser.fftSize);
  let peakHold = 0;

  const tick = () => {
    analyser.getFloatTimeDomainData(samples);
    let peak = 0;
    let sum = 0;
    for (const v of samples) {
      const a = Math.abs(v);
      if (a > peak) peak = a;
      sum += v * v;
    }
    // Hold the peak so a glance catches it — instantaneous values on a quiet
    // stem flicker too fast to read on a phone.
    peakHold = Math.max(peak, peakHold * 0.95);

    panel.textContent = [
      `state      ${engine.ctx.state}`,
      `sampleRate ${engine.ctx.sampleRate}`,
      `ctxTime    ${engine.ctx.currentTime.toFixed(2)}`,
      `position   ${engine.position.toFixed(2)} / ${engine.duration.toFixed(2)}`,
      `stems      ${engine.channels.length}`,
      `out peak   ${peakHold.toFixed(3)}`,
      `out rms    ${Math.sqrt(sum / samples.length).toFixed(3)}`,
    ].join('\n');

    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
