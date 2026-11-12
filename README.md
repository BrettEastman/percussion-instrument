# percussion instrument

A browser-based live-electronics instrument for a solo percussionist. You play into a microphone; the app records pieces of what you play and gives them back as loops, clouds of grains and wandering echoes. A score, advanced from the keyboard, moves the piece from section to section.

Nothing here is locked to a tempo. Loops are whatever length you record, echoes drift, and the answers to your hits arrive late and scattered. Two performances of the same score will not sound the same, and that is the point.

It is a simpler sibling of [web-instrument](https://github.com/BrettEastman/web-instrument), which was built for flute.

## What you need

- **A Chromium browser** (Chrome, Edge, Arc, Brave). It is only tested there.
- **A microphone**, ideally through an audio interface. A laptop's built-in mic will work for trying things out, but it clips easily on percussion.
- **Headphones or speakers placed away from the mic.** The mic is live, so speakers pointed at it will feed back.
- [Node.js](https://nodejs.org) 20 or newer and [pnpm](https://pnpm.io) to run it.

## Running it

```bash
pnpm install
```

```bash
pnpm dev
```

Then open the address it prints (usually `http://localhost:5173`).

## Quick start: five minutes to first sound

1. Press **Begin**. Browsers will not make sound until you click something, so this is the power switch.
2. Press **test tone** in the master panel to check you can hear the output, then press it again to stop.
3. Press **enable mic** and allow microphone access. If you have an audio interface, choose it as the input in the browser's microphone prompt or in your system sound settings before this step.
4. Play your loudest stroke and watch the **input** meter. Pull the **trim** fader down until those strokes stay out of the red.
5. On **looper 1**, press **record**, play for a few seconds, press **stop rec**, then **play loop**. You should hear yourself come back.
6. On the **granular** panel, press **record source**, play for several seconds, press **stop rec**, then **burst**. You should hear a spray of fragments of what you played.
7. In the **hits** panel, tick **answer hits with grains from the granulator**, then play. The lamp flashes on every stroke it hears, and some strokes are answered a moment later.

Once that works, press **0** to go back to the start of the score and **Space** to walk through it.

## How the sound flows

```
mic -> trim -> input meter
  |-> hit detector  --(each hit)-->  grain burst from the granulator
  |-> looper 1, looper 2
  |-> granulator
  '-> monitor (off by default)
                    |
                    v
   EQ -> flanger -> delay -> reverb -> limiter -> master -> speakers
                                                         '-> record to file
```

The mic itself is silent unless you raise **monitor**. What the audience hears from the computer is the loops, the grains and the effects.

## The panels

### Master

- **out**: the main output level.
- **main** meter: what is going to the speakers.
- **test tone**: a steady sine wave for checking the output.

### Mic

- **trim**: turns the microphone up or down before anything else hears it. Set this first. It affects what the loopers and granulator record and how the hit detector hears you.
- **input** meter: the level after trim.
- **monitor**: sends the dry mic to the speakers. It starts fully off. Raise it only with headphones on or speakers well away from the mic.

### Score

Shows the current section number and name, a clock, and the list of cues in that section. A filled dot means the cue has fired; an open one shows a countdown.

| Key | Action |
|---|---|
| Space or Right arrow | next section |
| Left arrow | previous section |
| 0 | back to section 0 (everything quiet) |

The **prev**, **next** and **0** buttons do the same. Moving to a new section cancels any cues from the old section that have not fired yet. Keys are ignored while a button or slider has focus, so click on an empty part of the page if they stop responding.

### Hits

The app listens for strokes. A hit is a sound that jumps well above how loud things have been in the last moment, so a ringing gong or a slow swell does not count, but a new stroke on top of it does.

**Listening** controls how picky the detector is:

- **threshold**: how far a stroke must jump above the recent level. Lower catches softer strokes; higher ignores all but accents.
- **floor**: the room-noise level. Raise it if the lamp flashes when you are not playing.
- **hold-off**: a short deaf period after each hit, so one stroke counts once. Raise it if single strokes register twice; lower it for fast playing.

**Answers** controls what a hit does. Each answer is a burst of grains from whatever the granulator has recorded, so record a source there first.

- **checkbox**: turns answers on or off.
- **chance**: how likely any one hit is to be answered. At 40%, most hits pass unanswered.
- **grains**: how many fragments in each answer.
- **scatter**: the fragments of one answer are spread across this much time.
- **wait**: a random pause, between the two values, before the answer begins.

The counter at the top shows how many hits were heard and how many were answered. The score changes the answer settings as it moves through sections, and the sliders follow.

### Loopers (two)

Each looper records the mic and plays it back as a loop. Looper 1 holds up to 8 seconds and looper 2 up to 16; recording stops by itself at the limit.

- **record / stop rec**: capture a loop. Recording again replaces it.
- **play loop / stop**: start and stop playback.
- **reverse**: play the loop backwards.
- **speed**: from 0.1× to 4×. Slower is lower and longer, like a tape machine.
- **slow to stop · 10s**: the loop grinds to a halt over ten seconds.
- **into reverse · 4s**: slows down, flips direction and speeds back up.
- **back to N× · 3s**: glides back to the speed slider's value.
- **level** and meter: this looper's volume.

### Granular

The granulator records up to 25 seconds, then plays tiny fragments (grains) of that recording, each from a random place, at a random length and pitch.

- **record source / stop rec**: capture the material.
- **start grains / stop grains**: a continuous cloud.
- **burst**: one short spray of eight grains. This is the same gesture a detected hit triggers.
- **start**: which part of the recording grains are taken from (two sliders set a range).
- **length**: how long each grain lasts.
- **pitch**: how far grains are transposed, in semitones.
- **interval** and **jitter**: for the continuous cloud, the time between grains and how irregular it is.
- **attack**: how much of each grain is spent fading in. Low values keep the bite of the stroke; high values turn hits into swells.
- **level** and meter: the granulator's volume.

### FX bus

Everything passes through these on the way out.

- **EQ**: one filter. Pick a type, then set frequency, gain and Q (width).
- **Flanger**: a sweeping, hollow colour. **wet** at 0% is off.
- **Delay**: an echo. **send** is how much signal goes into it and **repeats** is how long the echoes continue. The **time** sliders set a range, and with **drift on** the echo time wanders within that range, bending the pitch of the repeats as it moves. **now** shows the current echo time.
- **Reverb**: a room. **send** at 0% is off.
- **Limiter**: a safety net that catches loud peaks. The bar shows how hard it is working. If it is constantly busy, turn the trim or the unit levels down.

The delay and reverb sends are also moved by the score. The sliders do not follow those moves, so after a section change a slider may not match what you hear until you touch it.

### Record output

Press **record**, play, press **stop**. A link appears with a timestamped file name (`.webm`); click it to download. The recording is exactly what reaches the speakers. Takes are kept only until you close or reload the tab, so download the ones you want.

## The demo score

The included score is a placeholder that visits every feature once. Replace it with your own piece.

| # | Section | What happens |
|---|---|---|
| 0 | neutral | Everything stops, sends go down, hit answers off. |
| 1 | first capture | Looper 1 records for 6 seconds, then loops and fades up. Play as soon as you enter. |
| 2 | answers | The granulator records 10 seconds of playing. After that, hits are answered sparsely and reverb rises. |
| 3 | thicken | Delay comes up and starts to drift. Looper 2 records 8 seconds and returns reversed. Looper 1 slows to half speed. Answers get denser. |
| 4 | dissolve | Answers stop, loops grind to a halt, delay and reverb fade out. |

### Writing your own score

The score lives in [`src/lib/audio/score.ts`](src/lib/audio/score.ts). A section is a name and a list of steps, and each step is a time in milliseconds after the section starts, a description shown on screen, and an action:

```ts
{
	name: 'my section',
	steps: [
		{ atMs: 0, description: 'looper 1: record', action: () => void l1.startRecording() },
		{ atMs: 5000, description: 'looper 1: stop and play', action: () => { l1.stopRecording(); l1.play(); } },
		{ atMs: 5100, description: 'reverb up over 8 s', action: () => ramp(fx.reverb.wet.gain, 0.4, 8000) }
	]
}
```

Useful actions:

- Loopers: `startRecording()`, `stopRecording()`, `play()`, `stopPlayback()`, `setSpeed(speed, rampMs)`, `setReversed(true)`, `slowToStop(ms)`, `rampIntoReverse(ms)`
- Granulator: `startRecording()`, `stopRecording()`, `start()`, `stop()`, `burst(count, spreadMs, delayMs)`
- Hit answers: `hits.set({ enabled, probability, grains, spreadMs, delayMinMs, delayMaxMs })`
- Delay drift: `drift.start()`, `drift.stop()`
- Any level: `ramp(param, target, ms)`, for example `ramp(fx.delay.wet.gain, 0.5, 6000)`

Step descriptions must be different from each other within a section.

## Troubleshooting

- **No sound at all.** Press Begin, check the master fader, and try the test tone. If the tone is silent, the problem is the computer's output device.
- **"Permission denied" under enable mic.** The browser blocked the microphone. Click the icon at the left of the address bar, allow the microphone, and reload.
- **The wrong microphone is being used.** Choose the input in Chrome's site settings (the same address-bar icon) or in the system sound settings, then reload.
- **Howling feedback.** Pull the monitor and master faders down. Use headphones, or move the speakers away from the mic.
- **The hit lamp flashes constantly, or never.** Constantly: raise floor or threshold. Never: lower them, or raise trim.
- **Hits are heard but nothing answers.** The granulator needs a recorded source, the answers checkbox must be on, and chance must be above 0%.
- **Loops and answers feel late.** A browser's microphone-to-speaker round trip is roughly 20 to 50 ms. The instrument is designed around that: nothing in it needs to land exactly with the stick.
- **Keyboard cues do nothing.** A button or slider has focus. Click an empty area of the page.

## For developers

- SvelteKit 5 with TypeScript, and the raw Web Audio API with no audio libraries.
- Audio code is in `src/lib/audio/`, interface panels in `src/lib/components/`, and the two audio-thread processors (recorder and hit detector) in `static/worklets/`.
- Run `pnpm run check` for type checking; it should report 0 errors and 0 warnings.

| File | Role |
|---|---|
| `engine.ts` | Audio context, master chain, limiter, the `ramp()` helper |
| `mic.ts` | Microphone input with trim and monitor |
| `looper.ts` | Record and loop with speed and reverse |
| `granular.ts` | Grain cloud and bursts |
| `onset.ts` + `worklets/onset.js` | Hit detection |
| `hit-response.ts` | Decides how hits are answered |
| `fx.ts`, `drift.ts` | EQ, flanger, delay, reverb, and the wandering delay time |
| `cues.ts`, `score.ts` | The cue engine and the score |
| `output-recorder.ts` | Recording the output to a file |
