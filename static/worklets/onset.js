/**
 * Hit (onset) detector — runs on the audio thread.
 *
 * Two envelope followers listen to the same input:
 *  - `fast` jumps up with every stroke and falls back within ~20 ms
 *  - `slow` answers "how loud has it been lately?": it rises within ~10 ms
 *    of a stroke but takes ~150 ms to let go
 *
 * A hit is when fast leaps well above (slow + floor). Comparing against the
 * recent level rather than a fixed one means a ringing gong or vibraphone
 * bar doesn't keep re-triggering: while it rings, slow has caught up with
 * fast. It is the difference between hearing an accent and hearing loudness.
 *
 * `floor` is added to the baseline so that near-silence isn't treated as
 * "infinitely quieter": without it, the noisy tail of a stroke or a slow
 * swell from nothing (a bowed cymbal, a soft roll) would count as hits.
 *
 * `refractory` is a short deaf period after each hit so one stroke (and
 * its first reflections) counts once.
 */
class OnsetProcessor extends AudioWorkletProcessor {
	constructor() {
		super();
		this.fast = 0;
		this.slow = 0;
		this.threshold = 2.5; // fast must exceed slow by this ratio
		this.floor = 0.02; // room-noise level, added to the baseline
		this.refractory = Math.round(sampleRate * 0.08);
		this.since = this.refractory; // samples since the last hit

		this.fastRelease = Math.exp(-1 / (sampleRate * 0.02));
		// Slow rises quickly so that by the time the hold-off ends it already
		// knows about the stroke that just happened, and falls slowly so the
		// stroke's own tail can't look like a new one.
		this.slowAttack = Math.exp(-1 / (sampleRate * 0.01));
		this.slowRelease = Math.exp(-1 / (sampleRate * 0.15));

		this.port.onmessage = (e) => {
			const d = e.data;
			if (typeof d.threshold === 'number') this.threshold = d.threshold;
			if (typeof d.floor === 'number') this.floor = d.floor;
			if (typeof d.refractoryMs === 'number') {
				this.refractory = Math.round((sampleRate * d.refractoryMs) / 1000);
			}
		};
	}

	process(inputs) {
		const ch = inputs[0] && inputs[0][0];
		if (!ch) return true;

		for (let i = 0; i < ch.length; i++) {
			const x = Math.abs(ch[i]);
			// Fast follower: instant attack, quick release.
			this.fast = x > this.fast ? x : this.fast * this.fastRelease;

			if (
				this.since >= this.refractory &&
				this.fast > (this.slow + this.floor) * this.threshold
			) {
				this.since = 0;
				this.port.postMessage({ level: this.fast });
			}

			// Slow follower is updated after the comparison, so the stroke is
			// judged against what came before it.
			const c = x > this.slow ? this.slowAttack : this.slowRelease;
			this.slow = c * this.slow + (1 - c) * x;
			this.since++;
		}
		return true;
	}
}

registerProcessor('onset', OnsetProcessor);
