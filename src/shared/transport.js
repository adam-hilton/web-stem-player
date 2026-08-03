// Minimal transport: play/pause button + a single line with a playhead.
// Tap or drag anywhere on the line to seek. Mounted at the top of the page and
// sticky, so it stays reachable once the taller pages scroll.

// Both states are drawn, not typed. The obvious pause character (U+23F8) is
// rendered as a colour emoji by Apple platforms, which reads nothing like the
// play triangle beside it; one inline SVG with both shapes keeps the two states
// visually matched and independent of font coverage.
const GLYPHS = `
  <svg class="glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path class="glyph-play" d="M8 5.5v13l11-6.5z" />
    <g class="glyph-pause">
      <rect x="7.5" y="5.5" width="3.5" height="13" rx="1" />
      <rect x="13" y="5.5" width="3.5" height="13" rx="1" />
    </g>
  </svg>
`;

export function createTransport(engine) {
  const bar = el('div', 'transport');

  const button = el('button', 'play');
  button.type = 'button';
  button.innerHTML = GLYPHS;

  // Button state is derived from the engine rather than tracked separately, so
  // the two can't drift apart.
  const render = () => {
    button.classList.toggle('is-playing', engine.playing);
    button.setAttribute('aria-label', engine.playing ? 'Pause' : 'Play');
  };
  render();

  button.addEventListener('click', () => {
    engine.toggle();
    render();
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
