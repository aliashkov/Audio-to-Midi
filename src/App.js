import React, { useState, useRef } from 'react';
import { BasicPitch } from '@spotify/basic-pitch';
import {
  addPitchBendsToNoteEvents,
  noteFramesToTime,
  outputToNotesPoly
} from '@spotify/basic-pitch';
import { downloadMidiFile } from './utils/downloadMidiFile';
import { generateFileData } from './utils/generateFileData';
import { decodeDataToAudioBuffer } from './utils/decodeDataToAudioBuffer';
import Recorder from 'recorder-js';

function App() {
  const [fileName, setFileName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [arrayFileBuffer, setArrayFileBuffer] = useState([])
  const recorderRef = useRef(null);

  const loadFile = async (event) => {
    const file = event.target.files[0];
    console.log(file);
  
    const allowedExtensions = /\.(wav|mp3|ogg|flac)$/i;
  
    if (file && allowedExtensions.test(file.name)) {
      setFileName(file.name);
      const arrayBuffer = await file.arrayBuffer();
      setArrayFileBuffer(arrayBuffer);
    } else {
      alert('Please select a file with one of the following formats: .wav, .mp3, .ogg, .flac');
    }
  };

  const startRecording = async () => {
    if (!recorderRef.current) {
      const audioContext = new AudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new Recorder(audioContext);
      recorder.init(stream);
      recorderRef.current = recorder;
    }

    recorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = async () => {
    const { blob } = await recorderRef.current.stop();
    setFileName(`recording-${new Date().toISOString().slice(0, 10)}.mp3`);
  
    var file = new File([blob], "name");
    const arrayBuffer = await file.arrayBuffer();

    setArrayFileBuffer(arrayBuffer);
    setIsRecording(false);
  };

  const generateMidiFile = async () => {
    console.log(arrayFileBuffer);
    let audioBuffer = await decodeDataToAudioBuffer(arrayFileBuffer);

    if (audioBuffer) {
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

      const currentDate = new Date().toISOString().slice(0, 10);
      const midiFileNameWithDate = `generated-midi-file-${currentDate}.mid`;

      downloadMidiFile(midiData, midiFileNameWithDate);
    } else {
      console.error('Error: audioBuffer is undefined or null');
    }
  };


  return (
    <div className="App">
      <input
        type="file"
        accept=".wav,.mp3,.ogg,.flac"
        onChange={loadFile}
        style={{ display: 'none' }}
        id="fileInput"
      />
      <button onClick={() => document.getElementById('fileInput').click()}>
        Load File
      </button>

      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>

      {fileName && !isRecording ? (
        <button onClick={generateMidiFile}>
          Generate Midi File
        </button>
      ) : <></>}
    </div>
  );
}

export default App;

