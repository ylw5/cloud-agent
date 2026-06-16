async function blobToPcm16(blob: Blob) {
  const audioContext = new AudioContext({ sampleRate: 16_000 });
  try {
    const audioBuffer = await audioContext.decodeAudioData(
      await blob.arrayBuffer()
    );
    const samples = audioBuffer.getChannelData(0);
    const pcm = new Int16Array(samples.length);

    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    return pcm.buffer;
  } finally {
    await audioContext.close();
  }
}

export async function transcribeAudio(audioBlob: Blob) {
  const response = await fetch("/api/speech-to-text", {
    body: await blobToPcm16(audioBlob),
    headers: {
      "Content-Type": "application/octet-stream",
      "X-Speech-Language": "zh"
    },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error("Speech transcription failed");
  }

  const data = (await response.json()) as { text?: unknown };
  return typeof data.text === "string" ? data.text.trim() : "";
}
