export const decodeDataToAudioBuffer = async (arrayBuffer) => {
    const audioCtx = new AudioContext({ sampleRate: 22050 });
    let audioBuffer;
    try {
        audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch (error) {
        console.error('Error decoding audio data:', error);
        return;
    }
    return audioBuffer
}