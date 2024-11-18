// src/common/chatUtils.js

import { marked } from "marked";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import "highlight.js/styles/github.css";

hljs.registerLanguage("javascript", javascript);

marked.setOptions({
  highlight: function (code, lang) {
    const language = hljs.getLanguage(lang) ? lang : "plaintext";
    return hljs.highlight(code, { language }).value;
  },
});

export let chatContext = [];
let shadowRoot = null;
let assistantMessageBuffer = ""; // Буфер для накопления сообщения ассистента

/**
 * Устанавливает shadow root для манипуляции DOM.
 * @param {ShadowRoot} root - Shadow root.
 */
export function setShadowRoot(root) {
  shadowRoot = root;
}

/**
 * Добавляет полученный текст в окно чата.
 * @param {string} text - Текст для добавления.
 * @param {boolean} isComplete - Указывает, завершено ли сообщение.
 */
export function appendResultText(text, isComplete = false) {
  assistantMessageBuffer += text; // Накопление текста

  const chatMessages = shadowRoot.getElementById("chatMessages");
  let lastMessage = chatMessages.lastElementChild;

  if (!lastMessage || !lastMessage.classList.contains("gptResponse")) {
    lastMessage = document.createElement("div");
    lastMessage.className = "gptResponse";
    chatMessages.appendChild(lastMessage);
  }

  // Парсинг и обновление содержимого сообщения
  lastMessage.innerHTML = marked.parse(assistantMessageBuffer);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Когда сообщение завершено, добавляем его в контекст и сбрасываем буфер
  if (isComplete) {
    addAssistantMessage(assistantMessageBuffer);
    assistantMessageBuffer = ""; // Сбрасываем буфер здесь
  }
}

/**
 * Добавляет сообщение пользователя в чат.
 * @param {string} text - Сообщение пользователя.
 */
export function addUserMessage(text) {
  const chatMessages = shadowRoot.getElementById("chatMessages");
  const messageElement = document.createElement("div");
  messageElement.className = "userMessage";
  messageElement.innerText = text;
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  chatContext.push({ role: "user", content: text });
}

/**
 * Добавляет сообщение ассистента в контекст чата.
 * @param {string} text - Сообщение ассистента.
 */
export function addAssistantMessage(text) {
  chatContext.push({ role: "assistant", content: text });
}

/**
 * Сбрасывает контекст чата.
 */
export function resetContext() {
  chatContext = [];
  const chatMessages = shadowRoot.getElementById("chatMessages");
  chatMessages.innerHTML = "";
  assistantMessageBuffer = ""; // Сбрасываем буфер
}

/**
 * Получает контекст чата.
 * @returns {Array} - Массив контекста чата.
 */
export function getContext() {
  return chatContext;
}
