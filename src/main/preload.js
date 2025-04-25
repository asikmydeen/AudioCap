// preload.js

const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe API surface to the renderer process
contextBridge.exposeInMainWorld('api', {
  /**
   * Invoke an IPC channel in the main process.
   * @param {string} channel - The channel to invoke.
   * @param  {...any} args - Arguments to pass to the main process.
   * @returns {Promise<any>} - Resolves with the result from the main process.
   */
  invoke(channel, ...args) {
    return ipcRenderer.invoke(channel, ...args);
  },

  /**
   * Listen for asynchronous messages from the main process.
   * @param {string} channel - The channel to listen on.
   * @param {Function} listener - Callback executed with message arguments.
   */
  on(channel, listener) {
    const wrappedListener = (event, ...args) => listener(...args);
    ipcRenderer.on(channel, wrappedListener);
    return () => ipcRenderer.removeListener(channel, wrappedListener);
  },

  /**
   * Remove a previously added listener or all listeners for a channel.
   * @param {string} channel - The channel to remove listeners from.
   * @param {Function} [listener] - Specific listener to remove. If omitted, all listeners are removed.
   */
  off(channel, listener) {
    if (listener) {
      ipcRenderer.removeListener(channel, listener);
    } else {
      ipcRenderer.removeAllListeners(channel);
    }
  }
});
