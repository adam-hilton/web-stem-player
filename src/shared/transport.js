// Minimal transport: play/pause button + a single line with a playhead.
// Tap or drag anywhere on the line to seek.

export function createTransport(engine) {
  const bar = el('div', 'transport');

  const button = el('button', 'play', '▶');
  button.type = 'button';
  button.setAttribute('aria-label', 'Play');
  button.addEventListener('click', () => {
    engine.toggle();
    button.textContent = engine.playing ? '⏸' : '▶';
    button.setAttribute('aria-label', engine.playing ? 'Pause' : 'Play');
  });

  const line = el('div', 'line');
  line.setAttribute('role', 'slider');
  line.setAttribute('aria-label', 'Seek');
  const head = el('div', 'playhead');
  line.append(head);

  const seekTo = (clientX) => {
    const { left, width } = line.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - left) / width));
    engine.seek(ratio * engine.duration);
  };

  let dragging = false;
  line.addEventListener('pointerdown', (e) => {
    dragging = true;
    line.setPointerCapture(e.pointerId);
    seekTo(e.clientX);
  });
  line.addEventListener('pointermove', (e) => dragging && seekTo(e.clientX));
  line.addEventListener('pointerup', () => (dragging = false));
  line.addEventListener('pointercancel', () => (dragging = false));

  const time = el('span', 'time', '0:00');

  // Drive the playhead off the audio clock, sampled per frame — the engine's
  // position is authoritative, this just reads it.
  const tick = () => {
    if (engine.duration) {
      const position = engine.position;
      head.style.left = `${(position / engine.duration) * 100}%`;
      time.textContent = format(position);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  bar.append(button, line, time);
  return bar;
}

function format(seconds) {
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
