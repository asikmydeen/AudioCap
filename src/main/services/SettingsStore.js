"use strict";

const { app } = require('electron');
const path = require('path');
const os = require('os');
const Store = require('electron-store');

class SettingsStore {
  constructor() {
    // Determine default save path
    const defaultSavePath = path.join(os.homedir(), 'AudioCap', 'Recordings');

    // Create the electron-store with schema validation
    this.store = new Store({
      name: 'settings',
      // Default values for user preferences
      defaults: {
        defaultFormat: 'wav',
        savePath: defaultSavePath,
        transcription: {
          enabled: false,
          language: 'en-US'
        },
        advanced: {
          silenceThreshold: 2000, // ms of silence before detection
          silenceLevel: 0.01,    // fraction of max amplitude
          bufferSize: 4096       // audio buffer size
        }
      },
      // Schema definition to ensure valid data types
      schema: {
        defaultFormat: {
          type: 'string',
          enum: ['wav', 'mp3', 'flac']
        },
        savePath: {
          type: 'string'
        },
        transcription: {
          type: 'object',
          properties: {
            enabled: {
              type: 'boolean'
            },
            language: {
              type: 'string'
            },
            apiKey: {
              type: 'string',
              default: ''
            },
            apiUrl: {
              type: 'string',
              default: ''
            }
          },
          required: ['enabled', 'language']
        },
        advanced: {
          type: 'object',
          properties: {
            silenceThreshold: {
              type: 'number',
              minimum: 0
            },
            silenceLevel: {
              type: 'number',
              minimum: 0,
              maximum: 1
            },
            bufferSize: {
              type: 'number',
              enum: [512, 1024, 2048, 4096, 8192, 16384]
            }
          }
        }
      }
    });

    console.log('[SettingsStore] Initialized with defaults:', this.store.store);
  }

  // Getters and setters for specific preferences
  getDefaultFormat() {
    return this.store.get('defaultFormat');
  }

  setDefaultFormat(format) {
    this.store.set('defaultFormat', format);
    console.log('[SettingsStore] Default format set to:', format);
  }

  getSavePath() {
    return this.store.get('savePath');
  }

  setSavePath(savePath) {
    this.store.set('savePath', savePath);
    console.log('[SettingsStore] Save path set to:', savePath);
  }

  getTranscriptionOptions() {
    return this.store.get('transcription');
  }

  setTranscriptionOptions(options) {
    this.store.set('transcription', options);
    console.log('[SettingsStore] Transcription options updated');
  }

  getAdvancedSettings() {
    return this.store.get('advanced');
  }

  setAdvancedSettings(settings) {
    this.store.set('advanced', settings);
    console.log('[SettingsStore] Advanced settings updated');
  }

  // Generic methods for other settings
  get(key) {
    if (key) {
      return this.store.get(key);
    }
    return this.store.store;
  }

  set(key, value) {
    this.store.set(key, value);
    console.log(`[SettingsStore] Setting '${key}' updated`);
    return true;
  }
}

// Export a singleton instance
module.exports = new SettingsStore();