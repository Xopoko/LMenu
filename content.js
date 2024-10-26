// content.js

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

    let improveIcon = document.createElement('div');
    improveIcon.id = 'improveIcon';
    improveIcon.innerHTML = '<i class="fas fa-magic"></i>';
    improveIcon.style.display = 'none';
    document.body.appendChild(improveIcon);

    let selectedText = '';
    let initialSelectedText = '';
    let promptType = '';
    let markdownBuffer = '';
    let currentRequestId = null;

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

    improveIcon.addEventListener('click', function() {
        if (selectedText.length > 0) {
            initialSelectedText = selectedText;
            showResult('');
            sendRequest(initialSelectedText);
        }
        improveIcon.style.display = 'none';
    });

    chrome.runtime.sendMessage({ action: 'getTabId' }, function(response) {
        if (response && response.tabId !== undefined) {
            window.currentTabId = response.tabId;
        } else {
            console.error('Не удалось получить tabId.');
        }
    });

    function sendRequest(text) {
        const resultText = document.getElementById('resultText');
        const resultWindow = document.getElementById('resultWindow');

        // Генерируем уникальный идентификатор запроса
        currentRequestId = Date.now() + Math.random();

        // Очистка предыдущего результата
        if (resultText) {
            resultText.innerHTML = '';
        }

        // Очищаем markdown буфер
        markdownBuffer = '';

        chrome.runtime.sendMessage({
            action: 'sendToOpenAI',
            text: text,
            promptType: promptType,
            tabId: window.currentTabId,
            requestId: currentRequestId // Передаем идентификатор запроса
        }, function(response) {
            if (response && response.success) {
                console.log('Запрос успешно отправлен');
            } else {
                console.error('Ошибка при отправке запроса:', response.error || 'Неизвестная ошибка');
                alert(response.error || 'Неизвестная ошибка.');
            }
        });
    }

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.requestId !== currentRequestId) {
            // Если идентификатор запроса не совпадает, игнорируем сообщение
            return;
        }
        if (request.action === 'streamData') {
            appendResultText(request.content);
        }
    });

    function appendResultText(text) {
        const resultText = document.getElementById('resultText');
        if (resultText) {
            markdownBuffer += text;
            resultText.innerHTML = marked(markdownBuffer);

            resultText.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });

            resultText.scrollTop = resultText.scrollHeight;
        }
    }

    function showResult(text) {
        let resultWindow = document.createElement('div');
        resultWindow.id = 'resultWindow';

        let header = document.createElement('header');
        let title = document.createElement('h2');
        title.innerText = 'Результат';
        let closeButton = document.createElement('button');
        closeButton.id = 'closeButton';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', function() {
            document.body.removeChild(resultWindow);
            cancelCurrentRequest(); // Отмена текущего запроса при закрытии окна
        });
        header.appendChild(title);
        header.appendChild(closeButton);

        let promptSelector = document.createElement('select');
        promptSelector.id = 'promptSelector';
        promptSelector.addEventListener('change', function() {
            promptType = this.value;
            const resultText = document.getElementById('resultText');
            if (resultText) resultText.innerText = '';
            cancelCurrentRequest(); // Отмена текущего запроса при смене промпта
            sendRequest(initialSelectedText);
        });

        let resultText = document.createElement('div');
        resultText.id = 'resultText';
        resultText.innerHTML = marked(text);

        let buttonsDiv = document.createElement('div');
        buttonsDiv.id = 'buttons';

        let copyButton = document.createElement('button');
        copyButton.id = 'copyButton';
        copyButton.innerText = 'Копировать';
        copyButton.addEventListener('click', function() {
            navigator.clipboard.writeText(resultText.innerText).then(() => {
                copyButton.innerText = 'Скопировано!';
                setTimeout(() => {
                    copyButton.innerText = 'Копировать';
                }, 2000);
            });
        });

        // **Новая кнопка "Сбросить и отправить заново"**
        let resendButton = document.createElement('button');
        resendButton.id = 'resendButton';
        resendButton.innerText = 'Отправить заново';
        resendButton.addEventListener('click', function() {
            cancelCurrentRequest(); // Отмена текущего запроса
            sendRequest(initialSelectedText); // Отправка нового запроса с теми же параметрами
        });

        buttonsDiv.appendChild(copyButton);
        buttonsDiv.appendChild(resendButton); // Добавляем новую кнопку в контейнер кнопок

        resultWindow.appendChild(header);
        resultWindow.appendChild(promptSelector);
        resultWindow.appendChild(resultText);
        resultWindow.appendChild(buttonsDiv);

        document.body.appendChild(resultWindow);

        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        header.addEventListener('mousedown', function(e) {
            isDragging = true;
            offsetX = e.clientX - resultWindow.offsetLeft;
            offsetY = e.clientY - resultWindow.offsetTop;
            resultWindow.classList.add('dragging');
        });

        document.addEventListener('mousemove', function(e) {
            if (isDragging) {
                resultWindow.style.left = (e.clientX - offsetX) + 'px';
                resultWindow.style.top = (e.clientY - offsetY) + 'px';
                resultWindow.style.transform = 'translate(0, 0)';
            }
        });

        document.addEventListener('mouseup', function() {
            isDragging = false;
            resultWindow.classList.remove('dragging');
        });

        loadPrompts(promptSelector);
    }

    function loadPrompts(promptSelector) {
        fetch(chrome.runtime.getURL('prompts.json'))
            .then(response => response.json())
            .then(data => {
                promptSelector.innerHTML = '';
                data.prompts.forEach(prompt => {
                    let option = document.createElement('option');
                    option.value = prompt.name;
                    option.innerText = prompt.name;
                    promptSelector.appendChild(option);
                });
                promptType = promptSelector.value;
            })
            .catch(error => console.error('Ошибка при загрузке промптов:', error));
    }

    function cancelCurrentRequest() {
        if (currentRequestId) {
            chrome.runtime.sendMessage({
                action: 'cancelRequest',
                requestId: currentRequestId
            });
            currentRequestId = null;
        }
    }

    // Инициализация promptType при загрузке скрипта
    document.addEventListener('DOMContentLoaded', () => {
        loadPrompts({ appendChild: () => {} }); // Загружаем промпты без добавления в DOM
    });

})();
