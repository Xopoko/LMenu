// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getTabId') {
        sendResponse({ tabId: sender.tab.id });
    } else if (request.action === 'sendToOpenAI') {
        const { text, promptType, tabId } = request;

        chrome.storage.sync.get(['openaiApiKey'], function(result) {
            const apiKey = result.openaiApiKey;
            if (!apiKey) {
                sendResponse({ success: false, error: 'API ключ не установлен. Пожалуйста, установите его в настройках расширения.' });
                return;
            }

            let systemContent = promptType === 'Перевод на русский'
                ? 'You are a translator who converts text from any language into Russian. Whenever the user provides text, respond only with its Russian translation.'
                : 'You are a grammar and spelling corrector. When the user provides text, correct any errors and reply only with the corrected version.';

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
                })
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
                            chrome.tabs.sendMessage(tabId, { action: 'streamComplete' });
                            return;
                        }
                        buffer += decoder.decode(value, { stream: true });

                        let parts = buffer.split('\n\n');
                        buffer = parts.pop(); // Сохраняем неполную часть для следующего чтения

                        for (let part of parts) {
                            if (part.startsWith('data: ')) {
                                let data = part.slice(6);
                                if (data === '[DONE]') {
                                    console.log('Получено [DONE]');
                                    chrome.tabs.sendMessage(tabId, { action: 'streamComplete' });
                                    return;
                                } else {
                                    try {
                                        let parsedData = JSON.parse(data);
                                        let content = parsedData.choices[0].delta.content;
                                        if (content) {
                                            console.log('Отправка данных в content.js:', content);
                                            chrome.tabs.sendMessage(tabId, { action: 'streamData', content: content });
                                        }
                                    } catch (e) {
                                        console.error('Ошибка при парсинге данных:', e);
                                    }
                                }
                            }
                        }

                        read();
                    }).catch(error => {
                        console.error('Ошибка при чтении данных:', error);
                        chrome.tabs.sendMessage(tabId, { action: 'streamError', error: 'Ошибка при чтении данных.' });
                    });
                }
                read();
                sendResponse({ success: true });
            })
            .catch(error => {
                console.error('Ошибка при подключении к OpenAI API:', error);
                sendResponse({ success: false, error: 'Ошибка при подключении к OpenAI API.' });
            });
        });

        return true; // Указывает, что ответ будет отправлен асинхронно
    }
});
