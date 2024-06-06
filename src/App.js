import React, { useState, useRef, useEffect } from 'react';
import { BasicPitch } from '@spotify/basic-pitch';
import { addPitchBendsToNoteEvents, noteFramesToTime, outputToNotesPoly } from '@spotify/basic-pitch';
import { downloadMidiFile } from './utils/downloadMidiFile';
import { generateFileData } from './utils/generateFileData';
import { decodeDataToAudioBuffer } from './utils/decodeDataToAudioBuffer';
import './App.css';
import Recorder from 'recorder-js';
import WaveSurfer from 'wavesurfer.js';

function App() {
  const [fileInfo, setFileInfo] = useState({ name: '', duration: '' });
  const [isRecording, setIsRecording] = useState(false);
  const [arrayFileBuffer, setArrayFileBuffer] = useState(null);
  const [midiFileData, setMidiFileData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const recorderRef = useRef(null);
  const wavesurferRef = useRef(null);

  useEffect(() => {
    if (arrayFileBuffer) {
      const audioContext = new AudioContext();
      audioContext.decodeAudioData(arrayFileBuffer.slice(0)).then(audioBuffer => {
        const blob = new Blob([arrayFileBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        if (wavesurferRef.current) {
          wavesurferRef.current.destroy();
        }
        wavesurferRef.current = WaveSurfer.create({
          container: '#waveform',
          waveColor: '#007bff',
          progressColor: '#007bff',
          height: '80',
        });
        wavesurferRef.current.load(url);
      });
    }
  }, [arrayFileBuffer]);

  const loadFile = async (event) => {
    const file = event.target.files[0];
    const allowedExtensions = /\.(wav|mp3|ogg|flac)$/i;

    if (file && allowedExtensions.test(file.name)) {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new AudioContext();
      try {
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
        const duration = audioBuffer.duration.toFixed(2) + ' seconds';
        setFileInfo({ name: file.name, duration: duration });
        setArrayFileBuffer(arrayBuffer);
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
    const file = new File([blob], `recording-${new Date().toISOString().slice(0, 10)}.mp3`);
    const arrayBuffer = await file.arrayBuffer();
    const audioContext = new AudioContext();
    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
      const duration = audioBuffer.duration.toFixed(2) + ' seconds';
      setFileInfo({ name: file.name, duration: duration });
      setArrayFileBuffer(arrayBuffer);
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

    setIsLoading(true);
    let audioBuffer;
    try {
      audioBuffer = await decodeDataToAudioBuffer(arrayFileBuffer.slice(0));
    } catch (error) {
      console.error('Error decoding audio buffer:', error);
      setIsLoading(false);
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
          setLoadingProgress(Math.floor(p * 100));
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

    setIsLoading(false);
    setLoadingProgress(0);
  };

  const downloadFile = async (e) => {
    const currentDate = new Date().toISOString().slice(0, 10);
    const midiFileNameWithDate = `generated-midi-file-${currentDate}.mid`;
    await downloadMidiFile(midiFileData, midiFileNameWithDate);
  };

  return (
    <div className="App">
      <h1>Audio to MIDI Converter</h1>
      <div className="button-container">
        <button
          onClick={() => document.getElementById('fileInput').click()}
          disabled={isLoading}
        >
          Upload File
        </button>
        <input
          type="file"
          accept=".wav,.mp3,.ogg,.flac"
          onChange={loadFile}
          style={{ display: 'none' }}
          id="fileInput"
        />
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isLoading}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
      </div>
      
      {fileInfo.name && (
        <div className="file-info">
          <p><span>File Name:</span> {fileInfo.name}</p>
          <p><span>Duration:</span> {fileInfo.duration}</p>
          <div id="waveform"></div>
          <button onClick={generateMidiFile} disabled={isLoading}>
            Generate MIDI File
          </button>
        </div>
      )}
      
      {isLoading && (
        <div className="loader">
          <p>Processing... {loadingProgress}%</p>
        </div>
      )}
      {midiFileData && !isLoading && (
        <div className="download-button">
          <button onClick={downloadFile}>
            Download File
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
