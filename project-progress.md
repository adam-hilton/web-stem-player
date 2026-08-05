# Project Progress

Running record of work against [stem-player-project-plan.md](stem-player-project-plan.md).
Updated at the end of each session. Newest session first in the log.

## Status at a Glance

| Phase | State |
| --- | --- |
| Phase 0 — Setup | **Superseded.** Reference-repo extraction turned out to be a no-op (see Corrections). R2 holds all 8 stems. |
| Phase 1 — Core player | **Complete. v1 shipped 2026-08-03.** Five pages built, deployed, and confirmed on device over cellular. |
| Phase 2 — Effect sends | **Cut from the initial release.** FX removed from the UI; the per-channel send node stays in the engine, output unconnected. |

### Acceptance Criteria

Scope changed on 8/3/26: five ordinal pages at 2/3/5/6/8 stems, scrolling allowed, no FX.
Verified in headless Chrome at 402 × 874 against both R2 and `?stems=local`.

| Criterion | p1 (2) | p2 (3) | p3 (5) | p4 (6) | p5 (8) |
| --- | --- | --- | --- | --- | --- |
| Correct stem count decodes and mounts | ✅ | ✅ | ✅ | ✅ | ✅ |
| Volume fader / mute / pan per stem | ✅ | ✅ | ✅ | ✅ | ✅ |
| Single transport (play/pause, seek) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Transport sticky at top on scroll | ✅ | ✅ | ✅ | ✅ | ✅ |
| No FX element present | ✅ | ✅ | ✅ | ✅ | ✅ |
| All controls reachable (scroll allowed) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Runs on a physical iPhone** | ✅ | ✅ | ✅ | ✅ | ✅ over cellular |

Two Session 2 criteria are inherited from unchanged shared modules but are **not
re-verified against the new 165.7s stem set**: musical sync across 8 stems, and the loop
seam. Both need Adam's ears — nothing in the engine changed this session.

Carried over, still true:

| Criterion | State |
| --- | --- |
| Audio loaded from R2, not the repo | ✅ `adamrhilton-dot-com-media/stems/` via r2.dev; stems untracked in git |
| Deploys cleanly to Vercel/GH Pages | ✅ Live at https://adam-hilton.github.io/web-stem-player/ (`index.html` lists all five pages) |

## Session Log

### Session 3 — 2026-08-03

Implemented the six-item 8/3/26 requirements change from the bottom of
[stem-player-project-plan.md](stem-player-project-plan.md). Phase 1 is now complete on
desktop; the one genuinely open question is whether the 8-stem page survives on an iPhone.

**The stem set was silently replaced, and it matters.** The new files are **165.672s**, not
69.696s — 2.4× longer, 6.6MB instead of 2.8MB each. Nobody flagged this; it was found by
probing R2. At 48kHz stereo Float32 that is 60.7 MiB decoded per stem, measured in-browser
rather than estimated:

| Page | Stems | Download | Decoded (measured) |
| --- | --- | --- | --- |
| page-4 | 6 | ~40 MB | **364 MiB** |
| page-5 | 8 | ~53 MB | **485 MiB** |

Session 2 proved ~153 MiB on device. This file's own Session 1 analysis calls 363 MiB
"plausible but risky on iOS Safari" — so page-4 sits exactly on that line and page-5 is
above it, at 3.2× what had ever been shown to work.

**Resolved the same day: it works.** Adam loaded page-5 on the phone over cellular only —
loads in ~1s, with a few seconds more before the page is fully responsive, which he accepted.
So 485 MiB decoded across 8 stems is inside what iOS tolerates at this loop length, and none
of the Session 1 mitigations (mono, Opus/AAC, pinning the sample rate) are required. The
ceiling is higher than this file previously assumed — treat 363 MiB as conservative, not as
a limit. Revisit only if stems get substantially longer again.

**The loop seam survives the swap.** 6903 mp3 frames × 1152 = 7,952,256 samples = exactly
165.672s at 48kHz. No partial final frame, so no tail padding, same property that made
Session 2's set gapless. A future export that doesn't land on a frame boundary brings the
seam back and makes the `loopStart`/`loopEnd` fix live again.

**Built**

- [src/shared/config.js](src/shared/config.js) — added `STEM_FILES` (all 8, URL-encoded) and
  `stemsFor(n)`. Pages take a prefix of one list instead of restating filenames five times;
  it throws if asked for more stems than exist. `STEM_BASE` and `?stems=local` unchanged.
- `src/page-1.html` … `src/page-5.html` at 2/3/5/6/8 stems — three meaningful lines each.
  **`src/page-6.html` deleted**, which retires the Session 2 deployed URL.
- [src/index.html](src/index.html) — new. The site root used to 404, so there was no way to
  reach a page without knowing its filename.
- [src/shared/transport.js](src/shared/transport.js) — mounted first (so it can stick at the
  top) and both glyphs are now one inline SVG. Button state is derived from `engine.playing`
  via a `render()` rather than set imperatively, so the two can't drift.
- [src/shared/styles.css](src/shared/styles.css) — the substantive edit. Scrolling allowed,
  rows fixed-height instead of flexed, transport sticky, pan 76px → 128px, `.fx` gone.

**Removed the FX badge**, not the send node. The change log scopes the removal to the UI, and
the `panner → send` tap costs nothing with its output unconnected — so re-adding effects
stays a UI-only change. This was the cheap branch the badge was built to preserve, and it
paid off exactly as intended: one element deletion, no layout rework.

**Why dropping the no-scroll constraint simplified the CSS.** The Session 1 slider-collapse
bug — rows crushing sliders into an untouchable sliver on a short window — was a *consequence*
of `.row { flex: 1 }` fighting a viewport too short for the layout. Session 1 defended against
it with a `min-height: calc(var(--control) * 2)` floor. With scrolling allowed, rows size
naturally at a fixed 100px and the failure mode can't occur, so the guard and its comment were
deleted rather than kept. Fewer moving parts than before the change, not more.

**Verified** in headless Chrome over CDP at 402 × 874, against both R2 and `?stems=local`:
all five pages mount the right stem count; mute sets state/aria/class; pan writes `L50` to the
readout; fader writes `0.25`; a click at the midpoint of the seek line lands at 83s of
165.672s; every control measures 44px; the transport reports `position: sticky` with
`getBoundingClientRect().top === 0` while scrolled; the play button has zero text content in
both states, so nothing can render as an emoji.

**Confirmed on device at end of session.** All five pages play correctly on the iPhone, with
page-5 loaded over cellular only: ~1s to load, a few more seconds before fully responsive
(the cost of decoding 485 MiB), accepted as-is. **v1 is wrapped.**

#### Silent on iPhone — RESOLVED: iOS Silent Mode

The deployed pages played silently on device while working on every desktop browser. Cause:
**the phone was in Silent Mode.** Adam has had it on for years and it has never affected any
other site.

**Why it only hit this player.** iOS assigns web audio to different audio session categories
depending on how it is produced. A plain `<audio>`/`<video>` element gets `playback`, which
ignores the mute switch — that is why Bandcamp and YouTube play normally on a silenced phone.
The Web Audio API defaults to a category that *obeys* it. This player is `AudioBufferSourceNode`
end to end (the Session 1 decision that bought gapless looping), so it sat on the wrong side of
that split. The asymmetry is what made the evidence so misleading: "other sites play audio
fine" was true and pointed the wrong way.

**Why it worked last week.** Silent Mode only mutes the built-in speaker. Any Bluetooth or
wired output connected at the time would have played normally with the setting untouched.

**Fixed properly rather than by changing the phone.** [audio-engine.js](src/shared/audio-engine.js)
sets `navigator.audioSession.type = 'playback'` (Safari 16.4+, feature-detected — desktop Chrome
doesn't implement it and no-ops). That asks for the same category media elements get, so the
player behaves like Bandcamp does. **Confirmed working on device.** Side effect worth knowing:
`playback` also ducks other apps' audio, which is correct for a music tool.

**Diagnostic note for next time:** an iPhone 16 Pro has no Ring/Silent switch — Silent Mode
lives on the Action Button and in Control Center, with no visible physical indicator. "Check
the mute switch" is not an actionable instruction on this hardware, which is how it survived a
round of triage that had supposedly ruled it out.

Kept from the investigation: **`?debug=1`** ([debug.js](src/shared/debug.js)) shows context
state and a live output level off an analyser on master. Useful for the outstanding 485 MiB
device test — a level pinned at `0.000` means the graph is silent, a moving level means the
graph is fine and the problem is downstream.

Discarded from the investigation: a speculative audio-session "unlock" (unconditional resume
plus a one-frame silent buffer) written against the wrong hypothesis. Only the unconditional
`resume()` survives, and only because Safari's non-standard `interrupted` state is a real thing
the old `if (suspended)` guard would skip.

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

**Controls now default to unity** (`29b6ee0`). Faders defaulted to `0.8` and `page-6.html`
seeded a −0.6…0.6 pan spread, so a fresh load looked like a mix already in progress. Both
now start neutral — pan centred, fader at 1.0. The per-stem `pan`/`volume` config seeds
still work and are simply unused. Nothing is persisted to `localStorage`, so a hard refresh
is genuinely a clean slate.

One consequence to keep in mind: six channels at unity sum into a master gain of 1.0, where
before each sat at 0.8. If a denser stem set ever distorts on the master, that's summing
headroom rather than a bug — lower the master gain, don't re-seed the faders.

**Restyled to a light theme** (`29b6ee0`, Adam's own change) — `--bg` to `#f6f5f3` with
`--row` to `#2b2f32`, inverting the original dark ground to light-page/dark-rows.

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

**Not verified** — all cleared in Session 2

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
| Effect send is a true parallel send, not an insert | The plan's prose says "send" but its signal chain draws an insert. Implemented as `panner → send`, send output unconnected. |
| FX out of the UI, send node kept (Session 3) | The 8/3 change log scopes the removal to the UI. The node is invisible and free with its output unconnected, so keeping it means effects are a UI-only change if they ever come back. |
| Pages are **ordinal**, not named by stem count | The 8/3 change log says "page 1: 2 stems", so the number is a page index. Consequence: `page-4.html` has 6 stems, and the old count-named `page-6.html` had to go — its deployed URL is dead. `index.html` exists so nobody has to guess filenames. |
| Pages take the **first N** stems | The change log fixed the counts (2/3/5/6/8) but not which stems. Adam's call: a prefix of the list. One `stemsFor(n)` call per page, no per-page stem tables to keep in sync. |
| Scrolling allowed; rows fixed-height (Session 3) | 8 rows can't fit one phone viewport with 44px targets, and the change log dropped the requirement. Rows stop flexing, which also deletes the Session 1 slider-collapse failure mode rather than guarding against it. |
| Play/pause glyphs are one inline SVG | U+23F8 renders as a colour emoji on Apple platforms and looks nothing like the play triangle beside it. Drawing both states in one SVG keeps them optically matched and independent of font coverage. |
| Stem 8 is a byte-identical copy of stem 6 | Known and accepted for the POC (Adam's call, Session 3). page-5 plays that material twice. Replace the export when it matters; no code change needed. |
| Request the `playback` audio session on iOS | Web Audio otherwise obeys iOS Silent Mode while `<audio>` elements don't, so the player alone went silent on a muted phone. `navigator.audioSession.type = 'playback'` buys the media-element behaviour without giving up buffer sources. Side effect: it also means the player ducks other apps' audio, which is correct for a music tool. |
| ~~Stems committed to the repo for now~~ | **Superseded (Session 2).** Stems live in R2 and are gitignored, so the 16MB loop set never entered git history. |
| Hosting: **GitHub Pages**, not Vercel | `gh` was already authenticated with `repo` + `workflow` scopes, so it needed no new logins or CLI installs, and the site is static-only. Revisit only if per-branch preview deploys or custom slugs become worth it. |
| Pages deploys `src/` as an Actions artifact | Pages' built-in source can only serve the repo root or `/docs`. An Actions deploy keeps `src/` as the source dir with no rename and no copy step. |
| Stem URLs behind one `STEM_BASE` constant | Moving buckets, prefixes, or on to a custom domain is a one-line change across every page. The `?stems=local` override keeps offline dev working and allows A/B-ing R2 against local files. |
| r2.dev public dev URL for now, not a custom domain | Adequate for a POC. Cloudflare rate-limits it and neither caching nor Access apply, so a custom domain is the upgrade path if these pages outlive testing. |
| All controls default to unity | A page that loads mid-mix reads as broken. Neutral defaults make "untouched" visually unambiguous. |

## Corrections to the Project Plan

- **The reference repo has no Web Audio API at all.** [lukew3/stemPlayerOnline](https://github.com/lukew3/stemPlayerOnline)
  is four `new Audio()` elements with `.volume` set directly — no `AudioContext`, no
  `GainNode`, no panner, grep-confirmed zero hits. Plan lines 66–68 ("Reuse from the
  reference repo: `AudioContext` setup, per-stem `GainNode` wiring") have nothing behind
  them, and Phase 0's "extract the audio-engine logic" is a no-op. Its sync is a 100ms
  `canplaythrough` poll; its loop pauses every track, seeks, and re-polls — an audible gap
  and fresh desync at every loop point. Engine here written from scratch.
- **iPhone 16 Pro is 402 × 874 CSS px**, not the ~393pt in plan line 57 (that's the 14/15 Pro).
- **The plan body is superseded by its own change log** (8/3/26), which is the last section of
  the file. Four of the body's stated requirements are now wrong: 6 stems (now 8), the
  single-viewport no-scroll constraint (dropped), the FX send (out of scope), and pages named
  by stem count (now ordinal). The plan's banner says so; this note is here for anyone who
  reads the progress file first.
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

**Session 3 update — this section is live again.** The 8/3 stem set is 165.672s at 48kHz
stereo, and measured decoded footprint is **364 MiB on page-4 (6 stems)** and **485 MiB on
page-5 (8 stems)**. So page-4 sits exactly on the "plausible but risky" line above and page-5
is well past it. Mitigation 1 (mono) is the one that matters, taking page-5 to ~242 MiB;
mitigation 3 (pin 44100) only reaches 445 MiB and costs a resample, so skip it. Untested on
device as of end of Session 3.

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

**Session 3 update — still dormant.** The new 165.672s set is 6903 mp3 frames × 1152 samples
exactly, so it lands on a frame boundary like the old one and carries no tail padding. The fix
above stays unnecessary until an export doesn't divide evenly.

### Still open from the plan

- Offline/cached vs online-only. Never settled; online-only is the de facto state.
- ~~Hosting choice: Vercel vs GitHub Pages.~~ **Resolved: GitHub Pages** — `gh` was already
  authenticated with `repo` + `workflow` scopes, so it needed no new logins, and the site is
  static-only. Revisit if per-branch preview deploys or custom slugs become worth it.
- ~~Final stem-count range (1–5 vs 2–6)~~ — **resolved by the 8/3 change log**, which fixes
  five ordinal pages at 2/3/5/6/8 stems. The question is closed, just not the way it was
  framed: the answer was neither 1–5 nor 2–6.
- ~~Pages 1–5 deferred until the layout is device-confirmed~~ — **done in Session 3.**

## v1 — Wrapped 2026-08-03

Phase 1 is complete and confirmed on device. Nothing is outstanding; everything below is
optional and nothing blocks use of the player as it stands.

**If load time is the next thing worth attacking**, in value order:

1. **Custom domain on the R2 bucket** (e.g. `audio.adamrhilton.com`). The single biggest
   remaining win and the least invasive: `r2.dev` is uncacheable *by design*, so every visit
   re-downloads all ~53 MB. A custom domain puts Cloudflare's cache in front of it, making
   repeat loads near-instant, and escapes the r2.dev rate limit — which matters more now that
   one page pull is 53 MB rather than 17 MB. Cost: one line in
   [config.js](src/shared/config.js) plus adding the origin to the CORS policy.
2. **Mono stems.** Halves both download and the 485 MiB decoded footprint. The stronger
   argument is musical, not technical: with stereo sources the pan control just rebalances an
   already-stereo image, whereas with mono sources it actually places the stem. Cost: a
   re-export, no code change.
3. **AAC instead of mp3 320.** ~34 MB rather than ~53 MB at comparable quality. Memory is
   unchanged — decoded size depends only on duration, channels and rate. Prefer AAC over Opus
   here; Safari's Opus support through `decodeAudioData` is inconsistent and this project
   targets Safari.

**Separately, worth a look at the source material:** measured whole-file peaks are 0.053 on
stem 1 (≈ −25 dBFS) and 0.242 on stem 2 (≈ −12 dBFS). That's a lot of unused headroom and it's
why the quieter pages are hard to hear on a phone speaker. If these get normalised upward,
watch the master: 8 channels at unity sum into a master gain of 1.0, so louder stems make
clipping on the summing bus more likely, not less. Lower the master gain rather than re-seeding
the faders — the neutral-defaults decision above is worth preserving.

**Closed:** mono-vs-stereo and delivery format are both now optimisations rather than
necessities — 485 MiB and ~53 MB are proven acceptable on device. Sample-rate pinning stays
rejected: it buys 445 MiB and costs a resample.

**Housekeeping carried forward:** the local copies in `src/stems/` are gitignored, so the
repo no longer backs them up — R2 and the local disk are the only copies. That now covers all
8 stems, ~53 MB. `src/stems-old/` is gone (its `.gitignore` entry is harmless and can stay).
The repo is public because Pages from a private repo needs a paid plan; nothing sensitive is
in it, but the visibility choice was never explicitly confirmed.
