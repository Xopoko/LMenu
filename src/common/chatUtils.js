// src/common/chatUtils.js
import { marked } from "marked";
import { shadowRoot } from "./ui";

let wholeContext = ""; // Весь текст, который был выведен в окне чата
let tempBuffer = ""; // Временный буфер для накопления текста
let isMessagePrinted = false;
var chatMessages = null;
var currentGptMessageElement = null;

export function appendResultText(text) {
	if (isMessagePrinted == false) {
		createNewMessage();
	}
	wholeContext += text;

	isMessagePrinted = true;
	tempBuffer += text;

	currentGptMessageElement.innerHTML = marked(tempBuffer); // Вывод накопленного текста
	chatMessages.scrollTop = chatMessages.scrollHeight; // Прокрутка вниз
}

function createNewMessage() {
	chatMessages = shadowRoot.getElementById("chatMessages");
	currentGptMessageElement = document.createElement("div");
	currentGptMessageElement.className = "gptResponse";
	chatMessages.appendChild(currentGptMessageElement);
}

export function setNeedNewMessage() {
	tempBuffer = "";
	isMessagePrinted = false;
	chatMessages = null;
	currentGptMessageElement = null;
}

export function getContext() {
	return wholeContext;
}

export function	addContext(text, isUserMessage) {
	if (isUserMessage == true) {
		wholeContext += "\nUser: " + text;
	} else {
		wholeContext += "\nAI: " + text;
	}
}