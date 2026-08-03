// Where the stem audio lives. One constant, so moving buckets or prefixes is a
// one-line change across every page.
//
// R2 must send Access-Control-Allow-Origin for these — `decodeAudioData`
// requires a CORS-clean fetch, unlike a plain <audio> tag, so without it the
// deployed pages don't play at all.
// r2.dev public dev URL on the adamrhilton-dot-com-media bucket. Rate-limited and
// uncacheable by design — swap for a custom domain (e.g. audio.adamrhilton.com) if
// these pages outlive testing.
const R2_BASE = 'https://pub-030a03d025f2474ab65b56ef3dde2fe2.r2.dev/stems/';

// Append ?stems=local to any page to read from the committed-out local copy in
// src/stems/ instead — for offline work and for A/B-ing R2 against local files.
const useLocal = new URLSearchParams(location.search).get('stems') === 'local';

export const STEM_BASE = useLocal ? 'stems/' : R2_BASE;

// Append ?debug=1 to show the on-device diagnostic panel (see debug.js).
export const DEBUG = new URLSearchParams(location.search).get('debug') === '1';

// The full stem set, in order. Filenames are URL-encoded because the source
// files contain spaces. Pages take a prefix of this list rather than restating
// it, so adding or reordering stems is one edit here instead of five.
export const STEM_FILES = [
  'loop-stem%201-Audio.mp3',
  'loop-stem%202-Audio.mp3',
  'loop-stem%203-Audio.mp3',
  'loop-stem%204-Audio.mp3',
  'loop-stem%205-Audio.mp3',
  'loop-stem%206-Audio.mp3',
  'loop-stem%207-Audio.mp3',
  'loop-stem%208-Audio.mp3',
];

// The first `count` stems, as mountPlayer() wants them. No `pan`/`volume` seeds:
// every control defaults to unity (centre / 1.0) so a page loads neutral.
export function stemsFor(count) {
  if (count > STEM_FILES.length) {
    throw new Error(`Asked for ${count} stems; only ${STEM_FILES.length} exist`);
  }
  return STEM_FILES.slice(0, count).map((file, i) => ({
    label: `Stem ${i + 1}`,
    url: STEM_BASE + file,
  }));
}
