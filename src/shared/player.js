// Glue: takes a page config, builds the engine + UI, keeps pages thin.

import { StemEngine } from './audio-engine.js';
import { createChannelRow } from './channel-row.js';
import { createTransport } from './transport.js';

export async function mountPlayer({ stems, mount = '#app' }) {
  const root = document.querySelector(mount);
  const status = document.createElement('p');
  status.className = 'status';
  status.textContent = `Loading 0/${stems.length}…`;
  root.append(status);

  const engine = new StemEngine(stems);
  window.engine = engine; // handy for console poking during development

  try {
    await engine.load((done, total) => {
      status.textContent = `Loading ${done}/${total}…`;
    });
  } catch (error) {
    status.textContent = `Failed to load: ${error.message}`;
    status.classList.add('error');
    throw error;
  }

  status.remove();

  const rows = document.createElement('div');
  rows.className = 'rows';
  engine.channels.forEach((_, i) => rows.append(createChannelRow(engine, i)));

  // Transport first: it sits at the top of the page and sticks there while the
  // rows scroll underneath.
  root.append(createTransport(engine), rows);
  return engine;
}
