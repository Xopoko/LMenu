// src/common/ui.js

import { sendRequest, cancelCurrentRequest } from "./api";
import {
	loadResultWindowResources,
	loadCompletionWindowResources,
	makeWindowDraggable,
	populateSelector,
} from "./utils";

export let shadowRoot = null;
export let initialSelectedText = "";
export let promptType = "";
export let promptLanguage = "";

export async function initUI() {
	createImproveIcon();

	document.addEventListener("input", (e) => {
		if (["input", "textarea"].includes(e.target.tagName.toLowerCase())) {
			const inputElement = e.target;
			const text = inputElement.value;
			// currentInputElement = inputElement;

			// Запрос на автодополнение
			// if (text.length > 0) {
			// showCompletionWindow();
			// debouncedRequestCompletion(text, inputElement);
			// } else {
			// removeOverlay();
			// }
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
		if (window.selectedText.length > 0) {
			initialSelectedText = window.selectedText;
			showResultWindow();
		}
		improveIcon.style.display = "none";
	});
}

async function showCompletionWindow() {
	const { htmlContent, cssContent } = await loadCompletionWindowResources();

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

	// initializeCompletionWindow();
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
	const resultWindow = shadowRoot.getElementById("resultWindow");
	const promptSelector = shadowRoot.getElementById("promptSelector");
	const promptLanguageSelector = shadowRoot.getElementById(
		"promptLanguageSelector"
	);
	const resultText = shadowRoot.getElementById("resultText");
	const copyButton = shadowRoot.getElementById("copyButton");
	const resendButton = shadowRoot.getElementById("resendButton");
	const closeButton = shadowRoot.getElementById("closeButton");

	closeButton.addEventListener("click", () => {
		const extensionContainer = document.getElementById("extensionContainer");
		if (extensionContainer) {
			extensionContainer.remove();
		}
		cancelCurrentRequest();
	});

	copyButton.addEventListener("click", async () => {
		try {
			await navigator.clipboard.writeText(resultText.innerText);
			copyButton.innerText = "Copied!";
			setTimeout(() => {
				copyButton.innerText = "Copy";
			}, 2000);
		} catch (err) {
			console.error("Failed to copy text:", err);
		}
	});

	resendButton.addEventListener("click", () => {
		try {
			cancelCurrentRequest();
			console.log("Resending request...");
			sendRequest(initialSelectedText);
		} catch (error) {
			console.error("Error in resendButton click handler:", error);
		}
	});

	promptSelector.addEventListener("change", () => {
		promptType = promptSelector.value;
		chrome.storage.sync.set({ lastSelectedPrompt: promptType });
		resultText.innerText = "";
		cancelCurrentRequest();
		sendRequest(initialSelectedText);
	});

	promptLanguageSelector.addEventListener("change", () => {
		promptLanguage = promptLanguageSelector.value;
		chrome.storage.sync.set({ lastSelectedLanguage: promptLanguage });
		resultText.innerText = "";
		cancelCurrentRequest();
		sendRequest(initialSelectedText);
	});

	makeWindowDraggable(resultWindow);

	initializeSelectors(promptSelector, promptLanguageSelector).then(() => {
		sendRequest(initialSelectedText);
	});
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
