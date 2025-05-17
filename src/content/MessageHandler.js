import {
  appendResultText,
  addAssistantMessage,
  getContext,
} from "../common/chatUtils";
import { showResultWindow } from "../common/ui";

class ContentMessageHandler {
  constructor() {
    this.currentRequestId = null;
    this.userInitiatedCancel = false;
    this.initListener();
  }

  initListener() {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.requestId && message.requestId !== this.currentRequestId) {
        return;
      }
      try {
        console.log("Message received:", message);
        switch (message.action) {
          case "streamData":
            appendResultText(message.content);
            break;
          case "streamComplete":
            appendResultText("", true);
            break;
          case "streamError":
            console.error("Stream error:", message.error);
            if (!(message.error === "Request was canceled." && this.userInitiatedCancel)) {
              alert(message.error || "Unknown error.");
            }
            this.userInitiatedCancel = false;
            break;
          case "openLMenu":
            window.selectedText = message.text || "";
            window.selectedPromptFromMenu = message.chosenPrompt || "";
            showResultWindow();
            break;
          default:
            console.warn("Unknown action:", message.action);
        }
      } catch (error) {
        console.error("Error handling message:", error);
      }
    });
  }

  setUserInitiatedCancel(flag) {
    this.userInitiatedCancel = flag;
  }

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
