// src/content/messageHandler.js

import {
  appendResultText,
  addAssistantMessage,
  getContext,
} from "../common/chatUtils";

class ContentMessageHandler {
  constructor() {
    this.currentRequestId = null;
    this.initListener();
  }

  // Initialize message listener from background
  initListener() {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.requestId !== this.currentRequestId) return;

      try {
        console.log("Message received:", message);
        switch (message.action) {
          case "streamData":
            appendResultText(message.content); // Append text to stream
            break;
          case "streamComplete":
            // Indicate that the message is complete
            appendResultText("", true); // Complete the message output
            console.log("Stream complete");

            // Add assistant text to context
            const completedMessage = getContext().at(-1)?.content; // Last message
            if (completedMessage) {
              addAssistantMessage(completedMessage);
            }
            break;
          case "streamError":
            console.error("Stream error:", message.error);
            alert(message.error || "Unknown error.");
            break;
          default:
            console.warn("Unknown action:", message.action);
        }
      } catch (error) {
        console.error("Error handling message:", error);
      }
    });
  }

  // Send message to background
  sendMessage(action, payload) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action, payload }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (!response || !response.success) {
          reject(new Error(response.error || "Unknown error."));
        } else {
          resolve(response.data);
        }
      });
    });
  }

  // Send request without context
  async sendRequest(text, promptType, promptLanguage) {
    this.currentRequestId = Date.now() + Math.random();
    const payload = {
      text,
      promptType,
      promptLanguage,
      requestId: this.currentRequestId,
    };

    try {
      await this.sendMessage("sendToOpenAI", payload);
      console.log("Request sent successfully");
    } catch (error) {
      console.error("Error sending request:", error);
      alert(error.message || "Unknown error.");
    }
  }

  // Send request with context
  async sendRequestWithContext(text) {
    this.currentRequestId = Date.now() + Math.random();
    const context = getContext();
    const payload = {
      text,
      previousContext: context,
      requestId: this.currentRequestId,
    };

    try {
      await this.sendMessage("sendToOpenAI", payload);
      console.log("Request sent successfully");
    } catch (error) {
      console.error("Error sending request:", error);
      alert(error.message || "Unknown error.");
    }
  }

  // Cancel current request
  cancelCurrentRequest() {
    if (this.currentRequestId) {
      const payload = { requestId: this.currentRequestId };
      this.sendMessage("cancelRequest", payload)
        .then(() => {
          console.log("Request cancelled successfully");
        })
        .catch((error) => {
          console.error("Error cancelling request:", error);
        });
    }
  }

  openOptionsPage() {
    chrome.runtime.sendMessage({ action: "showOptions" });
  }
}

export default new ContentMessageHandler();
