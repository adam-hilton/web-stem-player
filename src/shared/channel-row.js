// One stem = one 100px row of two 50px sub-rows:
//   [ label ][ mute ][ pan ][ FX ]   <- info line
//   [========== fader ==========]   <- full-width
//
// The FX badge is a Phase 1 placeholder: it renders and is inert, so wiring it
// to the engine's send node in Phase 2 needs no layout change.

export function createChannelRow(engine, index) {
  const channel = engine.channels[index];

  const row = el('div', 'row');
  const info = el('div', 'row-info');
  const label = el('span', 'label', channel.label);

  const mute = el('button', 'mute', 'M');
  mute.type = 'button';
  mute.setAttribute('aria-label', `Mute ${channel.label}`);
  mute.setAttribute('aria-pressed', 'false');
  mute.addEventListener('click', () => {
    const muted = !channel.muted;
    engine.setMuted(index, muted);
    mute.setAttribute('aria-pressed', String(muted));
    mute.classList.toggle('is-muted', muted);
  });

  // Pan is near-impossible to confirm by ear when stems are correlated, so its
  // value is shown numerically.
  const readout = el('span', 'readout');
  const showPan = (value) => {
    const amount = Math.round(Math.abs(value) * 100);
    readout.textContent = amount === 0 ? 'C' : `${value < 0 ? 'L' : 'R'}${amount}`;
  };

  const pan = range(-1, 1, 0.01, channel.panner.pan.value, `Pan ${channel.label}`);
  pan.classList.add('pan');
  pan.addEventListener('input', () => {
    const value = Number(pan.value);
    engine.setPan(index, value);
    showPan(value);
  });
  // Double-click to recentre — standard mixer behaviour, and hard to hit exactly
  // by hand otherwise.
  pan.addEventListener('dblclick', () => {
    pan.value = '0';
    engine.setPan(index, 0);
    showPan(0);
  });
  showPan(Number(pan.value));

  const fx = el('span', 'fx', 'FX');
  fx.title = 'Effect send — not wired yet (Phase 2)';

  const fader = range(0, 1, 0.01, channel.volume, `Volume ${channel.label}`);
  fader.classList.add('fader');
  fader.addEventListener('input', () => engine.setVolume(index, Number(fader.value)));

  // The fader gets its own wrapper: the sub-row does the flex layout, the input
  // keeps its own intrinsic height. Flexing the input directly breaks its
  // shadow-DOM track/thumb rendering.
  const faderLine = el('div', 'fader-line');
  faderLine.append(fader);

  info.append(label, pan, readout, mute, fx);
  row.append(info, faderLine);
  return row;
}

function range(min, max, step, value, ariaLabel) {
  const input = el('input', 'slider');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.setAttribute('aria-label', ariaLabel);
  return input;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
