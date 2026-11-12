<script lang="ts">
	import { initEngine, type MasterChain } from '$lib/audio/engine';
	import { startTestTone, type Voice } from '$lib/audio/sources';
	import { enableMic, type MicInput } from '$lib/audio/mic';
	import { Looper } from '$lib/audio/looper';
	import { Granular } from '$lib/audio/granular';
	import { OnsetDetector } from '$lib/audio/onset';
	import { HitResponse } from '$lib/audio/hit-response';
	import { DelayDrift } from '$lib/audio/drift';
	import { CueEngine } from '$lib/audio/cues';
	import { buildDemoScore } from '$lib/audio/score';
	import Meter from '$lib/components/Meter.svelte';
	import Fader from '$lib/components/Fader.svelte';
	import LooperUnit from '$lib/components/LooperUnit.svelte';
	import GranularUnit from '$lib/components/GranularUnit.svelte';
	import CueDisplay from '$lib/components/CueDisplay.svelte';
	import FxPanel from '$lib/components/FxPanel.svelte';
	import HitPanel from '$lib/components/HitPanel.svelte';
	import RecordPanel from '$lib/components/RecordPanel.svelte';

	// Two loops of different maximum lengths, so they never line up for long.
	const LOOPER_SECONDS: number[] = [8, 16];
	const GRANULAR_SECONDS = 25;

	// Audio objects live in $state.raw: AudioNodes must never be wrapped in proxies.
	let master = $state.raw<MasterChain | null>(null);
	let drift = $state.raw<DelayDrift | null>(null);
	let tone = $state.raw<Voice | null>(null);
	let mic = $state.raw<MicInput | null>(null);
	let micError = $state('');
	let loopers = $state.raw<Looper[]>([]);
	let granular = $state.raw<Granular | null>(null);
	let detector = $state.raw<OnsetDetector | null>(null);
	let hits = $state.raw<HitResponse | null>(null);
	let cueEngine = $state.raw<CueEngine | null>(null);

	// Score keys: Space / Right = next section, Left = previous, 0 = back to neutral.
	$effect(() => {
		if (!cueEngine) return;
		const engine = cueEngine;
		const onKey = (e: KeyboardEvent) => {
			const t = e.target as HTMLElement | null;
			if (t && ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(t.tagName)) return;
			if (e.code === 'Space' || e.key === 'ArrowRight') {
				e.preventDefault();
				engine.next();
			} else if (e.key === 'ArrowLeft') {
				engine.prev();
			} else if (e.key === '0') {
				engine.reset();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	async function begin() {
		const chain = await initEngine();
		drift = new DelayDrift(chain.fx.delay.node.delayTime);
		master = chain;
	}

	function toggleTone() {
		if (tone) {
			tone.stop();
			tone = null;
		} else {
			tone = startTestTone();
		}
	}

	async function onEnableMic() {
		if (!master || !drift) return;
		micError = '';
		try {
			const input = await enableMic();
			const newLoopers = LOOPER_SECONDS.map((seconds) => new Looper(input.input, seconds));
			const newGranular = new Granular(input.input, GRANULAR_SECONDS);
			const newDetector = await OnsetDetector.create(input.input);
			const newHits = new HitResponse(newDetector, newGranular);

			mic = input;
			loopers = newLoopers;
			granular = newGranular;
			detector = newDetector;
			hits = newHits;
			cueEngine = new CueEngine(
				buildDemoScore({ loopers: newLoopers, granular: newGranular, fx: master.fx, hits: newHits, drift })
			);
		} catch (e) {
			micError = e instanceof Error ? e.message : String(e);
		}
	}
</script>

<main>
	<h1>percussion instrument</h1>
	<p class="sub">live electronics for solo percussion — loops, grains that answer your hits, a wandering echo</p>

	{#if !master || !drift}
		<button class="begin" onclick={begin}>Begin</button>
		<p class="hint">browsers only start audio after a click</p>
	{:else}
		<section>
			<h2>master</h2>
			<Fader param={master.masterGain.gain} label="out" initialDb={-6} />
			<Meter analyser={master.analyser} label="main" />
			<div class="row">
				<button onclick={toggleTone}>{tone ? 'stop tone' : 'test tone'}</button>
			</div>
		</section>

		<section>
			<h2>mic</h2>
			{#if !mic}
				<div class="row"><button onclick={onEnableMic}>enable mic</button></div>
				{#if micError}<p class="error">{micError}</p>{/if}
			{:else}
				<Fader param={mic.input.gain} label="trim" initialDb={0} min={-30} max={12} />
				<Meter analyser={mic.analyser} label="input" />
				<Fader param={mic.monitorGain.gain} label="monitor" initialDb={-70} />
				<p class="hint">
					trim down until the loudest strokes stay out of the red · monitor is muted by default
				</p>
			{/if}
		</section>

		{#if cueEngine}
			<CueDisplay engine={cueEngine} />
		{/if}

		{#if detector && hits}
			<HitPanel {detector} {hits} />
		{/if}

		{#each loopers as looper, i (i)}
			<LooperUnit {looper} index={i} />
		{/each}

		{#if granular}
			<GranularUnit {granular} />
		{/if}

		<FxPanel fx={master.fx} {drift} limiter={master.limiter} />

		<RecordPanel />
	{/if}
</main>

<style>
	:global(body) {
		margin: 0;
		background: #0e1216;
		color: #e8e6e3;
		font-family: system-ui, sans-serif;
		--dim: #8b98a0;
	}
	main {
		max-width: 640px;
		margin: 0 auto;
		padding: 2rem 1.25rem 4rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
	h1 {
		font-size: 1.4rem;
		font-weight: 600;
		margin: 0;
		letter-spacing: 0.02em;
	}
	h2 {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--dim);
		margin: 0 0 0.75rem;
	}
	.sub {
		color: var(--dim);
		margin: -0.75rem 0 0;
		font-size: 0.85rem;
	}
	section {
		background: #151b21;
		border: 1px solid #222b33;
		border-radius: 10px;
		padding: 1rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
	}
	button {
		background: #223039;
		color: #e8e6e3;
		border: 1px solid #33454f;
		border-radius: 7px;
		padding: 0.45rem 0.9rem;
		font-size: 0.85rem;
		cursor: pointer;
	}
	button:hover:not(:disabled) {
		background: #2b3d48;
	}
	.begin {
		align-self: flex-start;
		font-size: 1.1rem;
		padding: 0.8rem 2.2rem;
		background: #2c4a45;
		border-color: #4a9d8f;
	}
	.hint {
		color: var(--dim);
		font-size: 0.75rem;
		margin: 0;
	}
	.error {
		color: #d1495b;
		font-size: 0.8rem;
	}
</style>
