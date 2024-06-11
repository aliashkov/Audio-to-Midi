import { BasicPitch } from '@spotify/basic-pitch';
import { addPitchBendsToNoteEvents, noteFramesToTime, outputToNotesPoly } from '@spotify/basic-pitch';
import { generateFileData } from './utils/generateFileData';
import { decodeDataToAudioBuffer } from './utils/decodeDataToAudioBuffer';

globalThis.onmessage = async function(e) {
  const { audioData, sliderValues } = e.data;

  console.log(audioData)

  try {
    // Use the received audio data directly
    const frames = [];
    const onsets = [];
    const contours = [];

    const basicPitch = new BasicPitch('model/model.json');

    await basicPitch.evaluateModel(
      audioData,
      (f, o, c) => {
        frames.push(...f);
        onsets.push(...o);
        contours.push(...c);
      }
    );

    const notes = noteFramesToTime(
      addPitchBendsToNoteEvents(
        contours,
        outputToNotesPoly(frames, onsets, sliderValues['slider1'], sliderValues['slider2'], sliderValues['slider5']),
      ),
    );

    const midiData = generateFileData(notes, sliderValues['slider6']); // Pass tempo value here

    // Post the MIDI data back to the main thread
    globalThis.postMessage({ midiData, success: true });
  } catch (error) {
    globalThis.postMessage({ success: false, error: error.message });
  }
};