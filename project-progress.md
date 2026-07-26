# Project Progress

Running record of work against [stem-player-project-plan.md](stem-player-project-plan.md).
Updated at the end of each session. Newest session first in the log.

## Status at a Glance

| Phase | State |
| --- | --- |
| Phase 0 — Setup | **Superseded.** Reference-repo extraction turned out to be a no-op (see Corrections). R2 setup not started. |
| Phase 1 — Core player | **In progress.** Engine + UI + 6-stem page built and loading. Pages 1–5, R2, deploy outstanding. |
| Phase 2 — Effect sends | Not started. Send node exists per channel, output unconnected. |

### Acceptance Criteria (6-stem page)

| Criterion | State |
| --- | --- |
| Correct number of stems load and play | ✅ All 6 decode and mount |
| Stems play in sync | ⏳ Not verified — needs a listen with real (non-duplicate) stems |
| All stems loop on completion | ⏳ Not verified — see mp3 loop seam below |
| Volume fader per stem | ✅ Confirmed in Chrome + Safari |
| Mute toggle per stem | ⏳ Built, not explicitly confirmed |
| Pan control per stem | ✅ Confirmed in Chrome + Safari |
| Dummy FX-send element per row | ✅ Renders, inert |
| Single transport (play/pause, seek) | ⏳ Built, not explicitly confirmed |
| Fits iPhone 16 Pro portrait, no scroll | ⏳ Arithmetic checks out (~710px of ~774 usable); not tested on device |
| Audio loaded from R2, not the repo | ❌ Currently local `src/stems/`; stems are committed for now |
| Deploys cleanly to Vercel/GH Pages | ❌ Not started |

## Session Log

### Session 1 — 2026-07-26

**Built** (`860aace` plus uncommitted slider fixes)

- [src/shared/audio-engine.js](src/shared/audio-engine.js) — decode N stems, per-stem
  `gain → panner → master`, one shared start time, `loop = true`, buffers padded to a
  common length so a short stem can't clamp its own `loopEnd` and drift.
- [src/shared/channel-row.js](src/shared/channel-row.js) — label, pan (+ L/C/R readout,
  double-click to recentre), mute, inert FX badge, full-width fader.
- [src/shared/transport.js](src/shared/transport.js) — play/pause + line with playhead,
  drag-to-seek, playhead driven off the audio clock.
- [src/shared/player.js](src/shared/player.js) — config → engine + UI glue, pages stay thin.
- [src/shared/styles.css](src/shared/styles.css) — 100px rows, two 50px sub-rows, 44px controls.
- [src/page-6.html](src/page-6.html) — 6-stem config against local test stems.

**Fixed** — sliders reverted to their pre-drag value on release

1. `.row-info`/`.fader-line` had `min-height: 0` with `flex: 1`, so in a window shorter
   than the layout wants, sliders compressed to a few px tall and drags left the control.
   Rows now floor at two 44px lines and clip visibly instead. Affected all browsers, and
   explained the intermittency (it tracked window height).
2. `display: flex` was applied to the range input itself — WebKit then lays out its
   shadow-DOM track and thumb as flex items. Fader moved into a `.fader-line` wrapper.
3. `::-webkit-slider-runnable-track` was grouped with `::-moz-range-track` in one selector
   list. An unparseable selector drops the whole rule, so *neither* engine styled the track.
4. `.fader` sized by `width` rather than `flex-grow` — Gecko mistracks a range input's drag
   when it's a flex item with `flex-basis: 0`. Unconfirmed as the Gecko cause; Firefox was
   de-scoped before verifying.

**Verified**

- All six 87s / 320kbps mp3s fetch and `decodeAudioData` successfully — implied with
  certainty because rows only mount after `engine.load()` resolves.
- Faders and pan drag and hold in Chrome and Safari.
- Layout arithmetic: 16px padding + (6 × 100 + 5 × 6 gaps) + 8 + 56 transport = **710px**
  against ~774px usable on 402 × 874.

**Not verified** — carried forward

- Multi-stem sync and the loop seam. Current stems are six copies of one file, which is
  ideal for detecting *desync* (identical files even slightly apart comb-filter audibly)
  but useless for judging musical sync or a real loop.
- Mute, transport play/pause, seek.
- Anything on a physical iPhone.

## Decisions Made

| Decision | Rationale |
| --- | --- |
| `AudioBufferSourceNode`, not `<audio>` | The loop requirement forced it. Six independently-clocked `<audio>` elements with `loop = true` desync *permanently* after the first cycle, not merely drift. With buffer sources, `loop = true` on a shared start time is sample-accurate and gapless for free. |
| Release targets **Safari + Chrome only** | Firefox explicitly de-scoped; revisit only if scaling out later demands it. |
| Effect send is a true parallel send, not an insert | The plan's prose says "send" but its signal chain draws an insert. Implemented as `panner → send`, send output unconnected until Phase 2. |
| Stems committed to the repo for now | Temporary. Acceptance criteria require R2; swap URLs in the page config when the bucket prefix exists. |

## Corrections to the Project Plan

- **The reference repo has no Web Audio API at all.** [lukew3/stemPlayerOnline](https://github.com/lukew3/stemPlayerOnline)
  is four `new Audio()` elements with `.volume` set directly — no `AudioContext`, no
  `GainNode`, no panner, grep-confirmed zero hits. Plan lines 66–68 ("Reuse from the
  reference repo: `AudioContext` setup, per-stem `GainNode` wiring") have nothing behind
  them, and Phase 0's "extract the audio-engine logic" is a no-op. Its sync is a 100ms
  `canplaythrough` poll; its loop pauses every track, seeks, and re-polls — an audible gap
  and fresh desync at every loop point. Engine here written from scratch.
- **iPhone 16 Pro is 402 × 874 CSS px**, not the ~393pt in plan line 57 (that's the 14/15 Pro).
- **CORS on R2 is mandatory, not forward-looking.** Plan lines 75–78 treat it as a Phase 2
  nicety because a plain `<audio>` tag doesn't need it. `decodeAudioData` does. Without
  `Access-Control-Allow-Origin` the deployed pages will not play at all.

## Open Questions

### Memory for 2–3 minute stems — resolved enough to act on

**Decoded memory does not depend on the source format.** Web Audio decodes everything to
Float32 PCM, so mp3 and WAV occupy *identical* memory once decoded. Format affects download
size only. Choosing WAV therefore does not worsen the memory picture at all.

Decoded footprint, 6 stems, 44.1kHz Float32:

| Length | Stereo | Mono |
| --- | --- | --- |
| 2 min | 242 MiB | 121 MiB |
| 3 min | 363 MiB | 182 MiB |

(48kHz stereo 3 min is 396 MiB. Pinning the `AudioContext` to 44100 avoids paying for an
upconvert if source files are 48k.)

Download totals for 3-minute stems, 6 stems: WAV 24-bit **273 MiB**, WAV 16-bit **182 MiB**,
mp3 320 **42 MiB**, AAC 256 **34 MiB**, Opus 128 **17 MiB**.

So WAV's problem is the *download* — 182–273 MiB over a phone connection is untenable —
while the memory problem belongs to duration and channel count.

Mitigations, best first:

1. **Mono stems wherever musically acceptable.** Halves memory outright, and makes the pan
   control meaningful rather than a rebalance of an already-stereo image. Biggest single win.
2. **Ship a compressed format** (AAC or Opus over mp3). Memory unchanged, download 5–10× smaller.
3. **Pin `AudioContext` sample rate to 44100.**
4. Shorter musical loops, if the material tolerates it — memory scales linearly with duration.

3-minute stereo at 363 MiB is plausible but risky on iOS Safari; mono at 182 MiB is
comfortable. Worth an early on-device test with one real 3-minute set before committing to
the full six.

### Loop seam — likely fixable without WAV

mp3 (and AAC) carry encoder delay: ~576–1105 samples of silence prepended, plus tail padding
to a frame boundary. `decodeAudioData` generally hands that silence back as real audio, so
`loop = true` will produce a short seam (~25ms at 44.1kHz). Note this is a *shared* hiccup,
not a desync — all six stems come from the same export and carry the same delay, so they
stay locked to each other.

Because it's shared, one number fixes all six: set `loopStart` past the delay and
`loopEnd` to `loopStart + exact musical length`, and start playback at `loopStart`. That
keeps a compressed delivery format. Needs the exact loop length in samples, which means
knowing BPM and bar count at export time.

### Still open from the plan

- Final stem-count range (1–5 vs 2–6) — not blocking; all 6 pages get built.
- Offline/cached vs online-only.
- Hosting choice: Vercel vs GitHub Pages.

## Next Session

1. Pages 1–5 — copy `page-6.html`, trim the config. Cheap.
2. Confirm mute, play/pause, seek; check no-scroll on a real iPhone.
3. R2 bucket prefix + **CORS headers**, then swap page configs to absolute URLs.
4. Deploy to Vercel or GH Pages.
5. Get one set of real stems in to judge sync and the loop seam properly, and to settle
   mono-vs-stereo and the delivery format.
