/**
 * Microphone input — the patch's ezadc~ / "mic on/off" toggle.
 *
 * We disable the browser's voice-call processing (echo cancellation, noise
 * suppression, auto gain) because they mangle musical signals.
 *
 * The mic first passes through `input`, a trim gain: percussion peaks hard,
 * so this is the pad switch on the preamp. Everything downstream hears the
 * trimmed signal:
 *  - an analyser for the input level meter
 *  - a monitor gain into the master bus, defaulted to silence (feedback safety)
 *  - loopers, the granulator and the hit detector tap `input`.
 */
import { getContext, getMaster } from './engine';

export interface MicInput {
	source: MediaStreamAudioSourceNode;
	/** Trimmed mic signal — connect loopers, granulator and detector to this. */
	input: GainNode;
	analyser: AnalyserNode;
	/** Dry monitor into the master bus. Default 0 — turn up with care. */
	monitorGain: GainNode;
	stream: MediaStream;
	stop: () => void;
}

let mic: MicInput | null = null;

export function getMic(): MicInput | null {
	return mic;
}

export async function enableMic(): Promise<MicInput> {
	if (mic) return mic;
	const ctx = getContext();

	const stream = await navigator.mediaDevices.getUserMedia({
		audio: {
			echoCancellation: false,
			noiseSuppression: false,
			autoGainControl: false
		}
	});

	const source = ctx.createMediaStreamSource(stream);

	const analyser = ctx.createAnalyser();
	analyser.fftSize = 2048;
	const input = ctx.createGain();
	input.gain.value = 1;
	source.connect(input);
	input.connect(analyser);

	const monitorGain = ctx.createGain();
	monitorGain.gain.value = 0; // OFF by default: mic + speakers = feedback risk
	input.connect(monitorGain);
	monitorGain.connect(getMaster().busInput);

	mic = {
		source,
		input,
		analyser,
		monitorGain,
		stream,
		stop: () => {
			stream.getTracks().forEach((t) => t.stop());
			source.disconnect();
			input.disconnect();
			monitorGain.disconnect();
			mic = null;
		}
	};
	return mic;
}
