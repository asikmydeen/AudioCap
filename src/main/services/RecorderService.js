const { EventEmitter } = require('events');
const portAudio = require('naudiodon');
const fs = require('fs');
const { Encoder } = require('lame');

class RecorderService extends EventEmitter {
  constructor() {
    super();
    this.recorders = new Map();
  }

  startRecording(options = {}) {
    const {
      deviceId,
      channels = 2,
      sampleRate = 44100,
      bitRate = 128,
      filePath = `recording-${Date.now()}.mp3`,
      silenceThreshold = 2000, // ms of silence before detection
      silenceLevel = 0.01      // fraction of max amplitude
    } = options;

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    // Create audio input
    const ai = new portAudio.AudioIO({
      inOptions: {
        channelCount: channels,
        sampleFormat: portAudio.SampleFormat16Bit,
        sampleRate: sampleRate,
        deviceId: deviceId,
        closeOnError: true
      }
    });

    // Setup MP3 encoder
    const encoder = new Encoder({
      channels: channels,
      bitDepth: 16,
      sampleRate: sampleRate,
      bitRate: bitRate,
      outSampleRate: sampleRate,
      mode: channels === 1 ? Encoder.MONO : Encoder.STEREO
    });

    // File write stream
    const fileStream = fs.createWriteStream(filePath);

    // Silence detection
    let silentSince = null;
    let silenceEmitted = false;
    const absThreshold = silenceLevel * 32767;

    ai.on('data', (chunk) => {
      let max = 0;
      for (let i = 0; i < chunk.length; i += 2) {
        const sample = Math.abs(chunk.readInt16LE(i));
        if (sample > max) max = sample;
      }
      const now = Date.now();
      if (max < absThreshold) {
        if (!silentSince) {
          silentSince = now;
        } else if (!silenceEmitted && (now - silentSince) >= silenceThreshold) {
          silenceEmitted = true;
          this.emit('silence-detected', { id });
        }
      } else {
        silentSince = null;
        silenceEmitted = false;
      }
    });

    // Pipe streams
    ai.pipe(encoder).pipe(fileStream);
    ai.start();

    this.recorders.set(id, { ai, encoder, fileStream });
    this.emit('recording-started', { id, filePath, options });
    return id;
  }

  stopRecording(id) {
    const rec = this.recorders.get(id);
    if (!rec) return false;
    const { ai, encoder, fileStream } = rec;
    try {
      ai.quit();
    } catch {
      ai.stop();
    }
    encoder.end();
    fileStream.end();

    this.recorders.delete(id);
    this.emit('recording-stopped', { id });
    return true;
  }
}

module.exports = RecorderService;
