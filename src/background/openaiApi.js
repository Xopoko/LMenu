// src/background/openaiApi.js

/**
 * Sends a request to OpenAI and handles the streaming response.
 * @param {Object} payload - Data from content script.
 * @param {Object} ongoingRequests - Object to track ongoing requests.
 * @returns {Promise<void>}
 */
export async function sendToOpenAI(payload, ongoingRequests) {
  const {
    text,
    promptType,
    promptLanguage,
    previousContext = "",
    tabId,
    requestId,
  } = payload;

  if (!tabId || typeof tabId !== 'number') {
    throw new Error("Invalid tab ID.");
  }

  // Get API keys and prompts from chrome.storage
  const [apiKeysResult, promptsResult] = await Promise.all([
    new Promise((resolve) => {
      chrome.storage.sync.get(['apiKeys'], (result) => {
        resolve(result);
      });
    }),
    new Promise((resolve) => {
      chrome.storage.sync.get(['prompts'], (result) => {
        resolve(result);
      });
    }),
  ]);

  const apiKeys = apiKeysResult.apiKeys || [];
  const prompts = promptsResult.prompts || [];

  // Determine which API key to use
  let selectedApiKeyEntry = null;

  if (promptType) {
    const selectedPrompt = prompts.find((prompt) => prompt.name === promptType);
    if (!selectedPrompt) {
      throw new Error('Prompt not found.');
    }

    const apiKeyName = selectedPrompt.apiKeyName;
    selectedApiKeyEntry = apiKeys.find((key) => key.name === apiKeyName);
  }

  if (!selectedApiKeyEntry && apiKeys.length > 0) {
    // If no API key specified for prompt, use the first one
    selectedApiKeyEntry = apiKeys[0];
  }

  if (!selectedApiKeyEntry) {
    throw new Error('No API key available. Please add an API key in the extension settings.');
  }

  const selectedApiKey = selectedApiKeyEntry.key;
  const selectedModel = selectedApiKeyEntry.model || 'gpt-3.5-turbo';

  // Create AbortController for request cancellation
  const abortController = new AbortController();
  ongoingRequests[requestId] = { controller: abortController, tabId };

  // Build messages for OpenAI
  const messages = [];

  // Add system message based on selected prompt
  if (promptType) {
    const selectedPrompt = prompts.find(
      (prompt) => prompt.name === promptType
    );

    if (!selectedPrompt) {
      throw new Error('Prompt not found.');
    }

    // Process systemContent, replacing {language} placeholder
    let processedSystemContent = selectedPrompt.systemContent;
    if (promptLanguage) {
      processedSystemContent = processedSystemContent.replace(
        /\{language\}/g,
        promptLanguage
      );
    }

    messages.push({ role: 'system', content: processedSystemContent });
  }

  // Add previous conversation context
  if (previousContext) {
    messages.push(...previousContext);
  }

  // Add user message
  messages.push({ role: "user", content: text });

  // Send request to OpenAI API
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${selectedApiKey}`,
    },
    body: JSON.stringify({
      model: selectedModel,
      stream: true,
      messages,
    }),
    signal: abortController.signal,
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.status} ${response.statusText}`);
  }

  // Read and process the streaming response
  readStream(response.body.getReader(), tabId, requestId, ongoingRequests);
}

/**
 * Reads the streaming response from OpenAI.
 * @param {ReadableStreamDefaultReader} reader - Stream reader.
 * @param {number} tabId - Tab ID to send messages.
 * @param {string} requestId - Request ID for tracking.
 * @param {Object} ongoingRequests - Ongoing requests object.
 */
function readStream(reader, tabId, requestId, ongoingRequests) {
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  function processChunk({ done, value }) {
    if (done) {
      chrome.tabs.sendMessage(tabId, { action: "streamComplete", requestId });
      console.log("Stream complete:", requestId);
      delete ongoingRequests[requestId];
      return;
    }

    buffer += decoder.decode(value, { stream: true });
    let parts = buffer.split("\n\n");
    buffer = parts.pop();

    for (const part of parts) {
      if (part.startsWith("data: ")) {
        const data = part.slice(6);
        if (data === "[DONE]") {
          chrome.tabs.sendMessage(tabId, { action: "streamComplete", requestId });
          console.log("Stream complete:", requestId);
          delete ongoingRequests[requestId];
          return;
        } else {
          try {
            const parsedData = JSON.parse(data);
            const content = parsedData.choices[0].delta.content;
            if (content) {
              chrome.tabs.sendMessage(tabId, {
                action: "streamData",
                content,
                requestId,
              });
            }
          } catch (e) {
            console.error("Error parsing data:", e);
          }
        }
      }
    }

    return reader.read().then(processChunk).catch((error) => {
      handleError(error, tabId, requestId, ongoingRequests);
    });
  }

  reader.read().then(processChunk).catch((error) => {
    handleError(error, tabId, requestId, ongoingRequests);
  });
}

/**
 * Handles errors during stream reading.
 * @param {Error} error - Error object.
 * @param {number} tabId - Tab ID.
 * @param {string} requestId - Request ID.
 * @param {Object} ongoingRequests - Ongoing requests object.
 */
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

/**
 * Cancels the current request.
 * @param {Object} payload - Request data.
 * @param {Object} ongoingRequests - Ongoing requests object.
 */
export async function cancelCurrentRequest(payload, ongoingRequests) {
  const { requestId } = payload;
  if (ongoingRequests[requestId]) {
    ongoingRequests[requestId].controller.abort();
    delete ongoingRequests[requestId];
    console.log("Request canceled:", requestId);
  } else {
    console.warn("Request not found for cancellation:", requestId);
  }
}
