// background.js

// Объект для хранения текущих запросов с возможностью их отмены
let ongoingRequests = {};

// Обработчик сообщений из content scripts или других частей расширения
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Возвращаем идентификатор вкладки по запросу
    if (request.action === 'getTabId') {
        sendResponse({ tabId: sender.tab.id });

    // Обрабатываем запрос на отправку данных в OpenAI API
    } else if (request.action === 'sendToOpenAI') {
        const { text, promptType, promptLanguage, tabId, requestId } = request;

        // Загружаем JSON с промптами
        fetch(chrome.runtime.getURL('prompts.json'))
            .then(response => response.json())
            .then(data => {
                // Ищем выбранный промпт по имени
                const selectedPrompt = data.prompts.find(prompt => prompt.name === promptType);
                if (!selectedPrompt) {
                    // Если промпт не найден, отправляем ошибку
                    sendResponse({ success: false, error: 'Промпт не найден.' });
                    return;
                }

                // Получаем системный контент для промпта и заменяем {language}
                const systemContent = selectedPrompt.systemContent;
                const processedSystemContent = systemContent.replace(/\{language\}/g, promptLanguage);

                // Получаем API ключ OpenAI из хранилища расширения
                chrome.storage.sync.get(['openaiApiKey'], function(result) {
                    const apiKey = result.openaiApiKey;
                    if (!apiKey) {
                        // Если API ключ не установлен, отправляем ошибку
                        sendResponse({ success: false, error: 'API ключ не установлен. Пожалуйста, установите его в настройках расширения.' });
                        return;
                    }

                    // Создаем AbortController для отмены запроса при необходимости
                    const abortController = new AbortController();
                    ongoingRequests[requestId] = {
                        controller: abortController,
                        tabId: tabId
                    };

                    // Отправляем запрос к OpenAI API
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
                                { role: 'system', content: processedSystemContent },
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

                        // Читаем потоковый ответ от OpenAI API
                        const reader = response.body.getReader();
                        const decoder = new TextDecoder('utf-8');
                        let buffer = '';

                        function read() {
                            reader.read().then(({ done, value }) => {
                                if (done) {
                                    // Если чтение завершено, сообщаем об этом content script
                                    chrome.tabs.sendMessage(tabId, { action: 'streamComplete', requestId });
                                    return;
                                }
                                // Декодируем полученные данные и добавляем их в буфер
                                buffer += decoder.decode(value, { stream: true });

                                // Разбиваем буфер на отдельные части по разделителю '\n\n'
                                let parts = buffer.split('\n\n');
                                buffer = parts.pop(); // Сохраняем неполную часть для следующего чтения

                                for (let part of parts) {
                                    if (part.startsWith('data: ')) {
                                        let data = part.slice(6);
                                        if (data === '[DONE]') {
                                            // Если получен сигнал завершения, сообщаем об этом
                                            chrome.tabs.sendMessage(tabId, { action: 'streamComplete', requestId });
                                            return;
                                        } else {
                                            try {
                                                // Парсим данные и отправляем контент в content script
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

                                // Продолжаем чтение оставшихся данных
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
                        // Начинаем чтение данных
                        read();
                        // Сообщаем, что ответ будет отправлен асинхронно
                        sendResponse({ success: true });
                    })
                    .catch(error => {
                        if (abortController.signal.aborted) {
                            // Если запрос был отменен, сообщаем об этом
                            console.log('Запрос был отменен:', requestId);
                            chrome.tabs.sendMessage(tabId, { action: 'streamError', error: 'Запрос был отменен.', requestId });
                        } else {
                            // Обрабатываем ошибки подключения к API
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

    // Обработка отмены текущего запроса
    } else if (request.action === 'cancelRequest') {
        const { requestId } = request;
        if (ongoingRequests[requestId]) {
            // Отменяем запрос и удаляем его из списка текущих запросов
            ongoingRequests[requestId].controller.abort();
            delete ongoingRequests[requestId];
            console.log('Запрос отменен:', requestId);
        }
    }
});
