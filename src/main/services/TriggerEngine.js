const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
const { Notification } = require('electron');

class TriggerEngine {
  constructor(recorderService, settingsStore = null) {
    this.recorderService = recorderService;
    this.settingsStore = settingsStore;
    this.triggers = [];
    this.subscriptions = new Set();

    if (this.settingsStore) {
      this.loadStoredTriggers();
    }
    this.triggers.forEach(trigger => this.subscribeForEvent(trigger.event));
  }

  loadStoredTriggers() {
    try {
      const stored = this.settingsStore.get('triggers');
      if (Array.isArray(stored)) {
        this.triggers = stored;
      }
    } catch (err) {
      console.error('Failed to load stored triggers:', err);
    }
  }

  saveStoredTriggers() {
    if (!this.settingsStore) return;
    try {
      this.settingsStore.set('triggers', this.triggers);
    } catch (err) {
      console.error('Failed to save triggers:', err);
    }
  }

  subscribeForEvent(eventName) {
    if (this.subscriptions.has(eventName)) return;
    this.subscriptions.add(eventName);
    this.recorderService.on(eventName, data => {
      this.handleTrigger(eventName, data);
    });
  }

  addTrigger(trigger) {
    if (!trigger.id) {
      trigger.id = this.generateId();
    }
    this.triggers.push(trigger);
    this.subscribeForEvent(trigger.event);
    this.saveStoredTriggers();
    return trigger.id;
  }

  removeTrigger(triggerId) {
    const idx = this.triggers.findIndex(t => t.id === triggerId);
    if (idx === -1) return false;
    const removed = this.triggers.splice(idx, 1)[0];
    this.saveStoredTriggers();
    return true;
  }

  listTriggers() {
    return this.triggers;
  }

  handleTrigger(eventName, data) {
    const matching = this.triggers.filter(t => t.event === eventName);
    matching.forEach(trigger => {
      trigger.actions.forEach(action => {
        this.executeAction(action, data);
      });
    });
  }

  async executeAction(action, data) {
    try {
      switch (action.type) {
        case 'save-file': {
          const src = data.filePath || data.file;
          if (!src) throw new Error('No file path available for save-file action');
          const destDir = action.params.destination;
          const fileName = path.basename(src);
          const destPath = path.join(destDir, fileName);
          await fs.copyFile(src, destPath);
          console.log(`File saved to ${destPath}`);
          break;
        }
        case 'api-call': {
          const { url, options } = action.params;
          const response = await fetch(url, options || {});
          if (!response.ok) {
            console.error(`API call failed: ${response.status} ${response.statusText}`);
          } else {
            console.log(`API call to ${url} succeeded`);
          }
          break;
        }
        case 'notification': {
          const { title, body } = action.params;
          new Notification({ title, body }).show();
          break;
        }
        default:
          console.warn(`Unknown action type: ${action.type}`);
      }
    } catch (err) {
      console.error('Error executing trigger action:', err);
    }
  }

  generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
  }
}

module.exports = TriggerEngine;
