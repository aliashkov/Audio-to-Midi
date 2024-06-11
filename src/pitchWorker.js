import { addPitchBendsToNoteEvents, noteFramesToTime, outputToNotesPoly } from '@spotify/basic-pitch';
import { generateFileData } from './utils/generateFileData';

globalThis.onmessage = async function (e) {
  const { framesData, onsetsData, contoursData, sliderValues } = e.data;

/*   console.log(framesData)
  console.log(onsetsData)
  console.log(contoursData)
  console.log(sliderValues) */

  try {
    const notes = await noteFramesToTime(
      addPitchBendsToNoteEvents(
        contoursData,
        outputToNotesPoly(framesData, onsetsData, sliderValues['slider1'], sliderValues['slider2'], sliderValues['slider5']),
      ),
    );

    const midiData = await generateFileData(notes, sliderValues['slider6']);

    globalThis.postMessage({ type: 'result', midiData, notes, success: true });
  } catch (error) {
    globalThis.postMessage({ type: 'error', success: false, error: error.message });
  }
};