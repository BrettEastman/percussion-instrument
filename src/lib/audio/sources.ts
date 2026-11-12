/**
 * A sine test tone (Max: cycle~) for checking the chain before the mic is on.
 */
import { getContext, getMaster, ramp } from './engine';

export interface Voice {
	/** Per-voice fader (connect UI to this). */
	gain: GainNode;
	stop: () => void;
}

export function startTestTone(freq = 261.63): Voice {
	const ctx = getContext();
	const osc = ctx.createOscillator();
	osc.type = 'sine';
	osc.frequency.value = freq;

	const gain = ctx.createGain();
	gain.gain.value = 0;

	osc.connect(gain);
	gain.connect(getMaster().busInput);
	osc.start();
	ramp(gain.gain, 0.2, 100); // fade in so there's no click

	return {
		gain,
		stop: () => {
			ramp(gain.gain, 0, 100);
			osc.stop(ctx.currentTime + 0.15);
		}
	};
}
