const portAudio = require('naudiodon');

class AudioSourceManager {
  constructor() {
    this.devices = [];
    this.refresh();
  }

  /**
   * Refresh the internal device list by querying the system audio devices.
   */
  refresh() {
    try {
      const allDevices = portAudio.getDevices();
      this.devices = Array.isArray(allDevices) ? allDevices : [];
    } catch (err) {
      console.error('Failed to enumerate audio devices:', err);
      this.devices = [];
    }
  }

  /**
   * Returns an array of audio input sources available on the system.
   * Only devices with at least one input channel are included.
   * @returns {Array<{id: number, name: string, maxInputChannels: number, defaultSampleRate: number, hostAPIName: string}>}
   */
  getSources() {
    // Update list in case devices changed externally
    this.refresh();

    return this.devices
      .filter(device => device.maxInputChannels > 0)
      .map(device => ({
        id: device.id,
        name: device.name || `Device ${device.id}`,
        maxInputChannels: device.maxInputChannels,
        defaultSampleRate: device.defaultSampleRate,
        hostAPIName: device.hostAPIName
      }));
  }
}

module.exports = new AudioSourceManager();
