/**
 * The FX bus — inserted in the master chain between the source bus and the
 * limiter:  busInput -> [ EQ -> flanger -> delay send -> reverb send ] -> limiter -> ...
 *
 * Three effects from the Max patch, plus one new one:
 *  - EQ: one configurable biquad, like the patch's [filtergraph~] (nfilters 1)
 *    with its umenu of filter types.
 *  - Flanger: the patch's [p Basicflange] — a short modulated delay
 *    ([tapin~]/[tapout~] with a [cycle~] LFO sweeping 0–4.5 ms) plus feedback.
 *    Think of the LFO as a very slow phaser pedal knob being turned for you.
 *  - Reverb: the patch used a rev3 tap-delay network; here a ConvolverNode
 *    with a generated impulse response (decaying stereo noise) — the simplest
 *    good-sounding room the Web Audio API offers. Wired send/return style:
 *    the `wet` gain is the send fader.
 *  - Delay (new): a feedback echo, also a send. Each repeat passes through a
 *    lowpass, so echoes get darker as they fade, like sound crossing a
 *    valley. Its delay time is meant to wander: see drift.ts.
 *
 * Deliberately no imports from engine.ts (engine imports us), so this file
 * is pure "given a context, build nodes".
 */

export interface FxBus {
	input: GainNode;
	output: GainNode;
	/** The single filtergraph~-style biquad. */
	eq: BiquadFilterNode;
	flanger: {
		wet: GainNode; // 0 = bypass
		feedback: GainNode;
		rate: OscillatorNode; // LFO frequency in Hz
		depth: GainNode; // LFO amount in seconds of delay sweep
		delay: DelayNode;
	};
	delay: {
		wet: GainNode; // send level, 0 = bypass
		feedback: GainNode; // how much of each echo feeds the next
		tone: BiquadFilterNode; // lowpass inside the feedback loop
		node: DelayNode; // delayTime is moved by DelayDrift
	};
	reverb: {
		wet: GainNode; // send level, 0 = bypass
		convolver: ConvolverNode;
	};
}

export function createFxBus(ctx: BaseAudioContext): FxBus {
	const input = ctx.createGain();
	const output = ctx.createGain();

	// --- EQ ---------------------------------------------------------------
	// Defaults echo the patch's filteringEQ setfilter (peaking around 1868 Hz).
	const eq = ctx.createBiquadFilter();
	eq.type = 'peaking';
	eq.frequency.value = 1868;
	eq.gain.value = 0; // flat until asked
	eq.Q.value = 0.7;

	// --- Flanger ----------------------------------------------------------
	const delay = ctx.createDelay(0.05);
	delay.delayTime.value = 0.003; // center of the sweep
	const rate = ctx.createOscillator();
	rate.frequency.value = 0.47; // the patch's cycle~ 0.47
	const depth = ctx.createGain();
	depth.gain.value = 0.002; // ±2 ms sweep (patch scaled 0–4.5 ms)
	rate.connect(depth);
	depth.connect(delay.delayTime);
	rate.start();

	const fWet = ctx.createGain();
	fWet.gain.value = 0; // bypass until raised
	const fFeedback = ctx.createGain();
	fFeedback.gain.value = 0.3;

	// --- Delay ------------------------------------------------------------
	const echo = ctx.createDelay(4);
	echo.delayTime.value = 0.6;
	const dWet = ctx.createGain();
	dWet.gain.value = 0; // send fader, off until raised
	const dFeedback = ctx.createGain();
	dFeedback.gain.value = 0.45;
	const dTone = ctx.createBiquadFilter();
	dTone.type = 'lowpass';
	dTone.frequency.value = 3200;

	// --- Reverb -----------------------------------------------------------
	const convolver = ctx.createConvolver();
	convolver.buffer = makeImpulseResponse(ctx, 3.2, 2.4);
	const rWet = ctx.createGain();
	rWet.gain.value = 0; // send fader, off until raised

	// --- Wiring -----------------------------------------------------------
	// input -> eq -> sum(dry + flanger wet) -> post -> output
	//                  └-> delay send -> echo -┘      └-> reverb send -> convolver -> output
	//                         ^-- tone <- feedback <-┘
	// Echoes join `post`, so they are reverberated along with everything else.
	const sum = ctx.createGain();
	const post = ctx.createGain();
	input.connect(eq);
	eq.connect(sum); // dry path
	eq.connect(delay);
	delay.connect(fWet);
	fWet.connect(sum);
	delay.connect(fFeedback);
	fFeedback.connect(delay); // regeneration
	sum.connect(post);
	sum.connect(dWet);
	dWet.connect(echo);
	echo.connect(post);
	echo.connect(dTone);
	dTone.connect(dFeedback);
	dFeedback.connect(echo); // regeneration
	post.connect(output);
	post.connect(rWet);
	rWet.connect(convolver);
	convolver.connect(output);

	return {
		input,
		output,
		eq,
		flanger: { wet: fWet, feedback: fFeedback, rate, depth, delay },
		delay: { wet: dWet, feedback: dFeedback, tone: dTone, node: echo },
		reverb: { wet: rWet, convolver }
	};
}

/**
 * Generate a room: stereo noise with an exponential decay envelope.
 * `decay` shapes how fast it dies — higher = drier tail.
 */
function makeImpulseResponse(ctx: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
	const length = Math.floor(ctx.sampleRate * seconds);
	const ir = ctx.createBuffer(2, length, ctx.sampleRate);
	for (let ch = 0; ch < 2; ch++) {
		const data = ir.getChannelData(ch);
		for (let i = 0; i < length; i++) {
			data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
		}
	}
	return ir;
}
