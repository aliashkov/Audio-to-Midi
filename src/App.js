import React, { useState, useRef, useEffect } from 'react';
import { BasicPitch } from '@spotify/basic-pitch';
import { addPitchBendsToNoteEvents, noteFramesToTime, outputToNotesPoly } from '@spotify/basic-pitch';
import { downloadMidiFile } from './utils/downloadMidiFile';
import { generateFileData } from './utils/generateFileData';
import { decodeDataToAudioBuffer } from './utils/decodeDataToAudioBuffer';
import './App.css';
import WaveSurfer from 'wavesurfer.js';
import RecordPlugin from 'wavesurfer.js/dist/plugins/record.esm.js';
import Slider from './components/Slider';

function App() {
  const [fileInfo, setFileInfo] = useState({ name: '', duration: '' });
  const [isRecording, setIsRecording] = useState(false);
  const [arrayFileBuffer, setArrayFileBuffer] = useState(null);
  const [midiFileData, setMidiFileData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [sliderValues, setSliderValues] = useState({
    slider1: 50,
    slider2: 20,
    slider3: 0,
    slider4: 3000,
    slider5: 11,
    slider6: 120,
  });

  const scrollingWaveform = true;
  const wavesurferRef = useRef(null);
  const recordRef = useRef(null);
  const progressRef = useRef(null);

  useEffect(() => {
    if (arrayFileBuffer) {
      const audioContext = new AudioContext();
      audioContext.decodeAudioData(arrayFileBuffer.slice(0)).then(audioBuffer => {
        const blob = new Blob([arrayFileBuffer]);
        const url = URL.createObjectURL(blob);
        if (wavesurferRef.current) {
          wavesurferRef.current.load(url);
        } else {
          wavesurferRef.current = WaveSurfer.create({
            container: '#waveform',
            waveColor: '#007bff',
            progressColor: '#007bff',
            height: '80',
          });
          wavesurferRef.current.load(url);
        }
      });
    }
  }, [arrayFileBuffer]);

  useEffect(() => {
    createWaveSurfer();
  }, [scrollingWaveform]);

  const createWaveSurfer = async () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }
    wavesurferRef.current = WaveSurfer.create({
      container: '#mic',
      waveColor: '#007bff',
      progressColor: '#007bff',
      height: '80',
    });

    recordRef.current = wavesurferRef.current.registerPlugin(RecordPlugin.create({
      scrollingWaveform,
      renderRecordedAudio: false,
    }));

    recordRef.current.on('record-end', async (blob) => {
      const url = URL.createObjectURL(blob);
      wavesurferRef.current.load(url);
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
    });

    recordRef.current.on('record-progress', (time) => {
      updateProgress(time);
    });
  };

  const updateProgress = (time) => {
    const formattedTime = [
      Math.floor((time % 3600000) / 60000),
      Math.floor((time % 60000) / 1000),
    ]
      .map((v) => (v < 10 ? '0' + v : v))
      .join(':');
    if (progressRef.current) {
      progressRef.current.textContent = formattedTime;
    }
  };

  const loadFile = async (event) => {
    setMidiFileData(null);
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    const allowedExtensions = /\.(wav|mp3|ogg|flac)$/i;

    if (allowedExtensions.test(file.name)) {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new AudioContext();
      try {
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
        const duration = audioBuffer.duration.toFixed(2) + ' seconds';
        setFileInfo({ name: file.name, duration });
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
    setMidiFileData(null);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (recordRef.current.isRecording() || recordRef.current.isPaused()) {
      recordRef.current.stopRecording();
      setIsRecording(false);
    } else {
      recordRef.current.startRecording({ stream, mediaType: 'audio/mp3' }); // Set recording format as MP3
      setIsRecording(true);
    }
  };

  const stopRecording = async () => {
    recordRef.current.stopRecording();
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

      const basicPitch = new BasicPitch('model/model.json');

      await basicPitch.evaluateModel(
        audioBuffer.getChannelData(0),
        (f, o, c) => {
          frames.push(...f);
          onsets.push(...o);
          contours.push(...c);
        },
        (p) => {
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

  const handleSliderChange = (e) => {
    const { name, value } = e.target;
    setSliderValues(prevValues => ({ ...prevValues, [name]: value }));
  };

  return (
    <div className="App">
      <h1>Audio to MIDI Converter</h1>
      <div className="container">
        <div className="left-panel">
          <div className="button-container">
            <button
              onClick={() => document.getElementById('fileInput').click()}
              disabled={isLoading || isRecording}
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
          <div>
            <div id="mic" style={{ border: '1px solid #ddd', borderRadius: '4px', marginTop: '1rem' }}></div>
            <p id="progress" ref={progressRef}>00:00</p>
          </div>

          {fileInfo.name && (
            <div className="file-info">
              <p><span>File Name:</span> {fileInfo.name}</p>
              <p><span>Duration:</span> {fileInfo.duration}</p>
              <div id="waveform"></div>
              <button onClick={generateMidiFile} disabled={isLoading || isRecording}>
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
        <div className="right-panel">
          <div className="slider-row">
            <Slider
              label="Note Segmentation"
              name="slider1"
              value={sliderValues.slider1}
              onChange={handleSliderChange}
              minLabel="Min"
              maxLabel="Max"
              description="Controls the segmentation of notes"
            />
            <Slider
              label="Model Confidence Threshold"
              name="slider2"
              value={sliderValues.slider2}
              onChange={handleSliderChange}
              minLabel="Min"
              maxLabel="Max"
              description="Sets the confidence threshold for the model"
            />
          </div>
          <div className="slider-row">
            <Slider
              label="Minimum Pitch"
              name="slider3"
              value={sliderValues.slider3}
              onChange={handleSliderChange}
              minLabel="Min"
              maxLabel="Max"
              description="Specifies the minimum pitch value"
            />
            <Slider
              label="Maximum Pitch"
              name="slider4"
              value={sliderValues.slider4}
              onChange={handleSliderChange}
              minLabel="Min"
              maxLabel="Max"
              description="Specifies the maximum pitch value"
            />
          </div>
          <div className="slider-row">
            <Slider
              label="Minimum Note Length"
              name="slider5"
              value={sliderValues.slider5}
              onChange={handleSliderChange}
              minLabel="Min"
              maxLabel="Max"
              description="Defines the minimum length of notes"
            />
            <Slider
              label="MIDI File Tempo"
              name="slider6"
              value={sliderValues.slider6}
              onChange={handleSliderChange}
              minLabel="Min"
              maxLabel="Max"
              description="Adjusts the tempo of the MIDI file"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;