"use strict";

const { app } = require('electron');
const path = require('path');
const Store = require('electron-store');

class SettingsStore {
  constructor() {
    // Determine a sensible default save path, fallback to documents
    const defaultSavePath = app.getPath('music') || app.getPath('documents');

    this.store = new Store({
      name: 'settings',
      // Default values for user preferences
      defaults: {
        defaultFormat: 'wav',
        savePath: defaultSavePath,
        transcription: {
          enabled: false,
          language: 'en-US'
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
            }
          },
          required: ['enabled', 'language']
        }
      }
    });
  }

  // Getters and setters for specific preferences
  getDefaultFormat() {
    return this.store.get('defaultFormat');
  }

  setDefaultFormat(format) {
    this.store.set('defaultFormat', format);
  }

  getSavePath() {
    return this.store.get('savePath');
  }

  setSavePath(savePath) {
    this.store.set('savePath', savePath);
  }

  getTranscriptionOptions() {
    return this.store.get('transcription');
  }

  setTranscriptionOptions(options) {
    this.store.set('transcription', options);
  }

  // Generic methods for other settings
  get(key) {
    return this.store.get(key);
  }

  set(key, value) {
    this.store.set(key, value);
  }
}

module.exports = new SettingsStore();
