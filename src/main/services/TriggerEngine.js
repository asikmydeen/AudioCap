const fs = require('fs').promises;
const path = require('path');

class TriggerEngine {
  constructor(recorderService, settingsStore = null) {
    this.recorderService = recorderService;
    this.settingsStore = settingsStore;
    this.triggers = [];
    this.subscriptions = new Set();

    if (this.settingsStore) {
      this.loadStoredTriggers();
    }
    
    // Subscribe to events if recorderService is available
    if (this.recorderService) {
      this.triggers.forEach(trigger => this.subscribeForEvent(trigger.event));
    }
    
    console.log('[Mock] TriggerEngine initialized');
  }

  loadStoredTriggers() {
    try {
      const stored = this.settingsStore.get('triggers');
      if (Array.isArray(stored)) {
        this.triggers = stored;
        console.log('[Mock] Loaded', stored.length, 'triggers from settings store');
      }
    } catch (err) {
      console.error('[Mock] Failed to load stored triggers:', err);
    }
  }

  saveStoredTriggers() {
    if (!this.settingsStore) return;
    try {
      this.settingsStore.set('triggers', this.triggers);
      console.log('[Mock] Saved', this.triggers.length, 'triggers to settings store');
    } catch (err) {
      console.error('[Mock] Failed to save triggers:', err);
    }
  }

  subscribeForEvent(eventName) {
    if (!this.recorderService) return;
    if (this.subscriptions.has(eventName)) return;
    
    this.subscriptions.add(eventName);
    this.recorderService.on(eventName, data => {
      this.handleTrigger(eventName, data);
    });
    
    console.log('[Mock] Subscribed to event:', eventName);
  }

  addTrigger(trigger) {
    if (!trigger.id) {
      trigger.id = this.generateId();
    }
    this.triggers.push(trigger);
    
    if (this.recorderService) {
      this.subscribeForEvent(trigger.event);
    }
    
    this.saveStoredTriggers();
    console.log('[Mock] Added trigger:', trigger);
    return trigger.id;
  }

  removeTrigger(triggerId) {
    const idx = this.triggers.findIndex(t => t.id === triggerId);
    if (idx === -1) return false;
    
    const removed = this.triggers.splice(idx, 1)[0];
    this.saveStoredTriggers();
    console.log('[Mock] Removed trigger:', removed);
    return true;
  }

  listTriggers() {
    return this.triggers;
  }

  handleTrigger(eventName, data) {
    const matching = this.triggers.filter(t => t.event === eventName);
    console.log(`[Mock] Handling ${matching.length} triggers for event: ${eventName}`);
    
    matching.forEach(trigger => {
      trigger.actions.forEach(action => {
        this.executeAction(action, data);
      });
    });
  }

  async executeAction(action, data) {
    try {
      console.log('[Mock] Executing action:', action.type, 'with data:', data);
      
      switch (action.type) {
        case 'save-file': {
          console.log('[Mock] save-file action would copy a file here');
          break;
        }
        case 'api-call': {
          console.log('[Mock] api-call action would make an API call here');
          break;
        }
        case 'notification': {
          console.log('[Mock] notification action would show a notification here');
          break;
        }
        default:
          console.warn(`[Mock] Unknown action type: ${action.type}`);
      }
    } catch (err) {
      console.error('[Mock] Error executing trigger action:', err);
    }
  }

  generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
  }
}

module.exports = TriggerEngine;