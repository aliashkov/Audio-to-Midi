import { BasicPitch } from '@spotify/basic-pitch';
import { addPitchBendsToNoteEvents, noteFramesToTime, outputToNotesPoly } from '@spotify/basic-pitch';
import { generateFileData } from './utils/generateFileData';
import { decodeDataToAudioBuffer } from './utils/decodeDataToAudioBuffer';

// Mock window object if it is not defined (i.e., in a worker context)
if (typeof window === 'undefined') {
  globalThis.window = {};
}

globalThis.onmessage = async function(e) {
  const { audioData, sliderValues } = e.data;

  console.log(audioData);

  try {
    const frames = [];
    const onsets = [];
    const contours = [];

    // Define the percentCallback function
    function percentCallback(percent) {
      console.log(`Processing: ${percent}% done`);
    }

    // Fetch the model.json from the external URL
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

    const notes = noteFramesToTime(
      addPitchBendsToNoteEvents(
        contours,
        outputToNotesPoly(frames, onsets, sliderValues['slider1'], sliderValues['slider2'], sliderValues['slider5']),
      ),
    );

    const midiData = generateFileData(notes, sliderValues['slider6']);

    // Post the MIDI data back to the main thread
    globalThis.postMessage({ midiData, success: true });
  } catch (error) {
    globalThis.postMessage({ success: false, error: error.message });
  }
};