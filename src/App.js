import React, { useState } from 'react';
import { BasicPitch } from '@spotify/basic-pitch';
import {
  addPitchBendsToNoteEvents,
  noteFramesToTime,
  outputToNotesPoly
} from '@spotify/basic-pitch';
import { downloadMidiFile } from './utils/downloadMidiFile';
import { generateFileData } from './utils/generateFileData';
import { decodeDataToAudioBuffer } from './utils/decodeDataToAudioBuffer';

function App() {
  const [fileName, setFileName] = useState('');

  const generateMidiFile = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
      const arrayBuffer = await file.arrayBuffer();
      let audioBuffer = await decodeDataToAudioBuffer(arrayBuffer)

      const frames = [];
      const onsets = [];
      const contours = [];
      let pct = 0;

      const basicPitch = new BasicPitch('model/model.json');

      await basicPitch.evaluateModel(
        audioBuffer.getChannelData(0),
        (f, o, c) => {
          frames.push(...f);
          onsets.push(...o);
          contours.push(...c);
        },
        (p) => {
          pct = p;
        },
      );

      const notes = noteFramesToTime(
        addPitchBendsToNoteEvents(
          contours,
          outputToNotesPoly(frames, onsets, 0.25, 0.25, 5),
        ),
      );

      const midiData = generateFileData(notes);

      downloadMidiFile(midiData, 'generated-midi-file.mid');
    }
  };

  return (
    <div className="App">
      <input 
        type="file" 
        onChange={generateMidiFile} 
        style={{ display: 'none' }} 
        id="fileInput"
      />
      <button onClick={() => document.getElementById('fileInput').click()}>
        Load File
      </button>
      {fileName && <p>Loaded file: {fileName}</p>}
    </div>
  );
}

export default App;

