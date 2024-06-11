import { BasicPitch } from '@spotify/basic-pitch';
import { addPitchBendsToNoteEvents, noteFramesToTime, outputToNotesPoly } from '@spotify/basic-pitch';
import { generateFileData } from './utils/generateFileData';

if (typeof window === 'undefined') {
  globalThis.window = {};
}

globalThis.onmessage = async function (e) {
  const { audioData, sliderValues } = e.data;

  try {
    const frames = [];
    const onsets = [];
    const contours = [];

    function percentCallback(percent) {
      const progress = Math.floor(percent * 100);
      globalThis.postMessage({ type: 'progress', progress });
    }

    const modelURL = 'https://raw.githubusercontent.com/aliashkov/Audio-to-Midi/main/public/model/model.json';
    const basicPitch = new BasicPitch(modelURL);

    await basicPitch.evaluateModel(
      audioData,
      (f, o, c) => {
        frames.push(...f);
        onsets.push(...o);
        contours.push(...c);
      },
      percentCallback
    );

    const notes = await noteFramesToTime(
      addPitchBendsToNoteEvents(
        contours,
        outputToNotesPoly(frames, onsets, sliderValues['slider1'], sliderValues['slider2'], sliderValues['slider5'], true,  sliderValues['slider4'],  sliderValues['slider3']),
      ),
    );

    const midiData = await generateFileData(notes, sliderValues['slider6']);

    globalThis.postMessage({ type: 'result', midiData, frames, onsets, contours, notes, success: true });
  } catch (error) {
    globalThis.postMessage({ type: 'error', success: false, error: error.message });
  }
};