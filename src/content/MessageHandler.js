// src/content/MessageHandler.js

import { appendResultText, setNeedNewMessage } from "../common/chatUtils";

class ContentMessageHandler {
  constructor() {
    this.currentRequestId = null;
    this.currentTabId = null;
    this.markdownBuffer = "";
    this.initListener();
  }

  // Инициализация слушателя сообщений от background
  initListener() {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.requestId !== this.currentRequestId) return;

      try {
        console.log("Message received:", message);
        switch (message.action) {
          case "streamData":
            appendResultText(message.content);
            break;
          case "streamComplete":
            setNeedNewMessage();
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

  // Отправка сообщения в background
  sendMessage(action, payload) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action, payload }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (!response.success) {
          reject(new Error(response.error || "Unknown error."));
        } else {
          resolve(response.data);
        }
      });
    });
  }

  // Отправка запроса без контекста
async sendRequest(text, promptType = null, promptLanguage = null) {
  this.clearContext();
  this.currentRequestId = Date.now() + Math.random();
  this.currentTabId = await this.getCurrentTabId();

  const payload = {
    text,
    promptType,
    promptLanguage,
    tabId: this.currentTabId,
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

  // Отправка запроса с контекстом
  async sendRequestWithContext(text) {
    this.clearContext();
    this.currentRequestId = Date.now() + Math.random();
    this.currentTabId = await this.getCurrentTabId();

    const previousContext = getContext();

    const payload = {
      text,
      tabId: this.currentTabId,
      requestId: this.currentRequestId,
      previousContext,
    };

    try {
      await this.sendMessage("sendToOpenAI", payload);
      console.log("Request sent successfully");
    } catch (error) {
      console.error("Error sending request:", error);
      alert(error.message || "Unknown error.");
    }
  }

  // Отмена текущего запроса
  cancelCurrentRequest() {
    if (this.currentRequestId) {
      const payload = { requestId: this.currentRequestId };
      this.sendMessage("cancelRequest", payload)
        .then(() => {
          this.clearContext();
          console.log("Request cancelled successfully");
        })
        .catch((error) => {
          console.error("Error cancelling request:", error);
        });
    }
  }

  // Получение текущего ID вкладки
  async getCurrentTabId() {
    try {
      const data = await this.sendMessage("getTabId", {});
      return data;
    } catch (error) {
      console.error("Failed to get tabId:", error);
      return null;
    }
  }

  // Очистка контекста
  clearContext() {
    // const resultText = shadowRoot.getElementById("resultText");
    // if (resultText) {
    //   resultText.innerHTML = "";
    // }

    this.markdownBuffer = "";
    this.currentRequestId = null;
  }
}

export default new ContentMessageHandler();