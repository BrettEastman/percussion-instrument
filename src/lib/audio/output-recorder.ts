/**
 * OutputRecorder — captures what the audience hears into a file.
 *
 * A MediaStreamAudioDestinationNode is a second "speaker" that produces a
 * MediaStream instead of sound; MediaRecorder encodes that stream (webm /
 * opus in Chromium). Since every performance of this piece is different,
 * this is the tape machine at the back of the hall.
 */
import { getContext, getMaster } from './engine';

export class OutputRecorder {
	recording = false;
	/** performance.now() when the current take started. */
	startedAt = 0;

	private tap: MediaStreamAudioDestinationNode | null = null;
	private recorder: MediaRecorder | null = null;
	private chunks: Blob[] = [];

	start(): void {
		if (this.recording) return;
		const ctx = getContext();
		if (!this.tap) {
			this.tap = ctx.createMediaStreamDestination();
			// Post-fader, post-limiter: the same signal that reaches the speakers.
			getMaster().analyser.connect(this.tap);
		}
		this.chunks = [];
		this.recorder = new MediaRecorder(this.tap.stream);
		this.recorder.ondataavailable = (e: BlobEvent) => {
			if (e.data.size > 0) this.chunks.push(e.data);
		};
		this.recorder.start(1000); // hand over a chunk every second
		this.startedAt = performance.now();
		this.recording = true;
	}

	/** Stop and resolve with the finished take. */
	stop(): Promise<Blob | null> {
		const recorder = this.recorder;
		if (!this.recording || !recorder) return Promise.resolve(null);
		this.recording = false;
		return new Promise((resolve) => {
			recorder.onstop = () => {
				resolve(new Blob(this.chunks, { type: recorder.mimeType }));
				this.chunks = [];
			};
			recorder.stop();
			this.recorder = null;
		});
	}
}
