/**
 * OnsetDetector — turns the playing itself into a control signal.
 *
 * Wraps the onset AudioWorklet (static/worklets/onset.js). The detection
 * happens on the audio thread; each hit arrives here as a message, a few
 * milliseconds late. That lateness is fine for this piece: hits trigger
 * blurry, delayed answers, never anything that has to land with the stick.
 */
import { getContext } from './engine';

export type HitListener = (level: number) => void;

export class OnsetDetector {
	/** Hits heard since the detector was created. */
	hitCount = 0;
	/** Level (0..1) of the most recent hit. */
	lastLevel = 0;
	/** performance.now() of the most recent hit, for the UI flash. */
	lastHitAt = 0;

	threshold = 2.5;
	floor = 0.02;
	refractoryMs = 80;

	private listeners = new Set<HitListener>();

	private constructor(private readonly node: AudioWorkletNode) {
		node.port.onmessage = (e: MessageEvent<{ level: number }>) => {
			this.hitCount++;
			this.lastLevel = e.data.level;
			this.lastHitAt = performance.now();
			this.listeners.forEach((fn) => fn(e.data.level));
		};
	}

	static async create(input: AudioNode): Promise<OnsetDetector> {
		const ctx = getContext();
		await ctx.audioWorklet.addModule('/worklets/onset.js');
		const node = new AudioWorkletNode(ctx, 'onset', { numberOfOutputs: 1 });

		// A worklet only runs while something downstream pulls audio from it,
		// so it goes through a muted gain to the destination.
		const pull = ctx.createGain();
		pull.gain.value = 0;
		input.connect(node);
		node.connect(pull);
		pull.connect(ctx.destination);

		return new OnsetDetector(node);
	}

	/** Subscribe to hits. Returns an unsubscribe function. */
	onHit(fn: HitListener): () => void {
		this.listeners.add(fn);
		return () => this.listeners.delete(fn);
	}

	/** How far a stroke must jump above the recent level (higher = less sensitive). */
	setThreshold(ratio: number): void {
		this.threshold = ratio;
		this.node.port.postMessage({ threshold: ratio });
	}

	/** Room-noise level added to the baseline; raise it to ignore quiet strokes and swells. */
	setFloor(level: number): void {
		this.floor = level;
		this.node.port.postMessage({ floor: level });
	}

	/** Deaf time after each hit, ms. */
	setRefractory(ms: number): void {
		this.refractoryMs = ms;
		this.node.port.postMessage({ refractoryMs: ms });
	}
}
