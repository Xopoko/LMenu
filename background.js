// background.js

let ongoingRequests = {};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getTabId') {
        sendResponse({ tabId: sender.tab.id });
    } else if (request.action === 'sendToOpenAI') {
        const { text, promptType, tabId, requestId } = request;

        // Загружаем JSON с промптами
        fetch(chrome.runtime.getURL('prompts.json'))
            .then(response => response.json())
            .then(data => {
                const selectedPrompt = data.prompts.find(prompt => prompt.name === promptType);
                if (!selectedPrompt) {
                    sendResponse({ success: false, error: 'Промпт не найден.' });
                    return;
                }

                const systemContent = selectedPrompt.systemContent;

                chrome.storage.sync.get(['openaiApiKey'], function(result) {
                    const apiKey = result.openaiApiKey;
                    if (!apiKey) {
                        sendResponse({ success: false, error: 'API ключ не установлен. Пожалуйста, установите его в настройках расширения.' });
                        return;
                    }

                    // Создаем AbortController для отмены запроса при необходимости
                    const abortController = new AbortController();
                    ongoingRequests[requestId] = {
                        controller: abortController,
                        tabId: tabId
                    };

                    fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + apiKey
                        },
                        body: JSON.stringify({
                            model: 'gpt-4',
                            stream: true,
                            messages: [
                                { role: 'system', content: systemContent },
                                { role: 'user', content: text }
                            ]
                        }),
                        signal: abortController.signal
                    })
                    .then(response => {
                        if (!response.ok) {
                            console.error('Сервер вернул ошибку:', response.status, response.statusText);
                            sendResponse({ success: false, error: `Ошибка сервера: ${response.status} ${response.statusText}` });
                            return;
                        }

                        const reader = response.body.getReader();
                        const decoder = new TextDecoder('utf-8');
                        let buffer = '';

                        function read() {
                            reader.read().then(({ done, value }) => {
                                if (done) {
                                    chrome.tabs.sendMessage(tabId, { action: 'streamComplete', requestId });
                                    return;
                                }
                                buffer += decoder.decode(value, { stream: true });

                                let parts = buffer.split('\n\n');
                                buffer = parts.pop(); // Сохраняем неполную часть для следующего чтения

                                for (let part of parts) {
                                    if (part.startsWith('data: ')) {
                                        let data = part.slice(6);
                                        if (data === '[DONE]') {
                                            chrome.tabs.sendMessage(tabId, { action: 'streamComplete', requestId });
                                            return;
                                        } else {
                                            try {
                                                let parsedData = JSON.parse(data);
                                                let content = parsedData.choices[0].delta.content;
                                                if (content) {
                                                    chrome.tabs.sendMessage(tabId, { action: 'streamData', content: content, requestId });
                                                }
                                            } catch (e) {
                                                console.error('Ошибка при парсинге данных:', e);
                                            }
                                        }
                                    }
                                }

                                read();
                            }).catch(error => {
                                if (abortController.signal.aborted) {
                                    console.log('Запрос был отменен:', requestId);
                                    chrome.tabs.sendMessage(tabId, { action: 'streamError', error: 'Запрос был отменен.', requestId });
                                } else {
                                    console.error('Ошибка при чтении данных:', error);
                                    chrome.tabs.sendMessage(tabId, { action: 'streamError', error: 'Ошибка при чтении данных.', requestId });
                                }
                            });
                        }
                        read();
                        sendResponse({ success: true });
                    })
                    .catch(error => {
                        if (abortController.signal.aborted) {
                            console.log('Запрос был отменен:', requestId);
                            chrome.tabs.sendMessage(tabId, { action: 'streamError', error: 'Запрос был отменен.', requestId });
                        } else {
                            console.error('Ошибка при подключении к OpenAI API:', error);
                            sendResponse({ success: false, error: 'Ошибка при подключении к OpenAI API.' });
                        }
                    });
                });

                return true; // Указывает, что ответ будет отправлен асинхронно
            })
            .catch(error => {
                console.error('Ошибка при загрузке JSON с промптами:', error);
                sendResponse({ success: false, error: 'Ошибка при загрузке JSON с промптами.' });
            });
    } else if (request.action === 'cancelRequest') {
        const { requestId } = request;
        if (ongoingRequests[requestId]) {
            ongoingRequests[requestId].controller.abort();
            delete ongoingRequests[requestId];
            console.log('Запрос отменен:', requestId);
        }
    }
});
