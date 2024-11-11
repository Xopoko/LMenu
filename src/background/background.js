// src/background/background.js

import { handleMessages } from "./messageHandler";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	handleMessages(request, sender, sendResponse);
	return true;
});
