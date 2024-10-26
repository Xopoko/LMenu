// content.js

// Импортируем необходимые библиотеки
import { marked } from 'marked';
import hljs from 'highlight.js/lib/core';
import swift from 'highlight.js/lib/languages/swift';
import 'highlight.js/styles/github.css';

hljs.registerLanguage('swift', swift);

marked.setOptions({
    highlight: function (code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
    }
});

(function() {
    'use strict';

    // Создаем иконку "улучшения"
    let improveIcon = document.createElement('div');
    improveIcon.id = 'improveIcon';
    improveIcon.innerHTML = '<i class="fas fa-magic"></i>';
    improveIcon.style.display = 'none';
    document.body.appendChild(improveIcon);

    // Переменные состояния
    let selectedText = '';
    let initialSelectedText = '';
    let promptType = '';
    let promptLanguage = '';
    let markdownBuffer = '';
    let currentRequestId = null;
    let shadowRoot = null;
    let container = null;

    // Обработчик выделения текста
    document.addEventListener('mouseup', function(e) {
        setTimeout(() => {
            let currentSelection = window.getSelection().toString().trim();
            if (currentSelection.length > 0) {
                selectedText = currentSelection;
                improveIcon.style.top = (e.pageY - 40) + 'px';
                improveIcon.style.left = e.pageX + 'px';
                improveIcon.style.display = 'flex';
            } else {
                improveIcon.style.display = 'none';
            }
        }, 10);
    });

    // Обработчик клика по иконке "улучшения"
    improveIcon.addEventListener('click', function() {
        if (selectedText.length > 0) {
            initialSelectedText = selectedText;
            showResult('');
        }
        improveIcon.style.display = 'none';
    });

    // Получаем идентификатор текущей вкладки
    chrome.runtime.sendMessage({ action: 'getTabId' }, function(response) {
        if (response && response.tabId !== undefined) {
            window.currentTabId = response.tabId;
        } else {
            console.error('Не удалось получить tabId.');
        }
    });

    // Функция для отправки запроса к background.js
    function sendRequest(text) {
        const resultText = shadowRoot.getElementById('resultText');
        const resultWindow = shadowRoot.getElementById('resultWindow');

        currentRequestId = Date.now() + Math.random();

        if (resultText) {
            resultText.innerHTML = '';
        }

        markdownBuffer = '';

        chrome.runtime.sendMessage({
            action: 'sendToOpenAI',
            text: text,
            promptType: promptType,
            promptLanguage: promptLanguage,
            tabId: window.currentTabId,
            requestId: currentRequestId
        }, function(response) {
            if (response && response.success) {
                console.log('Запрос успешно отправлен');
            } else {
                console.error('Ошибка при отправке запроса:', response.error || 'Неизвестная ошибка');
                alert(response.error || 'Неизвестная ошибка.');
            }
        });
    }

    // Обработчик входящих сообщений
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.requestId !== currentRequestId) {
            return;
        }
        if (request.action === 'streamData') {
            appendResultText(request.content);
        }
    });

    // Функция для добавления текста к результату
    function appendResultText(text) {
        const resultText = shadowRoot.getElementById('resultText');
        if (resultText) {
            markdownBuffer += text;
            resultText.innerHTML = marked(markdownBuffer);

            resultText.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        }
    }

    // Функции для загрузки HTML и CSS
    function loadResultWindowHtml() {
        return fetch(chrome.runtime.getURL('resultWindow.html'))
            .then(response => response.text());
    }

    function loadResultWindowCss() {
        return fetch(chrome.runtime.getURL('resultWindow.css'))
            .then(response => response.text());
    }

    // Функция для отображения окна результата
    function showResult(text) {
        return Promise.all([loadResultWindowHtml(), loadResultWindowCss()])
            .then(([htmlContent, cssContent]) => {
                container = document.createElement('div');
                container.id = 'extensionContainer';
                document.body.appendChild(container);

                container.style.position = 'fixed';
                container.style.top = '0';
                container.style.left = '0';
                container.style.width = '100%';
                container.style.height = '100%';
                container.style.zIndex = '9999';

                shadowRoot = container.attachShadow({ mode: 'open' });

                let styleElement = document.createElement('style');
                styleElement.textContent = cssContent;

                shadowRoot.innerHTML = htmlContent;
                shadowRoot.appendChild(styleElement);

                let resultWindow = shadowRoot.getElementById('resultWindow');
                let promptSelector = shadowRoot.getElementById('promptSelector');
                let promptLanguageSelector = shadowRoot.getElementById('promptLanguageSelector');
                let resultText = shadowRoot.getElementById('resultText');
                let copyButton = shadowRoot.getElementById('copyButton');
                let resendButton = shadowRoot.getElementById('resendButton');
                let closeButton = shadowRoot.getElementById('closeButton');
                let header = resultWindow.querySelector('header');

                // Обработчики событий
                closeButton.addEventListener('click', function() {
                    document.body.removeChild(container);
                    cancelCurrentRequest();
                });

                copyButton.addEventListener('click', function() {
                    navigator.clipboard.writeText(resultText.innerText).then(() => {
                        copyButton.innerText = 'Скопировано!';
                        setTimeout(() => {
                            copyButton.innerText = 'Копировать';
                        }, 2000);
                    });
                });

                resendButton.addEventListener('click', function() {
                    cancelCurrentRequest();
                    sendRequest(initialSelectedText);
                });

                promptSelector.addEventListener('change', function() {
                    promptType = this.value;
                    chrome.storage.sync.set({ lastSelectedPrompt: promptType });
                    if (resultText) resultText.innerText = '';
                    cancelCurrentRequest();
                    sendRequest(initialSelectedText);
                });

                promptLanguageSelector.addEventListener('change', function() {
                    promptLanguage = this.value;
                    chrome.storage.sync.set({ lastSelectedLanguage: promptLanguage });
                    if (resultText) resultText.innerText = '';
                    cancelCurrentRequest();
                    sendRequest(initialSelectedText);
                });

                // Реализуем перетаскивание окна
                let isDragging = false;
                let startX, startY, initialLeft, initialTop;

                header.addEventListener('mousedown', function(e) {
                    isDragging = true;
                    startX = e.clientX;
                    startY = e.clientY;
                    const computedStyle = window.getComputedStyle(resultWindow);
                    initialLeft = parseInt(computedStyle.left);
                    initialTop = parseInt(computedStyle.top);
                    resultWindow.classList.add('dragging');
                });

                document.addEventListener('mousemove', function(e) {
                    if (isDragging) {
                        let deltaX = e.clientX - startX;
                        let deltaY = e.clientY - startY;
                        resultWindow.style.left = (initialLeft + deltaX) + 'px';
                        resultWindow.style.top = (initialTop + deltaY) + 'px';
                    }
                });

                document.addEventListener('mouseup', function() {
                    isDragging = false;
                    resultWindow.classList.remove('dragging');
                });

                loadPromptLanguages(promptLanguageSelector).then(() => {
                    console.log('promptLanguage инициализирован:', promptLanguage);
                });

                // Загружаем список промптов и отправляем запрос
                loadPrompts(promptSelector).then(() => {
                    console.log('promptType инициализирован:', promptType);
                    sendRequest(initialSelectedText);
                });
            });
    }

    // Функция для загрузки промптов
    function loadPrompts(promptSelector) {
        return fetch(chrome.runtime.getURL('prompts.json'))
            .then(response => response.json())
            .then(data => {
                promptSelector.innerHTML = '';
                data.prompts.forEach(prompt => {
                    let option = document.createElement('option');
                    option.value = prompt.name;
                    option.innerText = prompt.name;
                    promptSelector.appendChild(option);
                });
                return new Promise((resolve) => {
                    chrome.storage.sync.get(['lastSelectedPrompt'], function(result) {
                        const storedValue = result.lastSelectedPrompt;
                        const optionValues = Array.from(promptSelector.options).map(option => option.value);
                        if (storedValue && optionValues.includes(storedValue)) {
                            promptSelector.value = storedValue;
                        } else {
                            promptSelector.value = optionValues[0];
                        }
                        promptType = promptSelector.value;
                        resolve();
                    });
                });
            });
    }

    function loadPromptLanguages(promptLanguageSelector) {
        return fetch(chrome.runtime.getURL('prompts.json'))
            .then(response => response.json())
            .then(data => {
                promptLanguageSelector.innerHTML = '';
                data.languages.forEach(language => {
                    let option = document.createElement('option');
                    option.value = language;
                    option.innerText = language;
                    promptLanguageSelector.appendChild(option);
                });
                return new Promise((resolve) => {
                    chrome.storage.sync.get(['lastSelectedLanguage'], function(result) {
                        const storedValue = result.lastSelectedLanguage;
                        const optionValues = Array.from(promptLanguageSelector.options).map(option => option.value);
                        if (storedValue && optionValues.includes(storedValue)) {
                            promptLanguageSelector.value = storedValue;
                        } else {
                            promptLanguageSelector.value = optionValues[0];
                        }
                        promptLanguage = promptLanguageSelector.value;
                        resolve();
                    });
                });
            });
    }

    // Функция для отмены текущего запроса
    function cancelCurrentRequest() {
        if (currentRequestId) {
            chrome.runtime.sendMessage({
                action: 'cancelRequest',
                requestId: currentRequestId
            });
            currentRequestId = null;
        }
    }

})();
