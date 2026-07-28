# Stem Player Pages — Project Plan

## Overview
A set of static, personal-use web pages, each a lightweight stem player with a
fixed, hardcoded set of audio stems. Build all 6 pages, scaling from 1 stem up
to 6 stems. Final stem-count range (whether the sequence starts at 1 or 2, and
correspondingly ends at 5 or 6) is still being decided — build all 6 now and
discard whichever end isn't needed once that's finalized. Based on the
audio-engine approach in [lukew3/stemPlayerOnline](https://github.com/lukew3/stemPlayerOnline)
(Unlicense), but with a simplified, mobile-first mixer UI instead of the
original's device-styled interface.

## Core Requirements
**Functional**
- Build 6 static pages, N = 1 through 6, each with a fixed, non-editable set
  of stem audio files hardcoded at build time. Once the final stem-count range
  is decided (1–5 or 2–6), discard the unused page — the other 5 stand as the
  final set. Build all 6 rather than guessing, since discarding one later is
  cheap and guessing wrong is not.
- Per-stem controls: volume (fader), mute toggle, pan.
- Dummy FX-send UI per stem on every page from the start (see "FX Send: Dummy
  UI First" below) — not wired to actual audio processing yet.
- Playback is synced across all stems on a page (single transport: play/pause,
  scrub/seek).
- All stems loop on continued playback.
- Mobile-first: on the page with the most stems (6, or 5 if page 6 is
  discarded), every control must be visible and usable within a single
  iPhone 16 Pro portrait viewport — no scrolling required to reach or operate
  any control.

**Non-functional**
- Hosting for the pages: Vercel or GitHub Pages. Custom domain not required;
  optional custom slugs on an existing domain if convenient.
- Audio files hosted on Adam's existing Cloudflare R2 bucket (already used for
  adamrhilton.com), in their own prefix/folder, separate from site CMS assets.
- No build complexity beyond what's needed — utilitarian UI now, polish later
  if time allows before any deadline.

**Dummy-UI-now, wired-later (Phase 2 stretch)**
- Per-track fixed effect send (reverb or distortion, one per track,
  non-selectable). The UI element (e.g. a small "send" indicator or label per
  row) is built in Phase 1 as a visual placeholder alongside the other
  controls, so the row layout doesn't need to be revisited later. Actually
  wiring it to real audio processing is Phase 2, attempted only after the
  core player is fully functional on all pages, and scrapped without layout
  consequences if time runs out.

## Key Design Decision: Mobile Layout
Reject the "vertical fader strips side-by-side" mixer metaphor (real hardware
mixer look) in favor of **horizontal rows, stacked vertically** — one row per
stem:

```
[ Stem label ]  [Mute]  [Pan: - o - ]  [FX: reverb]  <- dummy, unwired in Phase 1
[=======O=========================]  <- horizontal fader, full row width
```

Rationale: 5–6 vertical strips side-by-side don't fit a ~393pt-wide viewport
with usable (44pt+) touch targets. Horizontal rows scale down the width axis
(one row = full width) rather than fighting it, and stacking rows only
consumes vertical space, which a phone has more of in portrait. This is the
same pattern most mobile mixer/DAW apps use.

## Tech Approach
- Vanilla JS + Web Audio API. No UI framework needed — the interactive
  surface is small (3 controls × up to 6 channels), so a component library
  would add more overhead than it saves.
- Reuse from the reference repo: `AudioContext` setup, per-stem `GainNode`
  wiring, and playback-sync/scrub logic.
- Replace from the reference repo: the entire view layer (device-styled
  sliders/graphics) with plain `<input type="range">` (fader + pan) and a
  toggle `<button>` (mute), styled as rows via CSS flexbox/grid.
- Signal chain per stem, built with a gap left for Phase 2:
  `source → gain (volume/mute) → panner → [future: effect send insert] → destination`
  Leaving this gap now means Phase 2 doesn't require rewiring the audio graph.
- Audio files fetched from Cloudflare R2 via absolute URLs. Set
  `Access-Control-Allow-Origin` on the bucket now (even though not strictly
  needed for a plain `<audio>` tag) so Phase 2 effect/analysis nodes — which
  do require CORS-clean fetches for `decodeAudioData` — aren't blocked later.

## File / Page Structure
- One shared JS module (or small set of modules) for: audio engine, channel
  row component, transport controls.
- Each page is a thin HTML file that imports the shared module and passes a
  config: stem count + list of R2 file URLs + labels.
- Suggested layout:
  ```
  /public or /src
    /shared
      audio-engine.js
      channel-row.js
      transport.js
      styles.css
    page-1.html  (1 stem)
    page-2.html  (2 stems)
    page-3.html  (3 stems)
    page-4.html  (4 stems)
    page-5.html  (5 stems)
    page-6.html  (6 stems, if used)
  ```

## Phased Build Plan
**Phase 0 — Setup**
- Fork/clone reference repo, identify and extract the audio-engine logic
  (AudioContext, GainNode graph, transport/scrub sync).
- Set up R2 bucket prefix for stem audio files, confirm CORS config.

**Phase 1 — Core functional player (primary deliverable)**
1. Build shared audio engine module (load N stems, per-stem gain + pan nodes,
   synced transport).
2. Build channel-row UI component (fader, mute, pan, dummy FX-send label)
   styled per the mobile row layout above. The FX-send element renders but
   does nothing yet — no audio node behind it.
3. Wire audio engine to R2-hosted files via config.
4. Build all 6 page templates (1–6 stems), each parameterized by stem
   count/files.
5. Verify mobile layout on iPhone 16 Pro viewport (or emulator) — all controls,
   including the dummy FX element, visible/usable without scrolling, on the
   6-stem page.
6. Deploy to Vercel or GitHub Pages; set up slugs if using a custom domain.
7. Once the final stem-count range is decided, discard the unused page (1 or
   6) from the deployed set.

**Phase 2 — Effect sends (stretch goal, after Phase 1 is fully working)**
1. Add effect nodes to the signal chain gap (e.g. `ConvolverNode` for reverb
   with an impulse-response file, or `WaveShaperNode` for distortion).
2. Assign one fixed, non-selectable effect per track per page (predetermined
   in config), and wire the existing dummy FX-send UI element to it.
3. Re-verify CORS/decode path still works with the added nodes.
4. If Phase 2 doesn't fit in time, leave the dummy FX-send element in place as
   a visual-only feature, or remove it — either way, no layout rework needed.

## Open Questions / Assumptions to Confirm Before Starting
- Confirm final stem-count range (1–5 vs 2–6) so the unused page (1 or 6) can
  be discarded — not needed to start Phase 1, since all 6 are built regardless.
- Confirm audio file formats/sizes (affects R2 setup and load-time UX on
  mobile, e.g. whether to lazy-load stems beyond the first).
- Confirm whether pages need to work offline/cached, or straightforward
  online-only is fine.

## Acceptance Criteria (per page)
- [ ] Correct number of stems load and play in sync.
- [ ] Each stem has working volume fader, mute toggle, pan control.
- [ ] Dummy FX-send UI element present per stem row (unwired in Phase 1).
- [ ] Single transport (play/pause, seek) controls all stems together.
- [ ] On the 6-stem page, all rows and controls (including the dummy FX
      element) are visible and operable within an iPhone 16 Pro portrait
      viewport without scrolling.
- [ ] Page loads audio from Cloudflare R2, not bundled in the repo.
- [ ] Page deploys cleanly to Vercel/GitHub Pages.

## Note for Claude Code / VS Code Integration
This plan is written to be handed directly to Claude Code as a working spec.
Suggested first prompt when starting the session: point Claude Code at this
file plus the cloned/forked `stemPlayerOnline` repo, and ask it to begin with
Phase 0 (extracting the audio-engine logic) before touching UI.

## locally hosting
run `python3 -m http.server 8000`