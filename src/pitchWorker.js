import { BasicPitch } from '@spotify/basic-pitch';
import { addPitchBendsToNoteEvents, noteFramesToTime, outputToNotesPoly } from '@spotify/basic-pitch';
import { generateFileData } from './utils/generateFileData';
import { decodeDataToAudioBuffer } from './utils/decodeDataToAudioBuffer';

globalThis.onmessage = async function(e) {
  const { arrayFileBuffer, sliderValues } = e.data;

  console.log(arrayFileBuffer, sliderValues);

  try {
    const audioBuffer = await decodeDataToAudioBuffer(arrayFileBuffer.slice(0));
    console.log(arrayFileBuffer)
    const frames = [];
    const onsets = [];
    const contours = [];

    const basicPitch = new BasicPitch('model/model.json');
    console.log(basicPitch)

    await basicPitch.evaluateModel(
      audioBuffer.getChannelData(0),
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

    console.log(notes)

    const midiData = generateFileData(notes, sliderValues['slider6']); // Pass tempo value here

    console.log(midiData)


    globalThis.postMessage({ midiData, success: true });
  } catch (error) {
    globalThis.postMessage({ success: false, error: error.message });
  }
};