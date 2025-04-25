const portAudio = require('naudiodon');
const os = require('os');
const { exec } = require('child_process');

class AudioSourceManager {
  constructor() {
    this.devices = [];
    this.systemAudioDevices = [];
    this.refresh();
  }

  /**
   * Refresh the internal device list by querying the system audio devices.
   */
  refresh() {
    try {
      // Get all audio devices from portAudio
      const allDevices = portAudio.getDevices();
      this.devices = Array.isArray(allDevices) ? allDevices : [];
      
      console.log(`[AudioSourceManager] Found ${this.devices.length} audio devices`);
      
      // Platform-specific enhancements
      if (os.platform() === 'win32') {
        this._enhanceWindowsDevices();
      } else if (os.platform() === 'darwin') {
        this._enhanceMacOSDevices();
      }
    } catch (err) {
      console.error('[AudioSourceManager] Failed to enumerate audio devices:', err);
      this.devices = [];
    }
  }

  /**
   * Enhance Windows device detection
   * Look for Stereo Mix and similar system audio devices
   */
  _enhanceWindowsDevices() {
    // Look for known system audio capture names
    const systemAudioKeywords = [
      'stereo mix', 'what u hear', 'loopback', 'wasapi', 'wave out',
      'output', 'voicemeeter', 'virtual audio'
    ];
    
    this.systemAudioDevices = this.devices.filter(device => {
      if (!device.name) return false;
      const name = device.name.toLowerCase();
      return systemAudioKeywords.some(keyword => name.includes(keyword));
    });
    
    if (this.systemAudioDevices.length > 0) {
      console.log(`[AudioSourceManager] Found ${this.systemAudioDevices.length} system audio devices`);
    } else {
      console.log('[AudioSourceManager] No system audio devices found on Windows. ' +
        'Consider enabling Stereo Mix in your sound settings if available.');
    }
  }

  /**
   * Enhance macOS device detection
   */
  _enhanceMacOSDevices() {
    // Check for known macOS system audio capture solutions
    const macOSSystemAudioKeywords = [
      'blackhole', 'soundflower', 'loopback', 'aggregate'
    ];
    
    this.systemAudioDevices = this.devices.filter(device => {
      if (!device.name) return false;
      const name = device.name.toLowerCase();
      return macOSSystemAudioKeywords.some(keyword => name.includes(keyword));
    });
    
    if (this.systemAudioDevices.length > 0) {
      console.log(`[AudioSourceManager] Found ${this.systemAudioDevices.length} system audio devices on macOS`);
    } else {
      console.log('[AudioSourceManager] No system audio capture devices found on macOS.');
      console.log('[AudioSourceManager] Apple restricts system audio capture for security reasons.');
      
      // Attempt to check if any audio capture tools are installed
      this._checkMacOSAudioCapabilites();
    }
  }

  /**
   * Check if any known audio capture tools are installed on macOS
   */
  _checkMacOSAudioCapabilites() {
    // Check for Audio Hijack
    exec('mdfind "kMDItemCFBundleIdentifier == com.rogueamoeba.audiohijack*"', (error, stdout) => {
      if (!error && stdout.trim()) {
        console.log('[AudioSourceManager] Audio Hijack is installed! You can use it to route system audio to a virtual device.');
      }
    });
    
    // Check for BlackHole
    exec('kextstat | grep "BlackHole"', (error, stdout) => {
      if (!error && stdout.trim()) {
        console.log('[AudioSourceManager] BlackHole kernel extension is installed, but not detected as an audio device.');
      }
    });
  }

  /**
   * Returns an array of audio input sources available on the system.
   * @returns {Array<{id: number, name: string, maxInputChannels: number, defaultSampleRate: number, hostAPIName: string, isSystemAudio: boolean}>}
   */
  getSources() {
    // Update list in case devices changed externally
    this.refresh();

    // Filter to only include devices with input channels and mark system audio devices
    const inputDevices = this.devices
      .filter(device => device.maxInputChannels > 0)
      .map(device => {
        const isSystemAudio = this.systemAudioDevices.some(sysDevice => 
          sysDevice.id === device.id
        );
        
        return {
          id: device.id,
          name: device.name || `Device ${device.id}`,
          maxInputChannels: device.maxInputChannels,
          defaultSampleRate: device.defaultSampleRate,
          hostAPIName: device.hostAPIName,
          isSystemAudio
        };
      });
    
    console.log(`[AudioSourceManager] Returning ${inputDevices.length} input devices`);
    return inputDevices;
  }

  /**
   * Get a specific device by ID
   * @param {number} deviceId - The ID of the device to get
   * @returns {Object|null} - The device object or null if not found
   */
  getDeviceById(deviceId) {
    return this.devices.find(device => device.id === parseInt(deviceId)) || null;
  }

  /**
   * Get direct system audio capture instructions based on the platform
   */
  getSystemAudioCaptureInstructions() {
    const platform = os.platform();
    
    if (platform === 'win32') {
      return {
        hasDirect: this.systemAudioDevices.length > 0,
        message: this.systemAudioDevices.length > 0 
          ? 'Select one of the system audio devices to capture application audio.'
          : 'Enable "Stereo Mix" in your Windows sound settings to capture system audio directly.',
        devices: this.systemAudioDevices
      };
    } else if (platform === 'darwin') {
      return {
        hasDirect: this.systemAudioDevices.length > 0,
        message: this.systemAudioDevices.length > 0
          ? 'Select one of the system audio devices to capture application audio.'
          : 'macOS requires additional software like BlackHole, Loopback or Audio Hijack to capture system audio.',
        devices: this.systemAudioDevices
      };
    } else {
      return {
        hasDirect: false,
        message: 'System audio capture support varies on Linux. Try PulseAudio devices if available.',
        devices: []
      };
    }
  }
}

// Export singleton instance
module.exports = new AudioSourceManager();