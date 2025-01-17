// src/background/messageHandler.js

import { sendToOpenAI, cancelCurrentRequest } from "./openaiApi.js";

class BackgroundMessageHandler {
  constructor() {
    this.ongoingRequests = {};
    this.initListener();
  }

  /**
   * Initializes the listener for incoming messages
   */
  initListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log("Message received:", request);

      if (request.action && typeof this[request.action] === "function") {
        // Ensure payload exists
        request.payload = request.payload || {};

        // Include tabId in payload if available
        if (sender.tab && sender.tab.id !== undefined) {
          request.payload.tabId = sender.tab.id;
        } else {
          console.error("sender.tab.id is undefined");
          sendResponse({ success: false, error: "Tab ID is missing." });
          return;
        }

        this[request.action](request.payload)
          .then((data) => sendResponse({ success: true, data }))
          .catch((error) => {
            console.error("Handler error:", error);
            sendResponse({ success: false, error: error.message });
          });

        return true; // Indicates that sendResponse will be called asynchronously
      } else if (request.action === "showOptions") {
        this.showOptions();
        sendResponse({ success: true, message: "Options page opened" });
      } else {
        console.warn("Unknown action:", request.action);
        sendResponse({ success: false, error: "Unknown action" });
      }
    });
  }

  /**
   * Retrieves the current tab ID.
   * @param {Object} payload - Request data.
   * @param {Object} sender - Sender information.
   * @returns {Promise<number|null>} - The tab ID.
   */
  async getTabId(payload, sender) {
    return sender.tab ? sender.tab.id : null;
  }

  /**
   * Sends a request to OpenAI.
   * @param {Object} payload - Data for OpenAI.
   * @returns {Promise<void>}
   */
  async sendToOpenAI(payload) {
    console.log("Sending data to OpenAI:", payload);
    await sendToOpenAI(payload, this.ongoingRequests);
  }

  /**
   * Cancels the current request.
   * @param {Object} payload - Request data.
   * @returns {Promise<string>} - Cancellation status.
   */
  async cancelRequest(payload) {
    await cancelCurrentRequest(payload, this.ongoingRequests);
    return "Request cancelled successfully";
  }

  /**
   * Logs a message.
   * @param {Object} payload - Message data.
   * @returns {Promise<string>} - Confirmation.
   */
  async logMessage(payload) {
    console.log("Log message from content script:", payload);
    return "Message logged successfully";
  }

  async showOptions() {
    chrome.runtime.openOptionsPage();
  }
}

// Export an instance of the class
export default new BackgroundMessageHandler();
