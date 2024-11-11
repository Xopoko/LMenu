// src/background/openaiApi.js

export async function sendToOpenAI(request, ongoingRequests) {
	const { text, promptType, promptLanguage, tabId, requestId } = request;

	const promptsData = await fetch(chrome.runtime.getURL("prompts.json")).then(
		(res) => res.json()
	);
	const selectedPrompt = promptsData.prompts.find(
		(prompt) => prompt.name === promptType
	);

	if (!selectedPrompt) {
		throw new Error("Prompt not found.");
	}

	const processedSystemContent = selectedPrompt.systemContent.replace(
		/\{language\}/g,
		promptLanguage
	);

	const apiKey = await new Promise((resolve) => {
		chrome.storage.sync.get(["openaiApiKey"], (result) => {
			resolve(result.openaiApiKey);
		});
	});

	if (!apiKey) {
		throw new Error(
			"API key not set. Please set it in the extension settings."
		);
	}

	const abortController = new AbortController();
	ongoingRequests[requestId] = { controller: abortController, tabId };

	const response = await fetch("https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model: "gpt-4o",
			stream: true,
			messages: [
				{ role: "system", content: processedSystemContent },
				{ role: "user", content: text },
			],
		}),
		signal: abortController.signal,
	});

	if (!response.ok) {
		throw new Error(`Server error: ${response.status} ${response.statusText}`);
	}

	readStream(response.body.getReader(), tabId, requestId, ongoingRequests);
}

function readStream(reader, tabId, requestId, ongoingRequests) {
	const decoder = new TextDecoder("utf-8");
	let buffer = "";

	reader
		.read()
		.then(function process({ done, value }) {
			console.log("Read:", value);
			if (done) {
				chrome.tabs.sendMessage(tabId, { action: "streamComplete", requestId });
				console.log("Stream complete:", requestId);
				delete ongoingRequests[requestId];
				return;
			}

			buffer += decoder.decode(value, { stream: true });
			let parts = buffer.split("\n\n");
			buffer = parts.pop();
			console.log("Parts:", parts);
			for (const part of parts) {
				if (part.startsWith("data: ")) {
					const data = part.slice(6);
					if (data === "[DONE]") {
						chrome.tabs.sendMessage(tabId, {
							action: "streamComplete",
							requestId,
						});
						console.log("Stream complete:", requestId);
						delete ongoingRequests[requestId];
						return;
					} else {
						try {
							const parsedData = JSON.parse(data);
							const content = parsedData.choices[0].delta.content;
							console.log("Data:", content, requestId);
							if (content) {
								chrome.tabs.sendMessage(tabId, {
									action: "streamData",
									content: content,
									requestId,
								});
							}
						} catch (e) {
							console.error("Error parsing data:", e);
						}
					}
				}
			}

			return reader
				.read()
				.then(process)
				.catch((error) => {
					handleError(error, tabId, requestId, ongoingRequests);
				});
		})
		.catch((error) => {
			handleError(error, tabId, requestId, ongoingRequests);
		});
}

function handleError(error, tabId, requestId, ongoingRequests) {
	if (error.name === "AbortError") {
		console.log("Request was canceled:", requestId);
		chrome.tabs.sendMessage(tabId, {
			action: "streamError",
			error: "Request was canceled.",
			requestId,
		});
	} else {
		console.error("Error reading data:", error);
		chrome.tabs.sendMessage(tabId, {
			action: "streamError",
			error: "Error reading data.",
			requestId,
		});
	}
	delete ongoingRequests[requestId];
}

export function cancelCurrentRequest(request, ongoingRequests) {
	const { requestId } = request;
	if (ongoingRequests[requestId]) {
		ongoingRequests[requestId].controller.abort();
		delete ongoingRequests[requestId];
		console.log("Request canceled:", requestId);
	}
}
