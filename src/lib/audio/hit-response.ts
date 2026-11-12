/**
 * HitResponse — decides what a detected hit does.
 *
 * Each hit may (or may not) be answered by a burst of grains from the
 * granulator's recorded buffer, some time later. Everything here is loose
 * on purpose: not every hit gets an answer, and the answers arrive late
 * and scattered. Think of a second player echoing you from across the
 * room, half listening.
 *
 * The score changes `settings` section by section.
 */
import type { Granular } from './granular';
import type { OnsetDetector } from './onset';

export interface HitSettings {
	enabled: boolean;
	/** Chance (0..1) that any given hit is answered. */
	probability: number;
	/** Grains per answer. */
	grains: number;
	/** The grains of one answer are scattered across this many ms. */
	spreadMs: number;
	/** Random wait before the answer starts, ms. */
	delayMinMs: number;
	delayMaxMs: number;
}

export class HitResponse {
	settings: HitSettings = {
		enabled: false,
		probability: 0.5,
		grains: 6,
		spreadMs: 600,
		delayMinMs: 300,
		delayMaxMs: 1500
	};
	/** Hits that were answered — an odometer for the UI. */
	answered = 0;

	constructor(
		detector: OnsetDetector,
		private readonly granular: Granular
	) {
		detector.onHit(() => this.handleHit());
	}

	/** Change any subset of the settings (used by the score). */
	set(patch: Partial<HitSettings>): void {
		Object.assign(this.settings, patch);
	}

	private handleHit(): void {
		const s = this.settings;
		if (!s.enabled || this.granular.state === 'empty' || this.granular.state === 'recording') return;
		if (Math.random() > s.probability) return;
		const lo = Math.min(s.delayMinMs, s.delayMaxMs);
		const hi = Math.max(s.delayMinMs, s.delayMaxMs);
		this.granular.burst(s.grains, s.spreadMs, lo + Math.random() * (hi - lo));
		this.answered++;
	}
}
