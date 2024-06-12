import React, { useState, useRef, useEffect, useTransition } from 'react';
import { downloadMidiFile } from './utils/downloadMidiFile';
import { decodeDataToAudioBuffer } from './utils/decodeDataToAudioBuffer';
import './App.css';
import WaveSurfer from 'wavesurfer.js';
import RecordPlugin from 'wavesurfer.js/dist/plugins/record.esm.js';
import Slider from './components/Slider';
import { TailSpin } from 'react-loader-spinner';
import MIDI from 'midi.js';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';

const modelWorker = new Worker(new URL('./modelWorker.js', import.meta.url), { type: 'module' });
const pitchWorker = new Worker(new URL('./pitchWorker.js', import.meta.url), { type: 'module' });

const noteURLs = {
  'A0': 'notes/0-a.wav',
  'A#0': 'notes/0-as.wav',
  'B0': 'notes/0-b.wav',
  'C1': 'notes/1-c.wav',
  'C#1': 'notes/1-cs.wav',
  'D1': 'notes/1-d.wav',
  'D#1': 'notes/1-ds.wav',
  'E1': 'notes/1-e.wav',
  'F1': 'notes/1-f.wav',
  'F#1': 'notes/1-fs.wav',
  'G1': 'notes/1-g.wav',
  'G#1': 'notes/1-gs.wav',
  'A1': 'notes/1-a.wav',
  'A#1': 'notes/1-as.wav',
  'B1': 'notes/1-b.wav',
  'C2': 'notes/2-c.wav',
  'C#2': 'notes/2-cs.wav',
  'D2': 'notes/2-d.wav',
  'D#2': 'notes/2-ds.wav',
  'E2': 'notes/2-e.wav',
  'F2': 'notes/2-f.wav',
  'F#2': 'notes/2-fs.wav',
  'G2': 'notes/2-g.wav',
  'G#2': 'notes/2-gs.wav',
  'A2': 'notes/2-a.wav',
  'A#2': 'notes/2-as.wav',
  'B2': 'notes/2-b.wav',
  'C3': 'notes/3-c.wav',
  'C#3': 'notes/3-cs.wav',
  'D3': 'notes/3-d.wav',
  'D#3': 'notes/3-ds.wav',
  'E3': 'notes/3-e.wav',
  'F3': 'notes/3-f.wav',
  'F#3': 'notes/3-fs.wav',
  'G3': 'notes/3-g.wav',
  'G#3': 'notes/3-gs.wav',
  'A3': 'notes/3-a.wav',
  'A#3': 'notes/3-as.wav',
  'B3': 'notes/3-b.wav',
  'C4': 'notes/4-c.wav',
  'C#4': 'notes/4-cs.wav',
  'D4': 'notes/4-d.wav',
  'D#4': 'notes/4-ds.wav',
  'E4': 'notes/4-e.wav',
  'F4': 'notes/4-f.wav',
  'F#4': 'notes/4-fs.wav',
  'G4': 'notes/4-g.wav',
  'G#4': 'notes/4-gs.wav',
  'A4': 'notes/4-a.wav',
  'A#4': 'notes/4-as.wav',
  'B4': 'notes/4-b.wav',
  'C5': 'notes/5-c.wav',
  'C#5': 'notes/5-cs.wav',
  'D5': 'notes/5-d.wav',
  'D#5': 'notes/5-ds.wav',
  'E5': 'notes/5-e.wav',
  'F5': 'notes/5-f.wav',
  'F#5': 'notes/5-fs.wav',
  'G5': 'notes/5-g.wav',
  'G#5': 'notes/5-gs.wav',
  'A5': 'notes/5-a.wav',
  'A#5': 'notes/5-as.wav',
  'B5': 'notes/5-b.wav',
  'C6': 'notes/6-c.wav',
  'C#6': 'notes/6-cs.wav',
  'D6': 'notes/6-d.wav',
  'D#6': 'notes/6-ds.wav',
  'E6': 'notes/6-e.wav',
  'F6': 'notes/6-f.wav',
  'F#6': 'notes/6-fs.wav',
  'G6': 'notes/6-g.wav',
  'G#6': 'notes/6-gs.wav',
  'A6': 'notes/6-a.wav',
  'A#6': 'notes/6-as.wav',
  'B6': 'notes/6-b.wav',
  'C7': 'notes/7-c.wav',
  'C#7': 'notes/7-cs.wav',
  'D7': 'notes/7-d.wav',
  'D#7': 'notes/7-ds.wav',
  'E7': 'notes/7-e.wav',
  'F7': 'notes/7-f.wav',
  'F#7': 'notes/7-fs.wav',
  'G7': 'notes/7-g.wav',
  'G#7': 'notes/7-gs.wav',
  'A7': 'notes/7-a.wav',
  'A#7': 'notes/7-as.wav',
  'B7': 'notes/7-b.wav',
  'C8': 'notes/8-c.wav',
};

const sampler = new Tone.Sampler().toDestination();

// Load each note into the sampler
for (const note in noteURLs) {
  const noteURL = noteURLs[note];
  sampler.add(note, noteURL);
}


function App() {
  const [fileInfo, setFileInfo] = useState({ name: '', duration: '' });
  const [isRecording, setIsRecording] = useState(false);
  const [arrayFileBuffer, setArrayFileBuffer] = useState(null);
  const [midiFileData, setMidiFileData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [sliderValues, setSliderValues] = useState({
    slider1: 0.5,
    slider2: 0.3,
    slider3: 0,
    slider4: 3000,
    slider5: 11,
    slider6: 120,
  });

  const [framesData, setFramesData] = useState(null);
  const [onsetsData, setOnsetsData] = useState(null);
  const [contoursData, setContoursData] = useState(null);

  const [dataLoaded, setDataLoaded] = useState(false);

  const [notesData, setNotesData] = useState(null)

  const scrollingWaveform = true;
  const wavesurferRef = useRef(null);
  const recordRef = useRef(null);
  const progressRef = useRef(null);
  const audioRef = useRef(null);
  const midiAudioRef = useRef(null);

  const timeoutRef = useRef(null);
  const [showLoader, setShowLoader] = useState(false);
  const [isPending, startTransition] = useTransition();
  const canvasRef = useRef(null);
  const [midiPlaying, setMidiPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);

  console.log(currentTime)




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
        if (audioRef.current) {
          audioRef.current.src = url;
        }
      });
    }
  }, [arrayFileBuffer]);

  useEffect(() => {
    if (framesData && onsetsData && contoursData && dataLoaded) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setShowLoader(true);
        pitchWorker.postMessage({ framesData, onsetsData, contoursData, sliderValues });
      }, 1000);
    }
  }, [contoursData, framesData, onsetsData, sliderValues, dataLoaded]);

  useEffect(() => {
    pitchWorker.onmessage = function (e) {
      const { type, midiData, notes, error, success } = e.data;
      if (type === 'result') {
        setNotesData(notes)
        setMidiFileData(midiData);
        setShowLoader(false);
        renderMidiNotes(notes);
      } else if (type === 'error') {
        console.error('Worker error:', error);
        setShowLoader(false);
        setIsLoading(false);
      }
    };
  }, [fileInfo]);

  useEffect(() => {
    modelWorker.onmessage = function (e) {
      const { type, progress, midiData, frames, onsets, contours, notes, error, success } = e.data;

      if (type === 'progress') {
        setLoadingProgress(progress);
      } else if (type === 'result') {
        if (success) {
          setFramesData(frames)
          setOnsetsData(onsets)
          setContoursData(contours)
          setNotesData(notes)
          console.log(fileInfo)
          renderMidiNotes(notes);  // Add this line to render MIDI notes
          setMidiFileData(midiData);
          setIsLoading(false);
        }
      } else if (type === 'error') {
        console.error('Worker error:', error);
        setIsLoading(false);
      }
    };
  }, [fileInfo]);

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
    setDataLoaded(false)
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
    setDataLoaded(false)
    let audioBuffer;
    try {
      audioBuffer = await decodeDataToAudioBuffer(arrayFileBuffer.slice(0));
    } catch (error) {
      console.error('Error decoding audio buffer:', error);
      setIsLoading(false);
      return;
    }

    if (audioBuffer) {
      setFramesData(null);
      setOnsetsData(null);
      setContoursData(null);

      const audioData = audioBuffer.getChannelData(0); // Assuming mono audio

      modelWorker.postMessage({ audioData, sliderValues });

    }

  };

  const downloadFile = async (e) => {
    const currentDate = new Date().toISOString().slice(0, 10);
    const midiFileNameWithDate = `generated-midi-file-${currentDate}.mid`;
    await downloadMidiFile(midiFileData, midiFileNameWithDate);
  };

  const handleSliderChange = (e) => {
    const { name, value } = e.target;
    startTransition(() => {
      setSliderValues(prevValues => ({ ...prevValues, [name]: value }));
      setDataLoaded(true);
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas && notesData) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const noteHeight = 8;
      const noteSpacing = 4;
      const pianoKeyWidth = 20;
      const timeHeight = 8;

      const minTime = 0;
      const maxTime = parseFloat(fileInfo.duration);

      const minMidi = Math.min(...notesData.map(note => note.pitchMidi));
      const maxMidi = Math.max(...notesData.map(note => note.pitchMidi));

      const canvasWidth = (maxTime - minTime) * 100;
      const canvasHeight = 308;

      canvas.width = canvasWidth + pianoKeyWidth;
      canvas.height = canvasHeight + timeHeight;

      const drawPianoKeys = () => {
        // Draw piano keys
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, timeHeight, pianoKeyWidth, canvasHeight - timeHeight);

        for (let i = minMidi; i <= maxMidi; i++) {
          const y = canvasHeight - timeHeight - ((i - minMidi) / (maxMidi - minMidi)) * (canvasHeight - timeHeight - noteHeight - noteSpacing);
          ctx.fillStyle = (i % 12 === 1 || i % 12 === 3 || i % 12 === 6 || i % 12 === 8 || i % 12 === 10) ? '#000' : '#fff';
          ctx.fillRect(0, y + timeHeight, pianoKeyWidth, noteHeight);
          ctx.strokeRect(0, y + timeHeight, pianoKeyWidth, noteHeight);
        }
      };

      const drawTimeLabels = () => {
        // Draw time labels
        ctx.fillStyle = '#000';
        for (let t = minTime; t <= maxTime; t += 1) {
          const x = pianoKeyWidth + (t - minTime) * 100;
          ctx.fillText(t.toFixed(0) + 's', x, 15);
          ctx.beginPath();
          ctx.moveTo(x, timeHeight);
          ctx.lineTo(x, canvasHeight + timeHeight);
          ctx.strokeStyle = '#e0e0e0';
          ctx.stroke();
        }
      };

      const drawProgress = () => {
        // Draw progress bar
        const progressWidth = canvasWidth * (currentTime / maxTime);
        ctx.fillStyle = '#007bff';
        ctx.fillRect(pianoKeyWidth, 0, progressWidth, timeHeight);
        ctx.fillStyle = '#000';
        ctx.fillRect(pianoKeyWidth + progressWidth - 1, 0, 2, timeHeight);
      };

      drawPianoKeys();
      drawTimeLabels();
      drawProgress();

      notesData.forEach((note) => {
        const x = pianoKeyWidth + (note.startTimeSeconds - minTime) * 100; // 100px per second
        const y = canvasHeight - timeHeight - ((note.pitchMidi - minMidi) / (maxMidi - minMidi)) * (canvasHeight - timeHeight - noteHeight - noteSpacing);
        const width = note.durationSeconds * 80;

        ctx.fillStyle = '#007bff';
        ctx.fillRect(x, y + timeHeight, width, noteHeight);
      });
    }
  }, [notesData, currentTime])

  const renderMidiNotes = (notes, currentTime) => {
    const canvas = canvasRef.current;

    if (canvas && notes) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const noteHeight = 8;
      const noteSpacing = 4;
      const pianoKeyWidth = 20;
      const timeHeight = 8;

      const minTime = 0;
      const maxTime = parseFloat(fileInfo.duration);

      const minMidi = Math.min(...notes.map(note => note.pitchMidi));
      const maxMidi = Math.max(...notes.map(note => note.pitchMidi));

      const canvasWidth = (maxTime - minTime) * 100;
      const canvasHeight = 308;

      canvas.width = canvasWidth + pianoKeyWidth;
      canvas.height = canvasHeight + timeHeight;

      const drawPianoKeys = () => {
        // Draw piano keys
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, timeHeight, pianoKeyWidth, canvasHeight - timeHeight);

        for (let i = minMidi; i <= maxMidi; i++) {
          const y = canvasHeight - timeHeight - ((i - minMidi) / (maxMidi - minMidi)) * (canvasHeight - timeHeight - noteHeight - noteSpacing);
          ctx.fillStyle = (i % 12 === 1 || i % 12 === 3 || i % 12 === 6 || i % 12 === 8 || i % 12 === 10) ? '#000' : '#fff';
          ctx.fillRect(0, y + timeHeight, pianoKeyWidth, noteHeight);
          ctx.strokeRect(0, y + timeHeight, pianoKeyWidth, noteHeight);
        }
      };

      const drawTimeLabels = () => {
        // Draw time labels
        ctx.fillStyle = '#000';
        for (let t = minTime; t <= maxTime; t += 1) {
          const x = pianoKeyWidth + (t - minTime) * 100;
          ctx.fillText(t.toFixed(0) + 's', x, 15);
          ctx.beginPath();
          ctx.moveTo(x, timeHeight);
          ctx.lineTo(x, canvasHeight + timeHeight);
          ctx.strokeStyle = '#e0e0e0';
          ctx.stroke();
        }
      };

      const drawProgress = () => {
        // Draw progress bar
        const progressWidth = canvasWidth * (currentTime / maxTime);
        ctx.fillStyle = '#007bff';
        ctx.fillRect(pianoKeyWidth, 0, progressWidth, timeHeight);
        ctx.fillStyle = '#000';
        ctx.fillRect(pianoKeyWidth + progressWidth - 1, 0, 2, timeHeight);
      };

      drawPianoKeys();
      drawTimeLabels();
      drawProgress();

      notes.forEach((note) => {
        const x = pianoKeyWidth + (note.startTimeSeconds - minTime) * 100; // 100px per second
        const y = canvasHeight - timeHeight - ((note.pitchMidi - minMidi) / (maxMidi - minMidi)) * (canvasHeight - timeHeight - noteHeight - noteSpacing);
        const width = note.durationSeconds * 80;

        ctx.fillStyle = '#007bff';
        ctx.fillRect(x, y + timeHeight, width, noteHeight);
      });
    }
  };

  const playMidi = async (midiData, setCurrentTime) => {
    try {
      // Create a Blob from the MIDI data
      const blob = new Blob([midiData], { type: 'audio/midi' });
      // Create a URL from the Blob
      const url = URL.createObjectURL(blob);
      console.log("MIDI File URL:", url);

      // Fetch the MIDI file
      const response = await fetch(url);
      console.log(response);
      const arrayBuffer = await response.arrayBuffer();
      console.log(arrayBuffer);

      // Parse the MIDI file into JSON format
      const midi = new Midi(arrayBuffer);
      console.log(midi);

      // Create a new Sampler and connect it to the destination (speaker)

      // Schedule the notes to be played
      try {
        midi.tracks.forEach(track => {
          track.notes.forEach(note => {
            Tone.Transport.schedule((time) => {
              sampler.triggerAttackRelease(note.name, note.duration, time);
            }, note.time);
          });
        });
      } catch (error) {
        console.error("Error scheduling notes:", error);
      }
      const endTime = Math.max(...midi.tracks.map(track => {
        return track.notes.reduce((maxTime, note) => Math.max(maxTime, note.time + note.duration), 0);
      }));


      Tone.Transport.scheduleOnce(() => {
        Tone.Transport.stop();
        setMidiPlaying(false);
        setCurrentTime(0);
        console.log("Playback ended");
      }, endTime);

      await Tone.start();
      setMidiPlaying(true)
      Tone.Transport.start();
      console.log("Playback started");

      Tone.Transport.scheduleRepeat((time) => {
        setCurrentTime(time);
      }, '100n');

    } catch (error) {
      console.error("Error playing MIDI with Tone.js:", error);
    }
  };

  const pauseMidi = () => {
    Tone.Transport.pause();
    setMidiPlaying(false)
    console.log("Playback paused");
  };

  const stopMidi = () => {
    Tone.Transport.stop();
    console.log("Playback stopped");
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
          {fileInfo.name && (
            <audio ref={audioRef} controls />
          )}

          <div ref={midiAudioRef}></div>

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
              <button onClick={!midiPlaying ? () => playMidi(midiFileData, setCurrentTime) : pauseMidi}>
                {midiPlaying ? 'Pause MIDI' : 'Play MIDI'}
              </button>

              <button onClick={downloadFile}>
                Download File
              </button>
            </div>
          )}
        </div>
        <div className="right-panel" >
          <div className="slider-row">
            <Slider
              label="Note Segmentation"
              name="slider1"
              value={sliderValues.slider1}
              onChange={handleSliderChange}
              minLabel="Split Notes"
              maxLabel="Merge Notes"
              description="Controls the segmentation of notes"
              min={0.05}
              max={1}
              step={0.05}
            />
            <Slider
              label="Model Confidence Threshold"
              name="slider2"
              value={sliderValues.slider2}
              onChange={handleSliderChange}
              minLabel="More Notes"
              maxLabel="Fewer Notes"
              description="Sets the confidence threshold for the model"
              min={0.05}
              max={1}
              step={0.05}
            />
          </div>
          <div className="slider-row">
            <Slider
              label="Minimum Pitch"
              name="slider3"
              value={sliderValues.slider3}
              onChange={handleSliderChange}
              minLabel="Lower notes"
              maxLabel="Higher notes"
              description="Specifies the minimum pitch value, Hz"
              min={0}
              max={2000}
              step={10}
            />
            <Slider
              label="Maximum Pitch"
              name="slider4"
              value={sliderValues.slider4}
              onChange={handleSliderChange}
              minLabel="Lower notes"
              maxLabel="Higher notes"
              description="Specifies the maximum pitch value, Hz"
              min={40}
              max={3000}
              step={10}
            />
          </div>
          <div className="slider-row">
            <Slider
              label="Minimum Note Length"
              name="slider5"
              value={sliderValues.slider5}
              onChange={handleSliderChange}
              minLabel="Short Notes"
              maxLabel="Long Notes"
              description="Defines the minimum length of notes, in ms"
              min={3}
              max={50}
              step={1}
            />
            <Slider
              label="MIDI File Tempo"
              name="slider6"
              value={sliderValues.slider6}
              onChange={handleSliderChange}
              minLabel="Lower value"
              maxLabel="Higher value"
              description="Adjusts the tempo of the MIDI file"
              min={24}
              max={224}
              step={1}
            />
          </div>
          <div style={{ position: 'relative', width: midiFileData ? '688px' : '0', height: midiFileData ? '331px' : '0' }}>
            {showLoader && (
              <div className="loader-overlay">
                <div className="loader">
                  <TailSpin
                    color="#007bff"
                    height={344}
                    width={150}
                  />
                </div>
              </div>
            )}
            <div id="canvas-container" style={{ position: 'absolute', top: 0, left: 0, overflow: 'auto', width: '100%', height: '100%', scrollbarWidth: 'thin', scrollbarColor: '#888 #f1f1f1', visibility: midiFileData ? 'visible' : 'hidden' }}>
              <canvas ref={canvasRef} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;