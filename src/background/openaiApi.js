// src/background/openaiApi.js

/**
 * Отправляет запрос к OpenAI и обрабатывает потоковый ответ.
 * @param {Object} payload - Данные запроса от content script.
 * @param {Object} ongoingRequests - Объект для отслеживания текущих запросов.
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

  // Получение API ключа из chrome.storage
  const apiKey = await new Promise((resolve) => {
    chrome.storage.sync.get(["openaiApiKey"], (result) => {
      resolve(result.openaiApiKey);
    });
  });

  if (!apiKey) {
    throw new Error("API key not set. Please set it in the extension settings.");
  }

  // Создание AbortController для возможности отмены запроса
  const abortController = new AbortController();
  ongoingRequests[requestId] = { controller: abortController, tabId };

  // Формирование сообщений для отправки в OpenAI
  const messages = [];

  // Добавление системного сообщения на основе выбранного типа подсказки
  if (promptType) {
    const promptsData = await fetch(chrome.runtime.getURL("prompts.json")).then(
      (res) => res.json()
    );
    const selectedPrompt = promptsData.prompts.find(
      (prompt) => prompt.name === promptType
    );

    if (!selectedPrompt) {
      throw new Error("Prompt not found.");
    }

    // Обработка системного контента с заменой языка, если указан
    let processedSystemContent = selectedPrompt.systemContent;
    if (promptLanguage) {
      processedSystemContent = processedSystemContent.replace(
        /\{language\}/g,
        promptLanguage
      );
    }

    messages.push({ role: "system", content: processedSystemContent });
  } else {
    // Добавление предыдущего контекста, если подсказка не указана
    messages.push({
      role: "system",
      content: `Here is the context of our conversation: ${previousContext}`,
    });
  }

  // Добавление сообщения пользователя
  messages.push({ role: "user", content: text });

  // Отправка запроса к OpenAI API
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      stream: true,
      messages,
    }),
    signal: abortController.signal,
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.status} ${response.statusText}`);
  }

  // Чтение и обработка потокового ответа
  readStream(response.body.getReader(), tabId, requestId, ongoingRequests);
}

/**
 * Функция для чтения потокового ответа от OpenAI
 * @param {ReadableStreamDefaultReader} reader - Объект для чтения потока
 * @param {number} tabId - ID вкладки для отправки сообщений
 * @param {string} requestId - ID запроса для отслеживания
 * @param {Object} ongoingRequests - Объект текущих запросов
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
 * Обработка ошибок при чтении потока
 * @param {Error} error - Ошибка
 * @param {number} tabId - ID вкладки
 * @param {string} requestId - ID запроса
 * @param {Object} ongoingRequests - Объект текущих запросов
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
 * Функция для отмены текущего запроса
 * @param {Object} payload - Данные запроса
 * @param {Object} ongoingRequests - Объект текущих запросов
 */
export function cancelCurrentRequest(payload, ongoingRequests) {
  const { requestId } = payload;
  if (ongoingRequests[requestId]) {
    ongoingRequests[requestId].controller.abort();
    delete ongoingRequests[requestId];
    console.log("Request canceled:", requestId);
  } else {
    console.warn("Request not found for cancellation:", requestId);
  }
}
