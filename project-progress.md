# Project Progress

Running record of work against [stem-player-project-plan.md](stem-player-project-plan.md).
Updated at the end of each session. Newest session first in the log.

## Status at a Glance

| Phase | State |
| --- | --- |
| Phase 0 — Setup | **Superseded.** Reference-repo extraction turned out to be a no-op (see Corrections). R2 upload in progress. |
| Phase 1 — Core player | **6-stem page complete.** Every acceptance criterion passes, deployed and confirmed on device. Pages 1–5 are the only outstanding work. |
| Phase 2 — Effect sends | Not started. Send node exists per channel, output unconnected. |

### Acceptance Criteria (6-stem page)

| Criterion | State |
| --- | --- |
| Correct number of stems load and play | ✅ All 6 decode and mount |
| Stems play in sync | ✅ Confirmed on desktop with real strict-loop stems |
| All stems loop on completion | ✅ Confirmed — no audible seam (see Session 2) |
| Volume fader per stem | ✅ Confirmed in Chrome + Safari |
| Mute toggle per stem | ✅ Confirmed on desktop |
| Pan control per stem | ✅ Confirmed in Chrome + Safari |
| Dummy FX-send element per row | ✅ Renders, inert |
| Single transport (play/pause, seek) | ✅ Confirmed on desktop |
| Fits iPhone 16 Pro portrait, no scroll | ✅ Confirmed on device, across browsers |
| Audio loaded from R2, not the repo | ✅ `adamrhilton-dot-com-media/stems/` via r2.dev; stems untracked in git |
| Deploys cleanly to Vercel/GH Pages | ✅ Live at https://adam-hilton.github.io/web-stem-player/page-6.html |

## Session Log

### Session 2 — 2026-07-28

**Verified — the two criteria Session 1 couldn't judge**

- **Sync and loop both clean** on desktop with a real strict-loop stem set (six distinct
  69.696s / 48kHz / 320kbps mp3s). No audible seam at the loop point, no drift across
  repeats. Adam's call: any residual artefact is inaudible and not worth solving.
- Mute, play/pause and seek confirmed by hand.

**Why the seam didn't materialise** — worth recording, because it's a property of the
export and not of the player. 69.696s at 48kHz is 3,345,408 samples, which is exactly
2904 mp3 frames of 1152 samples with nothing left over. No partial final frame means no
tail padding to hear. A future stem set whose length *doesn't* land on a frame boundary
can bring the seam back, and then the `loopStart`/`loopEnd` fix below becomes live again.
The files also carry no Xing/LAME header, so no decoder can strip the encoder delay for us.

**Built**

- [src/shared/config.js](src/shared/config.js) — `STEM_BASE`, one constant for every page,
  plus a `?stems=local` override that reads `src/stems/` for offline work.
- [.github/workflows/deploy.yml](.github/workflows/deploy.yml) — publishes `src/` as a
  Pages artifact. Pages' built-in source only serves the repo root or `/docs`, so an
  Actions deploy is what keeps `src/` as the source dir without a rename or a copy step.
- Stems untracked and ignored; the old test stems removed. The 16MB loop set stays out
  of git history.

**Deployed** — https://adam-hilton.github.io/web-stem-player/page-6.html (public repo
`adam-hilton/web-stem-player`; Pages on a private repo needs a paid plan).

**R2 live** — `adamrhilton-dot-com-media/stems/` behind the r2.dev public dev URL, CORS
scoped to the Pages origin plus the two localhost ports. All six objects verified serving
`206` / `audio/mpeg` with `Access-Control-Allow-Origin`.

**On-device: all clear.** Every acceptance criterion for the 6-stem page now passes. Mobile
layout confirmed across browsers with no scrolling, ~2s load on cellular, and no mid-stream
crash — so the ~161 MiB decoded footprint sits inside what iOS tolerates at this loop
length, and mono stems aren't needed as a memory mitigation.

LAN testing earlier in the session failed on public Wi-Fi (almost certainly AP client
isolation, unfixable from the client); testing against the deployed URL sidestepped it
entirely and is the better loop from here anyway.

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
- ~~Hosting choice: Vercel vs GitHub Pages.~~ **Resolved: GitHub Pages** — `gh` was already
  authenticated with `repo` + `workflow` scopes, so it needed no new logins, and the site is
  static-only. Revisit if per-branch preview deploys or custom slugs become worth it.
- Pages 1–5 deliberately deferred until the mobile layout is confirmed on a real device, so
  any layout fix only has to be made once rather than across six files.

## Next Session

1. **Pages 1–5** — copy `page-6.html`, trim the config. Now unblocked: the layout is
   device-confirmed, so a fix won't have to be applied six times. The last Phase 1 item.
2. Any UI tweaks arising from Adam's own pass over the deployed page.
3. Optional, if these pages outlive testing: attach a custom domain (e.g.
   `audio.adamrhilton.com`) to the bucket for caching and to escape the r2.dev rate limit.
   One line in [config.js](src/shared/config.js) plus a CORS origin.
4. Phase 2 (effect sends) is now genuinely reachable — the `panner → send` tap already
   exists per channel with its output unconnected.

**Resolved, no longer open:** mono-vs-stereo and delivery format. Stereo mp3 at this loop
length loads in ~2s on cellular and doesn't crash iOS, so the Session 1 memory mitigations
(mono, Opus/AAC, pinning the sample rate) are unnecessary. Revisit only if stems get
substantially longer.
