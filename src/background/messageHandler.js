// src/background/messageHandler.js


import { sendToOpenAI, cancelCurrentRequest } from "./openaiApi";

const ongoingRequests = {};

export async function handleMessages(request, sender, sendResponse) {
	try {
		console.log(request);
		switch (request.action) {
			case "getTabId":
				sendResponse({ tabId: sender.tab.id });
				break;
			case "sendToOpenAI":
				await sendToOpenAI(request, ongoingRequests);
				sendResponse({ success: true });
				break;
			case "cancelRequest":
				cancelCurrentRequest(request, ongoingRequests);
				break;
			default:
				console.warn("Unknown action:", request.action);
		}
	} catch (error) {
		console.error("Error handling message:", error);
		sendResponse({ success: false, error: "Internal error occurred." });
	}
}
