/**
 * The score: a concrete set of sections for the CueEngine, wired to the
 * instrument. This is the file to compose in. Each section is a cue sheet
 * that reads top to bottom: "at 0 s do this, at 6 s do that".
 *
 * This one is a PLACEHOLDER that visits every feature once. Nothing in it
 * is on a tempo grid: times are stage directions, not bar lines.
 *
 * Note: step descriptions must be unique within a section (the display
 * uses them as keys).
 */
import type { Section } from './cues';
import type { Looper } from './looper';
import type { Granular } from './granular';
import type { FxBus } from './fx';
import type { HitResponse } from './hit-response';
import type { DelayDrift } from './drift';
import { ramp } from './engine';

export interface ScoreContext {
	loopers: Looper[];
	granular: Granular;
	fx: FxBus;
	hits: HitResponse;
	drift: DelayDrift;
}

export function buildDemoScore({ loopers, granular, fx, hits, drift }: ScoreContext): Section[] {
	const [l1, l2] = loopers;

	return [
		{
			name: 'neutral — all quiet',
			steps: [
				{
					atMs: 0,
					description: 'stop grains and loops, sends down, hit answers off',
					action: () => {
						granular.stop();
						hits.set({ enabled: false });
						drift.stop();
						loopers.forEach((l) => {
							l.stopPlayback();
							l.setReversed(false);
							l.setSpeed(1);
						});
						ramp(fx.delay.wet.gain, 0, 2000);
						ramp(fx.reverb.wet.gain, 0, 2000);
					}
				}
			]
		},
		{
			name: 'first capture',
			steps: [
				{
					atMs: 0,
					description: 'looper 1: record',
					action: () => {
						ramp(l1.gain.gain, 0, 50);
						void l1.startRecording();
					}
				},
				{
					atMs: 6000,
					description: 'looper 1: stop recording, start loop (silent)',
					action: () => {
						l1.stopRecording();
						l1.play();
					}
				},
				{
					atMs: 6100,
					description: 'looper 1 fades up over 4 s',
					action: () => ramp(l1.gain.gain, 0.8, 4000)
				}
			]
		},
		{
			name: 'answers',
			steps: [
				{
					atMs: 0,
					description: 'granulator: record 10 s of playing',
					action: () => void granular.startRecording()
				},
				{
					atMs: 10000,
					description: 'granulator: stop recording',
					action: () => granular.stopRecording()
				},
				{
					atMs: 10100,
					description: 'hit answers on — sparse, late, small',
					action: () =>
						hits.set({
							enabled: true,
							probability: 0.4,
							grains: 5,
							spreadMs: 500,
							delayMinMs: 300,
							delayMaxMs: 1500
						})
				},
				{
					atMs: 10200,
					description: 'reverb send rises over 5 s',
					action: () => ramp(fx.reverb.wet.gain, 0.25, 5000)
				}
			]
		},
		{
			name: 'thicken',
			steps: [
				{
					atMs: 0,
					description: 'delay send up over 6 s, delay time starts to drift',
					action: () => {
						ramp(fx.delay.wet.gain, 0.5, 6000);
						drift.start();
					}
				},
				{
					atMs: 100,
					description: 'looper 2: record',
					action: () => {
						ramp(l2.gain.gain, 0, 50);
						void l2.startRecording();
					}
				},
				{
					atMs: 2000,
					description: 'looper 1 slows to half speed over 8 s',
					action: () => l1.setSpeed(0.5, 8000)
				},
				{
					atMs: 4000,
					description: 'hit answers denser and wider',
					action: () => hits.set({ probability: 0.8, grains: 12, spreadMs: 1500, delayMaxMs: 2500 })
				},
				{
					atMs: 8000,
					description: 'looper 2: stop recording, play reversed, fade up over 5 s',
					action: () => {
						l2.stopRecording();
						l2.setReversed(true);
						l2.play();
						ramp(l2.gain.gain, 0.7, 5000);
					}
				},
				{
					atMs: 9000,
					description: 'reverb send up to 50% over 6 s',
					action: () => ramp(fx.reverb.wet.gain, 0.5, 6000)
				}
			]
		},
		{
			name: 'dissolve',
			steps: [
				{
					atMs: 0,
					description: 'hit answers off, grain cloud off, loops grind to a halt over 10 s',
					action: () => {
						hits.set({ enabled: false });
						granular.stop();
						loopers.forEach((l) => l.slowToStop(10000));
					}
				},
				{
					atMs: 3000,
					description: 'delay send fades over 12 s',
					action: () => ramp(fx.delay.wet.gain, 0, 12000)
				},
				{
					atMs: 10500,
					description: 'loops stop',
					action: () => loopers.forEach((l) => l.stopPlayback())
				},
				{
					atMs: 12000,
					description: 'reverb send fades over 8 s',
					action: () => ramp(fx.reverb.wet.gain, 0, 8000)
				},
				{
					atMs: 16000,
					description: 'delay drift stops',
					action: () => drift.stop()
				}
			]
		}
	];
}
