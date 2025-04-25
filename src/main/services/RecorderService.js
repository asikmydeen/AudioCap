const EventEmitter = require('eventemitter3');
const portAudio = require('naudiodon');
const fs = require('fs');
const path = require('path');
const os = require('os');
const wavWriter = require('wav').FileWriter;
const audioSources = require('./AudioSourceManager');

class RecorderService extends EventEmitter {
  constructor() {
    super();
    this.recorders = new Map();
    
    // Create recordings directory if it doesn't exist
    const defaultDir = path.join(os.homedir(), 'AudioCap', 'Recordings');
    if (!fs.existsSync(defaultDir)) {
      try {
        fs.mkdirSync(defaultDir, { recursive: true });
        console.log(`[RecorderService] Created default recordings directory: ${defaultDir}`);
      } catch (err) {
        console.error('[RecorderService] Failed to create default recordings directory:', err);
      }
    }
  }

  startRecording(options = {}) {
    const {
      deviceId,
      channels = 2,
      sampleRate = 44100,
      format = 'wav',
      savePath = path.join(os.homedir(), 'AudioCap', 'Recordings')
    } = options;

    // Get device information
    const deviceIdInt = parseInt(deviceId);
    const device = audioSources.getDeviceById(deviceIdInt);
    
    if (!device) {
      console.error(`[RecorderService] Device with ID ${deviceId} not found`);
      return null;
    }
    
    console.log(`[RecorderService] Starting recording from device "${device.name}" (ID: ${deviceId}) in ${format} format`);
    
    // Generate a unique ID and filename
    const timestamp = Date.now();
    const id = `${timestamp}-${Math.random().toString(36).substr(2, 5)}`;
    const fileName = `recording-${timestamp}.${format}`;
    const filePath = path.join(savePath, fileName);
    
    // Ensure the save directory exists
    if (!fs.existsSync(savePath)) {
      try {
        fs.mkdirSync(savePath, { recursive: true });
        console.log(`[RecorderService] Created directory: ${savePath}`);
      } catch (err) {
        console.error('[RecorderService] Error creating directory:', err);
        this.emit('error', { id, error: err.message });
        return null;
      }
    }

    try {
      // Determine optimal settings based on the device
      const deviceChannels = Math.min(channels, device.maxInputChannels);
      const deviceSampleRate = device.defaultSampleRate || sampleRate;
      
      console.log(`[RecorderService] Using ${deviceChannels} channels at ${deviceSampleRate}Hz`);
      
      // Create audio input stream
      const ai = new portAudio.AudioIO({
        inOptions: {
          channelCount: deviceChannels,
          sampleFormat: portAudio.SampleFormat16Bit,
          sampleRate: deviceSampleRate,
          deviceId: deviceIdInt,
          closeOnError: true
        }
      });

      console.log(`[RecorderService] Created audio input stream for device ${deviceId}`);
      
      // Set up WAV file writer
      const fileWriter = new wavWriter(filePath, {
        channels: deviceChannels,
        sampleRate: deviceSampleRate,
        bitDepth: 16
      });
      
      // Connect input to output
      ai.pipe(fileWriter);
      
      // Silence detection variables
      let silentSince = null;
      let silenceDetected = false;
      const silenceThreshold = options.silenceThreshold || 2000; // ms
      const silenceLevel = options.silenceLevel || 0.01; // fraction of max amplitude
      const absThreshold = silenceLevel * 32767; // for 16-bit audio
      
      // Set up silence detection
      ai.on('data', (buffer) => {
        // Look for silence in the audio data
        let max = 0;
        for (let i = 0; i < buffer.length; i += 2) {
          const sample = Math.abs(buffer.readInt16LE(i));
          if (sample > max) max = sample;
        }
        
        const now = Date.now();
        if (max < absThreshold) {
          // Silence detected
          if (!silentSince) {
            silentSince = now;
          } else if (!silenceDetected && (now - silentSince) >= silenceThreshold) {
            silenceDetected = true;
            this.emit('silence-detected', { id });
            console.log(`[RecorderService] Silence detected for recording ${id}`);
          }
        } else {
          // Audio detected
          silentSince = null;
          silenceDetected = false;
        }
      });
      
      // Start recording
      ai.start();
      console.log(`[RecorderService] Recording started: ${filePath}`);
      
      // Store recorder information
      this.recorders.set(id, {
        ai,
        fileWriter,
        filePath,
        startTime: Date.now(),
        options,
        deviceInfo: {
          name: device.name,
          channels: deviceChannels,
          sampleRate: deviceSampleRate,
          isSystemAudio: device.isSystemAudio || false
        }
      });
      
      // Emit event
      this.emit('recording-started', { 
        id, 
        filePath, 
        deviceName: device.name,
        isSystemAudio: device.isSystemAudio || false
      });
      
      return id;
    } catch (err) {
      console.error('[RecorderService] Error starting recording:', err);
      this.emit('error', { id, error: err.message });
      return null;
    }
  }

  stopRecording(id) {
    if (!this.recorders.has(id)) {
      console.log(`[RecorderService] Recording ${id} not found`);
      return { success: false, message: 'Recording not found' };
    }
    
    const rec = this.recorders.get(id);
    console.log(`[RecorderService] Stopping recording ${id}: ${rec.filePath}`);
    
    try {
      // Stop the audio input
      try {
        rec.ai.quit();
      } catch (e) {
        rec.ai.stop();
      }
      
      // End the file writer
      rec.fileWriter.end();
      
      // Calculate duration
      const duration = (Date.now() - rec.startTime) / 1000; // in seconds
      
      // Clean up
      this.recorders.delete(id);
      
      // Emit event
      this.emit('recording-stopped', { 
        id, 
        filePath: rec.filePath, 
        duration,
        deviceName: rec.deviceInfo.name,
        isSystemAudio: rec.deviceInfo.isSystemAudio
      });
      
      return {
        success: true,
        id,
        path: rec.filePath,
        duration,
        deviceName: rec.deviceInfo.name
      };
    } catch (err) {
      console.error('[RecorderService] Error stopping recording:', err);
      
      // Clean up anyway
      this.recorders.delete(id);
      
      return {
        success: false,
        message: err.message
      };
    }
  }

  // Get list of active recordings
  getActiveRecordings() {
    const recordings = [];
    for (const [id, rec] of this.recorders.entries()) {
      recordings.push({
        id,
        filePath: rec.filePath,
        deviceName: rec.deviceInfo.name,
        duration: (Date.now() - rec.startTime) / 1000,
        isSystemAudio: rec.deviceInfo.isSystemAudio
      });
    }
    return recordings;
  }
}

module.exports = RecorderService;