# AudioCap

AudioCap is a desktop application for recording audio from various sources on your computer, similar to Audio Hijack. It's built with Electron to provide cross-platform compatibility, with a primary focus on Windows.

## Features

- Record audio from selected applications or system audio
- Save recordings in multiple formats (WAV, MP3)
- Visualize audio during recording
- Set up automation triggers based on events
- Future support for streaming audio to transcription APIs

## Setup and Installation

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/audio-cap.git
   cd audio-cap
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application:
   ```bash
   npm start
   ```

### Building for Distribution

To create platform-specific distributables:

- **Windows**:
  ```bash
  npm run build:win
  ```

- **macOS**:
  ```bash
  npm run build:mac
  ```

- **Linux**:
  ```bash
  npm run build:linux
  ```

The built applications will be available in the `dist` folder.

## Usage

### Recording Audio

1. Select an audio source from the dropdown.
2. Choose your preferred format (WAV or MP3).
3. Click the **Record** button to start recording.
4. Click **Stop** when finished.
5. The recording will appear in the “Recent Recordings” list.

### Setting Up Automation Triggers

1. Click **Add Trigger** in the Automation section.
2. Choose an event type (e.g., **Recording Stopped**).
3. Select an action to perform when the event occurs.
4. Fill in any additional details required for the action.
5. Click **Save Trigger**.

### Configuring Settings

Access settings through the **File** menu or by pressing the **Settings** button:

- **Default format**: Choose the default recording format.
- **Default save location**: Set where recordings are saved.
