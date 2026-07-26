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

  const pan = range(-1, 1, 0.01, channel.panner.pan.value, `Pan ${channel.label}`);
  pan.classList.add('pan');
  pan.addEventListener('input', () => engine.setPan(index, Number(pan.value)));
  // Double-tap/click a pan control to recentre — standard mixer behaviour and
  // hard to hit exactly on a touch screen otherwise.
  pan.addEventListener('dblclick', () => {
    pan.value = '0';
    engine.setPan(index, 0);
  });

  const fx = el('span', 'fx', 'FX');
  fx.title = 'Effect send — not wired yet (Phase 2)';

  const fader = range(0, 1, 0.01, channel.volume, `Volume ${channel.label}`);
  fader.classList.add('fader');
  fader.addEventListener('input', () => engine.setVolume(index, Number(fader.value)));

  info.append(label, mute, pan, fx);
  row.append(info, fader);
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
