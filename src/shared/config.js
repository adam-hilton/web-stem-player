// Where the stem audio lives. One constant, so moving buckets or prefixes is a
// one-line change across every page.
//
// R2 must send Access-Control-Allow-Origin for these — `decodeAudioData`
// requires a CORS-clean fetch, unlike a plain <audio> tag, so without it the
// deployed pages don't play at all.
const R2_BASE = 'https://REPLACE-ME.r2.dev/stems/';

// Append ?stems=local to any page to read from the committed-out local copy in
// src/stems/ instead — for offline work and for A/B-ing R2 against local files.
const useLocal = new URLSearchParams(location.search).get('stems') === 'local';

export const STEM_BASE = useLocal ? 'stems/' : R2_BASE;
