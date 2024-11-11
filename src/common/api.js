// src/common/api.js

import { appendResultText } from "./utils";
import { promptType, promptLanguage, shadowRoot } from "./ui"; // Import shadowRoot

let currentRequestId = null;
let currentTabId = null;
export let markdownBuffer = "";

export async function sendRequest(text) {
	clearContext();
	currentRequestId = Date.now() + Math.random();

	currentTabId = await getCurrentTabId();

	chrome.runtime.sendMessage(
		{
			action: "sendToOpenAI",
			text,
			promptType,
			promptLanguage,
			tabId: currentTabId,
			requestId: currentRequestId,
		},
		(response) => {
			if (response && response.success) {
				console.log("Request sent successfully");
			} else {
				console.error(
					"Error sending request:",
					response.error || "Unknown error"
				);
				alert(response.error || "Unknown error.");
			}
		}
	);
}

export function cancelCurrentRequest() {
	if (currentRequestId) {
		chrome.runtime.sendMessage({
			action: "cancelRequest",
			requestId: currentRequestId,
		});
		clearContext();
	}
}

export function addMessageListener() {
	chrome.runtime.onMessage.addListener((request) => {
		if (request.requestId !== currentRequestId) return;
		if (request.action === "streamData") {
			appendResultText(request.content);
		}
	});
}

async function getCurrentTabId() {
	return new Promise((resolve) => {
		chrome.runtime.sendMessage({ action: "getTabId" }, (response) => {
			if (response && response.tabId !== undefined) {
				resolve(response.tabId);
			} else {
				console.error("Failed to get tabId.");
				resolve(null);
			}
		});
	});
}

function clearContext() {
	const resultText = shadowRoot.getElementById("resultText");
	if (resultText) {
		resultText.innerHTML = "";
	}

	markdownBuffer = "";
	currentRequestId = null;
}
