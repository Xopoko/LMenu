// src/background/messageHandler.js

import { sendToOpenAI, cancelCurrentRequest } from "./openaiApi"; // Импорт зависимостей

/**
 * Класс для обработки сообщений в background-скрипте
 */
class BackgroundMessageHandler {
  constructor() {
    // Словарь для отслеживания текущих запросов
    this.ongoingRequests = {};

    // Инициализация слушателя сообщений
    this.initListener();
  }

  /**
   * Инициализация слушателя для входящих сообщений
   */
  initListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log("Message received:", request);
      if (request.action && typeof this[request.action] === "function") {
        try {
          const result = this[request.action](request.payload, sender);

          // Обработка асинхронных методов
          if (result instanceof Promise) {
            result
              .then((data) => sendResponse({ success: true, data }))
              .catch((error) => {
                console.error("Async handler error:", error);
                sendResponse({ success: false, error: error.message });
              });
          } else {
            sendResponse({ success: true, data: result });
          }
        } catch (error) {
          console.error("Error handling message:", error);
          sendResponse({ success: false, error: error.message });
        }
      } else {
        console.warn("Unknown action:", request.action);
        sendResponse({ success: false, error: "Unknown action" });
      }

      return true; // Указываем, что ответ будет асинхронным
    });
  }

  /**
   * Получить ID текущей вкладки
   * @param {Object} payload - Данные запроса
   * @param {Object} sender - Информация об отправителе
   * @returns {number|null} - ID вкладки
   */
  getTabId(payload, sender) {
    return sender.tab ? sender.tab.id : null;
  }

  /**
   * Отправить запрос к OpenAI
   * @param {Object} payload - Данные для OpenAI
   * @returns {Promise<Object>} - Ответ OpenAI
   */
  async sendToOpenAI(payload) {
    console.log("Sending data to OpenAI:", payload);
    // Используем импортированную функцию sendToOpenAI
    return await sendToOpenAI(payload, this.ongoingRequests);
  }

  /**
   * Отменить текущий запрос
   * @param {Object} payload - Данные запроса
   * @returns {string} - Статус отмены
   */
  cancelRequest(payload) {
    cancelCurrentRequest(payload, this.ongoingRequests);
    return "Request cancelled successfully";
  }

  /**
   * Логировать сообщение
   * @param {Object} payload - Данные сообщения
   * @returns {string} - Подтверждение логирования
   */
  logMessage(payload) {
    console.log("Log message from content script:", payload);
    return "Message logged successfully";
  }
}

// Экспортируем экземпляр класса
export default new BackgroundMessageHandler();