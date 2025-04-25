// src/renderer/renderer.js

// Renderer process UI logic
// Uses the secure API exposed via preload (window.api)

// Module imports
const path = require('path');

// DOM Elements
const audioSourceSelect = document.getElementById('audio-source-select');
const recordButton = document.getElementById('record-button');
const stopButton = document.getElementById('stop-button');
const formatSelect = document.getElementById('format-select');
const timeDisplay = document.querySelector('.time-display');
const visualizer = document.getElementById('visualizer');
const recordingsList = document.getElementById('recordings-list');
const transcriptionToggle = document.getElementById('transcription-toggle');
const transcriptionSettings = document.getElementById('transcription-settings');
const transcriptionResults = document.getElementById('transcription-results');
const addTriggerButton = document.getElementById('add-trigger');
const triggersList = document.getElementById('triggers-list');

// Settings modal elements
const settingsModal = document.getElementById('settings-modal');
const settingsForm = document.getElementById('settings-form');
const defaultFormatSelect = document.getElementById('default-format');
const defaultSavePathInput = document.getElementById('default-save-path');
const browseButton = document.getElementById('browse-button');
const cancelSettingsButton = document.getElementById('cancel-settings');
const settingsCloseButton = settingsModal.querySelector('.close');

// Trigger modal elements
const triggerModal = document.getElementById('trigger-modal');
const triggerForm = document.getElementById('trigger-form');
const triggerEventSelect = document.getElementById('trigger-event');
const keywordInput = document.getElementById('keyword-input');
const triggerActionSelect = document.getElementById('trigger-action');
const apiDetails = document.getElementById('api-details');
const cancelTriggerButton = document.getElementById('cancel-trigger');
const triggerCloseButton = triggerModal.querySelector('.close');

// About modal elements
const aboutModal = document.getElementById('about-modal');
const aboutCloseButton = aboutModal.querySelector('.close');

// Application State
let isRecording = false;
let recordingId = null;
let recordingStartTime = null;
let timerInterval = null;
let triggers = [];
let currentSettings = {};
let recordingsData = [];

// Initialize the application
async function initialize() {
  // Load settings
  currentSettings = await window.api.invoke('get-settings');
  
  // Load audio sources
  loadAudioSources();
  
  // Set default format from settings
  formatSelect.value = currentSettings.defaultFormat;
  
  // Initialize canvas for visualization
  initializeVisualizer();
  
  // Apply settings to form elements
  defaultFormatSelect.value = currentSettings.defaultFormat;
  defaultSavePathInput.value = currentSettings.defaultSavePath;
  
  // Set up transcription toggle based on settings
  transcriptionToggle.checked = currentSettings.transcriptionEnabled;
  if (currentSettings.transcriptionEnabled) {
    transcriptionSettings.classList.remove('hidden');
    document.getElementById('api-key').value = currentSettings.transcriptionApiKey || '';
    document.getElementById('api-url').value = currentSettings.transcriptionApiUrl || '';
  }
}

// Load available audio sources from the main process
async function loadAudioSources() {
  try {
    const sources = await window.api.invoke('get-audio-sources');
    
    // Clear existing options (except the placeholder)
    while (audioSourceSelect.options.length > 1) {
      audioSourceSelect.remove(1);
    }
    
    // Add sources to select element
    sources.forEach(source => {
      const option = document.createElement('option');
      option.value = source.id;
      option.textContent = source.name;
      audioSourceSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to load audio sources:', error);
    alert('Failed to load audio sources. Please restart the application.');
  }
}

// Initialize the audio visualizer
function initializeVisualizer() {
  const canvas = visualizer;
  const canvasCtx = canvas.getContext('2d');
  
  // Set canvas dimensions
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  
  // Draw placeholder visualization
  canvasCtx.fillStyle = '#f0f0f0';
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
  canvasCtx.fillStyle = '#ccc';
  canvasCtx.font = '16px Arial';
  canvasCtx.textAlign = 'center';
  canvasCtx.fillText('Audio visualization will appear here during recording', canvas.width / 2, canvas.height / 2);
}

// Start recording audio
async function startRecording() {
  if (!audioSourceSelect.value) {
    alert('Please select an audio source first.');
    return;
  }
  
  try {
    const options = {
      sourceId: audioSourceSelect.value,
      format: formatSelect.value,
      savePath: currentSettings.defaultSavePath
    };
    
    const result = await window.api.invoke('start-recording', options);
    
    if (result.success) {
      isRecording = true;
      recordingId = result.id;
      recordingStartTime = Date.now();
      
      recordButton.disabled = true;
      stopButton.disabled = false;
      audioSourceSelect.disabled = true;
      formatSelect.disabled = true;
      
      timerInterval = setInterval(updateTimer, 1000);
      
      startVisualization();
    } else {
      alert('Failed to start recording.');
    }
  } catch (error) {
    console.error('Recording error:', error);
    alert('An error occurred while starting the recording.');
  }
}

// Stop recording audio
async function stopRecording() {
  if (!isRecording) return;
  
  try {
    const result = await window.api.invoke('stop-recording', recordingId);
    
    if (result.success) {
      isRecording = false;
      
      recordButton.disabled = false;
      stopButton.disabled = true;
      audioSourceSelect.disabled = false;
      formatSelect.disabled = false;
      
      clearInterval(timerInterval);
      
      stopVisualization();
      
      addRecordingToList(recordingId, result.path);
      
      executeTriggers('recording-stopped');
      
      recordingId = null;
      recordingStartTime = null;
      timeDisplay.textContent = '00:00:00';
    } else {
      alert('Failed to stop recording.');
    }
  } catch (error) {
    console.error('Error stopping recording:', error);
    alert('An error occurred while stopping the recording.');
  }
}

// Update the timer display
function updateTimer() {
  if (!recordingStartTime) return;
  
  const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
  const hours = Math.floor(elapsed / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');
  
  timeDisplay.textContent = `${hours}:${minutes}:${seconds}`;
}

// Start audio visualization (placeholder implementation)
function startVisualization() {
  const canvasCtx = visualizer.getContext('2d');
  canvasCtx.fillStyle = '#f0f0f0';
  canvasCtx.fillRect(0, 0, visualizer.width, visualizer.height);
  
  let x = 0;
  function drawFrame() {
    if (!isRecording) return;
    
    canvasCtx.fillStyle = '#f0f0f0';
    canvasCtx.fillRect(0, 0, visualizer.width, visualizer.height);
    
    canvasCtx.beginPath();
    canvasCtx.strokeStyle = '#2e7d32';
    canvasCtx.lineWidth = 2;
    
    for (let i = 0; i < visualizer.width; i++) {
      const y = (visualizer.height / 2) + Math.sin((i + x) * 0.05) * (visualizer.height / 4);
      if (i === 0) canvasCtx.moveTo(i, y);
      else canvasCtx.lineTo(i, y);
    }
    
    canvasCtx.stroke();
    x += 2;
    requestAnimationFrame(drawFrame);
  }
  drawFrame();
}

// Stop audio visualization
function stopVisualization() {
  const canvasCtx = visualizer.getContext('2d');
  canvasCtx.fillStyle = '#f0f0f0';
  canvasCtx.fillRect(0, 0, visualizer.width, visualizer.height);
  canvasCtx.fillStyle = '#ccc';
  canvasCtx.font = '16px Arial';
  canvasCtx.textAlign = 'center';
  canvasCtx.fillText('Audio visualization will appear here during recording', visualizer.width / 2, visualizer.height / 2);
}

// Add a recording to the list
function addRecordingToList(id, filePath) {
  const fileName = path.basename(filePath);
  const date = new Date().toLocaleString();
  
  const li = document.createElement('li');
  const infoDiv = document.createElement('div');
  infoDiv.classList.add('recording-info');
  infoDiv.innerHTML = `
    <div class="recording-name">${fileName}</div>
    <div class="recording-date">${date}</div>
  `;
  
  const controlsDiv = document.createElement('div');
  controlsDiv.classList.add('recording-controls');
  
  const playButton = document.createElement('button');
  playButton.textContent = 'Play';
  playButton.classList.add('secondary-button');
  playButton.addEventListener('click', () => {
    alert('Play functionality not implemented yet.');
  });
  
  const deleteButton = document.createElement('button');
  deleteButton.textContent = 'Delete';
  deleteButton.classList.add('secondary-button');
  deleteButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete this recording?')) {
      recordingsList.removeChild(li);
      console.log('Deleting file:', filePath);
    }
  });
  
  controlsDiv.appendChild(playButton);
  controlsDiv.appendChild(deleteButton);
  li.appendChild(infoDiv);
  li.appendChild(controlsDiv);
  recordingsList.appendChild(li);
  
  recordingsData.push({ id, path: filePath, date });
}

// Execute automation triggers
function executeTriggers(eventType, data = {}) {
  triggers.forEach(trigger => {
    if (trigger.event === eventType) {
      console.log(`Executing trigger: ${trigger.event} -> ${trigger.action}`);
      switch (trigger.action) {
        case 'save-file':
          console.log('Saving file with options:', trigger.options);
          break;
        case 'api-call':
          if (trigger.options && trigger.options.endpoint) {
            console.log(`${trigger.options.method || 'POST'} request to ${trigger.options.endpoint}`);
          }
          break;
        case 'notification':
          new Notification('AudioCap', { body: `Trigger executed: ${trigger.event}` });
          break;
      }
    }
  });
}

// Event Listeners
recordButton.addEventListener('click', startRecording);
stopButton.addEventListener('click', stopRecording);
transcriptionToggle.addEventListener('change', () => {
  if (transcriptionToggle.checked) transcriptionSettings.classList.remove('hidden');
  else transcriptionSettings.classList.add('hidden');
  currentSettings.transcriptionEnabled = transcriptionToggle.checked;
  window.api.invoke('save-settings', currentSettings);
});
addTriggerButton.addEventListener('click', () => { triggerModal.style.display = 'block'; });
triggerEventSelect.addEventListener('change', () => { keywordInput.style.display = triggerEventSelect.value === 'keyword-detected' ? 'block' : 'none'; });
triggerActionSelect.addEventListener('change', () => { apiDetails.style.display = triggerActionSelect.value === 'api-call' ? 'block' : 'none'; });
triggerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const newTrigger = { id: Date.now().toString(), event: triggerEventSelect.value, action: triggerActionSelect.value, options: {} };
  if (newTrigger.event === 'keyword-detected') newTrigger.options.keyword = document.getElementById('trigger-keyword').value;
  if (newTrigger.action === 'api-call') {
    newTrigger.options.endpoint = document.getElementById('api-endpoint').value;
    newTrigger.options.method = document.getElementById('api-method').value;
  }
  triggers.push(newTrigger);
  addTriggerToList(newTrigger);
  triggerModal.style.display = 'none';
  triggerForm.reset();
});

function addTriggerToList(trigger) {
  const li = document.createElement('li');
  let description = '';
  switch (trigger.event) {
    case 'recording-stopped': description += 'When recording stops'; break;
    case 'silence-detected': description += 'When silence is detected'; break;
    case 'keyword-detected': description += `When keyword "${trigger.options.keyword}" is detected`; break;
  }
  description += ' → ';
  switch (trigger.action) {
    case 'save-file': description += 'Save file'; break;
    case 'api-call': description += `Make ${trigger.options.method} request to ${trigger.options.endpoint}`; break;
    case 'notification': description += 'Show notification'; break;
  }
  li.textContent = description;
  const deleteButton = document.createElement('button');
  deleteButton.textContent = 'Remove';
  deleteButton.classList.add('secondary-button');
  deleteButton.style.marginLeft = '10px';
  deleteButton.addEventListener('click', () => {
    triggersList.removeChild(li);
    triggers = triggers.filter(t => t.id !== trigger.id);
  });
  li.appendChild(deleteButton);
  triggersList.appendChild(li);
}

settingsForm.addEventListener('submit', (e) => {
  e.preventDefault();
  currentSettings.defaultFormat = defaultFormatSelect.value;
  currentSettings.defaultSavePath = defaultSavePathInput.value;
  window.api.invoke('save-settings', currentSettings);
  settingsModal.style.display = 'none';
});
cancelSettingsButton.addEventListener('click', () => {
  defaultFormatSelect.value = currentSettings.defaultFormat;
  defaultSavePathInput.value = currentSettings.defaultSavePath;
  settingsModal.style.display = 'none';
});
cancelTriggerButton.addEventListener('click', () => { triggerForm.reset(); triggerModal.style.display = 'none'; });
settingsCloseButton.addEventListener('click', () => { settingsModal.style.display = 'none'; });
triggerCloseButton.addEventListener('click', () => { triggerModal.style.display = 'none'; });
aboutCloseButton.addEventListener('click', () => { aboutModal.style.display = 'none'; });

window.addEventListener('click', (e) => {
  if (e.target === settingsModal) settingsModal.style.display = 'none';
  else if (e.target === triggerModal) triggerModal.style.display = 'none';
  else if (e.target === aboutModal) aboutModal.style.display = 'none';
});

browseButton.addEventListener('click', () => {
  defaultSavePathInput.value = path.join(require('os').homedir(), 'AudioCap', 'Recordings');
});

window.api.on('open-settings', () => { settingsModal.style.display = 'block'; });
window.api.on('open-about', () => { aboutModal.style.display = 'block'; });

document.addEventListener('DOMContentLoaded', initialize);