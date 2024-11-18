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
let assistantMessageBuffer = ""; // Buffer for accumulating assistant's message

/**
 * Sets the shadow root for DOM manipulation.
 * @param {ShadowRoot} root - Shadow root.
 */
export function setShadowRoot(root) {
  shadowRoot = root;
}

/**
 * Adds the received text to the chat window.
 * @param {string} text - Text to add.
 * @param {boolean} isComplete - Indicates whether the message is complete.
 */
export function appendResultText(text, isComplete = false) {
  assistantMessageBuffer += text; // Accumulate text

  const chatMessages = shadowRoot.getElementById("chatMessages");
  let lastMessage = chatMessages.lastElementChild;

  if (!lastMessage || !lastMessage.classList.contains("gptResponse")) {
    lastMessage = document.createElement("div");
    lastMessage.className = "gptResponse";
    chatMessages.appendChild(lastMessage);
  }

  // Parse and update the message content
  lastMessage.innerHTML = marked.parse(assistantMessageBuffer);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // When the message is complete, add it to the context and reset the buffer
  if (isComplete) {
    addAssistantMessage(assistantMessageBuffer);
    assistantMessageBuffer = ""; // Reset the buffer here
  }
}

/**
 * Adds the user's message to the chat.
 * @param {string} text - User's message.
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
 * Adds the assistant's message to the chat context.
 * @param {string} text - Assistant's message.
 */
export function addAssistantMessage(text) {
  chatContext.push({ role: "assistant", content: text });
}

/**
 * Resets the chat context.
 */
export function resetContext() {
  chatContext = [];
  const chatMessages = shadowRoot.getElementById("chatMessages");
  chatMessages.innerHTML = "";
  assistantMessageBuffer = ""; // Reset the buffer
}

/**
 * Gets the chat context.
 * @returns {Array} - Array of chat context.
 */
export function getContext() {
  return chatContext;
}
