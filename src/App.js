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
import './App.css';
import Recorder from 'recorder-js';

function App() {
  const [fileName, setFileName] = useState('');
  const [fileDuration, setFileDuration] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [arrayFileBuffer, setArrayFileBuffer] = useState(null);
  const [midiFileData, setMidiFileData] = useState(null);
  const recorderRef = useRef(null);

  const loadFile = async (event) => {
    const file = event.target.files[0];
    console.log(file);

    const allowedExtensions = /\.(wav|mp3|ogg|flac)$/i;

    if (file && allowedExtensions.test(file.name)) {
      setFileName(file.name);
      const arrayBuffer = await file.arrayBuffer();
      setArrayFileBuffer(arrayBuffer);

      const audioContext = new AudioContext();
      try {
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
        setFileDuration(audioBuffer.duration.toFixed(2) + ' seconds');
      } catch (error) {
        console.error('Error decoding audio data:', error);
        alert('Error decoding audio data. Please try another file.');
      }
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

    const file = new File([blob], "recording.mp3");
    const arrayBuffer = await file.arrayBuffer();

    setArrayFileBuffer(arrayBuffer);

    const audioContext = new AudioContext();
    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
      setFileDuration(audioBuffer.duration.toFixed(2) + ' seconds');
    } catch (error) {
      console.error('Error decoding audio data:', error);
      alert('Error decoding audio data. Please try recording again.');
    }

    setIsRecording(false);
  };

  const generateMidiFile = async () => {
    if (!arrayFileBuffer) {
      console.error('Error: No file buffer available');
      return;
    }

    let audioBuffer;
    try {
      audioBuffer = await decodeDataToAudioBuffer(arrayFileBuffer.slice(0));
    } catch (error) {
      console.error('Error decoding audio buffer:', error);
      return;
    }

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
      setMidiFileData(midiData);
    } else {
      console.error('Error: audioBuffer is undefined or null');
    }
  };

  const downloadFile = async (e) => {
    const currentDate = new Date().toISOString().slice(0, 10);
    const midiFileNameWithDate = `generated-midi-file-${currentDate}.mid`;
    await downloadMidiFile(midiFileData, midiFileNameWithDate);
  };

  return (
    <div className="App">
      <h1>Audio to MIDI Converter</h1>

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

      {fileName && !isRecording && (
        <div className="file-info">
          <p><span>File Name:</span> {fileName}</p>
          <p><span>Duration:</span> {fileDuration}</p>
          <button onClick={generateMidiFile}>
            Generate MIDI File
          </button>
        </div>
      )}

      {midiFileData && (
        <button onClick={downloadFile}>
          Download File
        </button>
      )}
    </div>
  );
}

export default App;


