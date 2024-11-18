// src/common/ui.js

import ContentMessageHandler from "../content/MessageHandler";
import {
	loadResultWindowResources,
	makeWindowDraggable,
	populateSelector,
} from "./utils";
import { addContext } from "./chatUtils";

export let shadowRoot = null;
export let initialSelectedText = "";
export let promptType = "";
export let promptLanguage = "";

export async function initUI() {
	createImproveIcon();
}

function createImproveIcon() {
	const improveIcon = document.createElement("div");
	improveIcon.id = "improveIcon";
	improveIcon.innerHTML = '<i class="fas fa-magic"></i>';
	improveIcon.style.display = "none";
	document.body.appendChild(improveIcon);

	improveIcon.addEventListener("click", () => {
		if (window.selectedText.length > 0) {
			initialSelectedText = window.selectedText;
			showResultWindow();
		}
		improveIcon.style.display = "none";
	});
}

async function showResultWindow() {
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
	shadowRoot.innerHTML = htmlContent;

	const styleElement = document.createElement("style");
	styleElement.textContent = cssContent;
	shadowRoot.appendChild(styleElement);

	initializeResultWindow();
}

function initializeResultWindow() {
	console.log("Initializing result window...");
	const resultWindow = shadowRoot.getElementById("resultWindow");
	const promptSelector = shadowRoot.getElementById("promptSelector");
	const promptLanguageSelector = shadowRoot.getElementById(
		"promptLanguageSelector"
	);
	const resultText = shadowRoot.getElementById("resultText");
	const copyButton = shadowRoot.getElementById("copyButton");
	const resendButton = shadowRoot.getElementById("resendButton");
	const closeButton = shadowRoot.getElementById("closeButton");
	const sendButton = shadowRoot.getElementById("sendButton");
	const chatInput = shadowRoot.getElementById("chatInput");

	sendButton.addEventListener("click", () => {
		const userMessage = chatInput.value.trim();
		if (userMessage) {
			addChatMessage(userMessage, "userMessage"); // Сообщение пользователя
			ContentMessageHandler.sendRequestWithContext(userMessage); // Отправка запроса в OpenAI
			chatInput.value = ""; // Очистка поля ввода
		}
	});

	closeButton.addEventListener("click", () => {
		const extensionContainer = document.getElementById("extensionContainer");
		if (extensionContainer) {
			extensionContainer.remove();
		}
		ContentMessageHandler.cancelCurrentRequest();
	});

	copyButton.addEventListener("click", async () => {
		try {
			await navigator.clipboard.writeText(resultText.innerText);
		} catch (err) {
			console.error("Failed to copy text:", err);
		}
	});

	resendButton.addEventListener("click", () => {
		try {
			ContentMessageHandler.cancelCurrentRequest();
			console.log("Resending request...");
			ContentMessageHandler.sendRequest(initialSelectedText);
		} catch (error) {
			console.error("Error in resendButton click handler:", error);
		}
	});

	promptSelector.addEventListener("change", () => {
		promptType = promptSelector.value;
		chrome.storage.sync.set({ lastSelectedPrompt: promptType });
		resultText.innerText = "";
		ContentMessageHandler.cancelCurrentRequest();
		ContentMessageHandler.sendRequest(initialSelectedText);
	});

	promptLanguageSelector.addEventListener("change", () => {
		promptLanguage = promptLanguageSelector.value;
		chrome.storage.sync.set({ lastSelectedLanguage: promptLanguage });
		resultText.innerText = "";
		ContentMessageHandler.cancelCurrentRequest();
		ContentMessageHandler.sendRequest(initialSelectedText);
	});

	makeWindowDraggable(resultWindow);

	initializeSelectors(promptSelector, promptLanguageSelector).then(() => {
		ContentMessageHandler.sendRequest(initialSelectedText);
	});
}

function addChatMessage(message, className) {
	const chatMessages = shadowRoot.getElementById("chatMessages");
	const messageElement = document.createElement("div");
	messageElement.className = className;
	messageElement.innerText = message;
	chatMessages.appendChild(messageElement);
	chatMessages.scrollTop = chatMessages.scrollHeight; // Прокрутка вниз
	addContext(message, true);
}

async function initializeSelectors(promptSelector, promptLanguageSelector) {
	const [promptsData, storedValues] = await Promise.all([
		fetch(chrome.runtime.getURL("prompts.json")).then((res) => res.json()),
		new Promise((resolve) => {
			chrome.storage.sync.get(
				["lastSelectedPrompt", "lastSelectedLanguage"],
				(result) => {
					resolve(result);
				}
			);
		}),
	]);

	populateSelector(
		promptSelector,
		promptsData.prompts.map((p) => p.name),
		storedValues.lastSelectedPrompt
	);
	promptType = promptSelector.value;

	populateSelector(
		promptLanguageSelector,
		promptsData.languages,
		storedValues.lastSelectedLanguage
	);
	promptLanguage = promptLanguageSelector.value;
}