<script lang="ts">
	// Hit detection and what hits do. The lamp flashes on every detected
	// stroke; the controls below decide how picky the detector is and how
	// the granulator answers. The score also changes the answer settings,
	// so they are mirrored from the engine on a light poll.
	import type { OnsetDetector } from '$lib/audio/onset';
	import type { HitResponse } from '$lib/audio/hit-response';
	import RangeSlider from './RangeSlider.svelte';

	let { detector, hits }: { detector: OnsetDetector; hits: HitResponse } = $props();

	let hitCount = $state(0);
	let answered = $state(0);
	let lit = $state(false);

	let threshold = $state(2.5);
	let floorDb = $state(-34);
	let refractoryMs = $state(80);

	let enabled = $state(false);
	let probability = $state(0.5);
	let grains = $state(6);
	let spreadMs = $state(600);
	let delayLo = $state(300);
	let delayHi = $state(1500);

	$effect(() => {
		const id = setInterval(() => {
			hitCount = detector.hitCount;
			answered = hits.answered;
			lit = performance.now() - detector.lastHitAt < 140;
			const s = hits.settings;
			enabled = s.enabled;
			probability = s.probability;
			grains = s.grains;
			spreadMs = s.spreadMs;
			delayLo = s.delayMinMs;
			delayHi = s.delayMaxMs;
		}, 60);
		return () => clearInterval(id);
	});

	const num = (e: Event) => Number((e.target as HTMLInputElement).value);
</script>

<section>
	<div class="head">
		<div class="lamp" class:lit></div>
		<h2>hits</h2>
		<span class="hint count">{hitCount} heard · {answered} answered</span>
	</div>

	<div class="group">
		<span class="group-label">listening</span>
		<label class="fader-row">
			<span class="label">threshold</span>
			<input
				type="range"
				min="1.3"
				max="8"
				step="0.1"
				value={threshold}
				oninput={(e) => {
					threshold = num(e);
					detector.setThreshold(threshold);
				}}
			/>
			<span class="value">×{threshold.toFixed(1)}</span>
		</label>
		<label class="fader-row">
			<span class="label">floor</span>
			<input
				type="range"
				min="-60"
				max="-6"
				step="1"
				value={floorDb}
				oninput={(e) => {
					floorDb = num(e);
					detector.setFloor(Math.pow(10, floorDb / 20));
				}}
			/>
			<span class="value">{floorDb} dB</span>
		</label>
		<label class="fader-row">
			<span class="label">hold-off</span>
			<input
				type="range"
				min="30"
				max="600"
				step="10"
				value={refractoryMs}
				oninput={(e) => {
					refractoryMs = num(e);
					detector.setRefractory(refractoryMs);
				}}
			/>
			<span class="value">{refractoryMs} ms</span>
		</label>
		<p class="hint">
			threshold: how far a stroke must jump above the recent level · floor: ignore anything quieter ·
			hold-off: deaf time after each hit
		</p>
	</div>

	<div class="group">
		<span class="group-label">answers (grain bursts)</span>
		<label class="check">
			<input
				type="checkbox"
				checked={enabled}
				onchange={(e) => hits.set({ enabled: (e.target as HTMLInputElement).checked })}
			/>
			<span>answer hits with grains from the granulator</span>
		</label>
		<label class="fader-row">
			<span class="label">chance</span>
			<input
				type="range"
				min="0"
				max="1"
				step="0.05"
				value={probability}
				oninput={(e) => hits.set({ probability: num(e) })}
			/>
			<span class="value">{(probability * 100).toFixed(0)}%</span>
		</label>
		<label class="fader-row">
			<span class="label">grains</span>
			<input type="range" min="1" max="40" step="1" value={grains} oninput={(e) => hits.set({ grains: num(e) })} />
			<span class="value">{grains}</span>
		</label>
		<label class="fader-row">
			<span class="label">scatter</span>
			<input
				type="range"
				min="0"
				max="4000"
				step="50"
				value={spreadMs}
				oninput={(e) => hits.set({ spreadMs: num(e) })}
			/>
			<span class="value">{spreadMs} ms</span>
		</label>
		<RangeSlider
			label="wait"
			min={0}
			max={5000}
			step={50}
			unit=" ms"
			bind:lo={delayLo}
			bind:hi={delayHi}
			onchange={(lo, hi) => hits.set({ delayMinMs: lo, delayMaxMs: hi })}
		/>
	</div>
</section>

<style>
	section {
		background: #1c1517;
		border: 1px solid #40262c;
		border-radius: 10px;
		padding: 1rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}
	.head {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	h2 {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--dim);
		margin: 0;
	}
	.lamp {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #3a2228;
		border: 1px solid #5c333d;
		transition: background 120ms ease-out;
	}
	.lamp.lit {
		background: #ff6b81;
		box-shadow: 0 0 10px #ff6b81;
		transition: none;
	}
	.count {
		margin-left: auto;
		font-variant-numeric: tabular-nums;
	}
	.group {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.group-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #e0788a;
	}
	.fader-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.label {
		font-size: 0.7rem;
		color: var(--dim);
		min-width: 3.5rem;
	}
	.fader-row input {
		flex: 1;
		accent-color: #e0788a;
	}
	.value {
		font-size: 0.7rem;
		color: var(--dim);
		min-width: 4.5rem;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.check {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
	}
	.check input {
		accent-color: #e0788a;
	}
	.hint {
		color: var(--dim);
		font-size: 0.72rem;
		margin: 0;
	}
</style>
