import { Midi } from '@tonejs/midi';

export const generateFileData = (notes) => {
    const midi = new Midi();
    const track = midi.addTrack();
    notes.forEach(note => {
      track.addNote({
        midi: note.pitchMidi,
        time: note.startTimeSeconds,
        duration: note.durationSeconds,
        velocity: note.amplitude,
      });
      if (note.pitchBends !== undefined && note.pitchBends !== null) {
        note.pitchBends.forEach((bend, i) => {
          track.addPitchBend({
            time:
              note.startTimeSeconds +
              (i * note.durationSeconds) / note.pitchBends.length,
            value: bend,
          });
        });
      }
    });
    const midiArray = midi.toArray();
    return new Uint8Array(midiArray);
  };