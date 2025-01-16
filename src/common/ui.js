import {
  loadResultWindowResources,
  makeWindowDraggable,
  populateSelector,
} from "./utils";
import ContentMessageHandler from "../content/messageHandler";
import {
  addUserMessage,
  setShadowRoot,
  resetContext,
} from "./chatUtils";

export let shadowRoot = null;
export let initialSelectedText = "";
export let promptType = "";
export let promptLanguage = "";

export async function initUI() {
  // "showFloatingButton" disabled by default
  chrome.storage.sync.get({ showFloatingButton: false }, (result) => {
    if (result.showFloatingButton) {
      createImproveIcon();
    }
  });
}

function createImproveIcon() {
  const improveIcon = document.createElement("div");
  improveIcon.id = "improveIcon";
  improveIcon.innerHTML = '<i class="fas fa-magic"></i>';
  improveIcon.style.display = "none";
  document.body.appendChild(improveIcon);

  improveIcon.addEventListener("click", () => {
    if (window.selectedText && window.selectedText.length > 0) {
      initialSelectedText = window.selectedText;
      showResultWindow();
    }
    improveIcon.style.display = "none";
  });
}

export async function showResultWindow() {
  const { htmlContent, cssContent } = await loadResultWindowResources();
  const container = document.createElement("div");
  container.id = "extensionContainer";
  Object.assign(container.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    zIndex: "9999",
  });
  document.body.appendChild(container);

  shadowRoot = container.attachShadow({ mode: "open" });
  setShadowRoot(shadowRoot);

  shadowRoot.innerHTML = htmlContent;
  const styleElement = document.createElement("style");
  styleElement.textContent = cssContent;
  shadowRoot.appendChild(styleElement);

  initializeResultWindow();
}

function initializeResultWindow() {
  const resultWindow = shadowRoot.getElementById("resultWindow");
  const promptSelector = shadowRoot.getElementById("promptSelector");
  const promptLanguageSelector = shadowRoot.getElementById("promptLanguageSelector");
  const copyButton = shadowRoot.getElementById("copyButton");
  const resendButton = shadowRoot.getElementById("resendButton");
  const closeButton = shadowRoot.getElementById("closeButton");
  const sendButton = shadowRoot.getElementById("sendButton");
  const chatInput = shadowRoot.getElementById("chatInput");
  const settingsButton = shadowRoot.getElementById("settingsButton");

  sendButton.addEventListener("click", () => {
    const userMessage = chatInput.value.trim();
    if (userMessage) {
      addUserMessage(userMessage);
      ContentMessageHandler.sendRequestWithContext(userMessage);
      chatInput.value = "";
    }
  });

  closeButton.addEventListener("click", () => {
    const extensionContainer = document.getElementById("extensionContainer");
    if (extensionContainer) {
      extensionContainer.remove();
    }
    ContentMessageHandler.cancelCurrentRequest();
  });

  settingsButton.addEventListener("click", () => {
    ContentMessageHandler.openOptionsPage();
  });

  copyButton.addEventListener("click", async () => {
    try {
      const chatMessages = shadowRoot.getElementById("chatMessages");
      const messages = chatMessages.querySelectorAll(".gptResponse");
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        await navigator.clipboard.writeText(lastMessage.innerText);
      }
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  });

  resendButton.addEventListener("click", () => {
    try {
      ContentMessageHandler.cancelCurrentRequest();
      resetContext();
      ContentMessageHandler.sendRequest(
        initialSelectedText,
        promptType,
        promptLanguage
      );
    } catch (error) {
      console.error("Error in resendButton click handler:", error);
    }
  });

  promptSelector.addEventListener("change", () => {
    promptType = promptSelector.value;
    chrome.storage.sync.set({ lastSelectedPrompt: promptType });
    resetContext();
    ContentMessageHandler.cancelCurrentRequest();
    ContentMessageHandler.sendRequest(
      initialSelectedText,
      promptType,
      promptLanguage
    );
  });

  promptLanguageSelector.addEventListener("change", () => {
    promptLanguage = promptLanguageSelector.value;
    chrome.storage.sync.set({ lastSelectedLanguage: promptLanguage });
    resetContext();
    ContentMessageHandler.cancelCurrentRequest();
    ContentMessageHandler.sendRequest(
      initialSelectedText,
      promptType,
      promptLanguage
    );
  });

  makeWindowDraggable(resultWindow);

  initializeSelectors(promptSelector, promptLanguageSelector).then(() => {
    if (window.selectedPromptFromMenu) {
      promptType = window.selectedPromptFromMenu;
      promptSelector.value = window.selectedPromptFromMenu;
      chrome.storage.sync.set({ lastSelectedPrompt: window.selectedPromptFromMenu });
    }

    initialSelectedText = window.selectedText || "";
    resetContext();
    ContentMessageHandler.sendRequest(
      initialSelectedText,
      promptType,
      promptLanguage
    );
  });
}

async function initializeSelectors(promptSelector, promptLanguageSelector) {
  try {
    const [storedData, storedValues] = await Promise.all([
      new Promise((resolve) => {
        chrome.storage.sync.get(['prompts', 'languages'], (result) => {
          resolve(result);
        });
      }),
      new Promise((resolve) => {
        chrome.storage.sync.get(
          ['lastSelectedPrompt', 'lastSelectedLanguage'],
          (result) => {
            resolve(result);
          }
        );
      }),
    ]);

    const prompts = storedData.prompts || [];
    const languages = storedData.languages || [];

    if (prompts.length === 0 || languages.length === 0) {
      console.error('No prompts or languages found in storage.');
      return;
    }

    populateSelector(
      promptSelector,
      prompts.map((p) => p.name),
      storedValues.lastSelectedPrompt
    );
    promptType = promptSelector.value;

    populateSelector(
      promptLanguageSelector,
      languages,
      storedValues.lastSelectedLanguage
    );
    promptLanguage = promptLanguageSelector.value;
  } catch (error) {
    console.error('Error initializing selectors:', error);
  }
}
