// Recordings always start with a beat of silence - the gap between hitting
// record and actually speaking. Left in, that dead air is what makes blending
// feel laggy: "s ... a ... t" instead of "s-a-t". So every take gets trimmed
// down to the sound itself before it is stored.

/** Below this amplitude counts as room tone rather than speech. */
const FLOOR = 0.02;
/** Keep a little air either side so nothing sounds clipped off. */
const LEAD_MS = 30;
const TAIL_MS = 90;

export async function trimSilence(blob: Blob): Promise<Blob> {
  try {
    const ctx = new AudioContext();
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    void ctx.close();

    // Mix to mono - nothing here benefits from stereo, and mono halves the size.
    const { length, numberOfChannels, sampleRate } = decoded;
    const mono = new Float32Array(length);
    for (let c = 0; c < numberOfChannels; c++) {
      const data = decoded.getChannelData(c);
      for (let i = 0; i < length; i++) mono[i] += data[i] / numberOfChannels;
    }

    let start = 0;
    while (start < length && Math.abs(mono[start]) < FLOOR) start++;
    let end = length - 1;
    while (end > start && Math.abs(mono[end]) < FLOOR) end--;

    // Nothing above the floor - probably a silent take. Hand it back untouched
    // so the problem is audible rather than silently swallowed.
    if (start >= end) return blob;

    start = Math.max(0, start - Math.floor((LEAD_MS / 1000) * sampleRate));
    end = Math.min(length - 1, end + Math.floor((TAIL_MS / 1000) * sampleRate));

    return encodeWav(mono.subarray(start, end + 1), sampleRate);
  } catch {
    // Decoding can fail on odd browser codecs. An untrimmed clip beats no clip.
    return blob;
  }
}

/** 16-bit mono PCM WAV. Plays everywhere, and drops straight into a native
 *  iOS build later without conversion. */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);        // PCM header size
  view.setUint16(20, 1, true);         // format: PCM
  view.setUint16(22, 1, true);         // channels: mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);         // block align
  view.setUint16(34, 16, true);        // bits per sample
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/** Peak amplitude, for warning about takes that are too quiet or clipping. */
export async function peakOf(blob: Blob): Promise<number> {
  try {
    const ctx = new AudioContext();
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    void ctx.close();
    const data = decoded.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
    return peak;
  } catch {
    return 0;
  }
}
