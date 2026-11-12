/**
 * DelayDrift — makes a delay time wander on its own.
 *
 * Nothing in this piece sits on a tempo grid, so the echo shouldn't either.
 * On a loose timer we pick a new random delay time and glide to it. While
 * the time is gliding the repeats bend in pitch, like a tape echo whose
 * motor can't hold a steady speed.
 *
 * Timing is setTimeout on purpose: this is a conductor-level gesture
 * (seconds), and the glide itself is a sample-accurate AudioParam ramp.
 */
import { ramp } from './engine';

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

export class DelayDrift {
	/** Range the delay time wanders within, in seconds. */
	minSec = 0.25;
	maxSec = 1.1;
	/** Roughly how often a new target is chosen, ms (randomised 0.5x..1.5x). */
	everyMs = 5000;
	running = false;

	private timer = 0;

	constructor(private readonly delayTime: AudioParam) {}

	start(): void {
		if (this.running) return;
		this.running = true;
		this.step();
	}

	stop(): void {
		this.running = false;
		clearTimeout(this.timer);
		this.timer = 0;
	}

	private step(): void {
		if (!this.running) return;
		const wait = this.everyMs * rand(0.5, 1.5);
		const lo = Math.min(this.minSec, this.maxSec);
		const hi = Math.max(this.minSec, this.maxSec);
		// Glide for most of the wait, then hold: the echo settles, then moves again.
		ramp(this.delayTime, rand(lo, hi), wait * 0.6);
		this.timer = window.setTimeout(() => this.step(), wait);
	}
}
