<script lang="ts">
	// The tape machine at the back of the hall: record the master output
	// to a file. Each take gets a timestamped download link.
	import { OutputRecorder } from '$lib/audio/output-recorder';

	interface Take {
		url: string;
		filename: string;
		seconds: number;
	}

	const recorder = new OutputRecorder();

	let recording = $state(false);
	let elapsed = $state(0);
	let takes = $state<Take[]>([]);

	$effect(() => {
		const id = setInterval(() => {
			if (recorder.recording) elapsed = (performance.now() - recorder.startedAt) / 1000;
		}, 200);
		return () => clearInterval(id);
	});

	function timestamp(): string {
		const d = new Date();
		const p = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
	}

	async function toggle() {
		if (!recorder.recording) {
			elapsed = 0;
			recorder.start();
			recording = true;
			return;
		}
		const seconds = elapsed;
		const blob = await recorder.stop();
		recording = false;
		if (blob && blob.size > 0) {
			takes = [
				...takes,
				{ url: URL.createObjectURL(blob), filename: `percussion-${timestamp()}.webm`, seconds }
			];
		}
	}

	const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
</script>

<section>
	<h2>record output</h2>
	<div class="row">
		<button class:rec={recording} onclick={toggle}>{recording ? 'stop' : 'record'}</button>
		{#if recording}<span class="clock">{clock(elapsed)}</span>{/if}
	</div>
	{#each takes as take (take.url)}
		<a href={take.url} download={take.filename}>{take.filename} · {clock(take.seconds)}</a>
	{/each}
	<p class="hint">records what reaches the speakers (webm/opus) — takes live in this tab until downloaded</p>
</section>

<style>
	section {
		background: #151b21;
		border: 1px solid #222b33;
		border-radius: 10px;
		padding: 1rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	h2 {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--dim);
		margin: 0;
	}
	.row {
		display: flex;
		gap: 0.75rem;
		align-items: center;
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
	button.rec {
		background: #5c2330;
		border-color: #8a3547;
	}
	.clock {
		font-variant-numeric: tabular-nums;
		color: #ff6b81;
		font-size: 0.9rem;
	}
	a {
		color: #90bec6;
		font-size: 0.8rem;
	}
	.hint {
		color: var(--dim);
		font-size: 0.72rem;
		margin: 0;
	}
</style>
