// content.js

// Импортируем необходимые библиотеки
import { marked } from 'marked'; // Библиотека для парсинга Markdown
import hljs from 'highlight.js/lib/core'; // Библиотека для подсветки синтаксиса
import swift from 'highlight.js/lib/languages/swift'; // Язык Swift для подсветки
import 'highlight.js/styles/github.css'; // Стили для подсветки кода

// Регистрируем язык Swift для подсветки кода
hljs.registerLanguage('swift', swift);

// Настраиваем marked для использования подсветки синтаксиса
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

    // Создаем и настраиваем иконку "улучшения"
    let improveIcon = document.createElement('div');
    improveIcon.id = 'improveIcon';
    improveIcon.innerHTML = '<i class="fas fa-magic"></i>';
    improveIcon.style.display = 'none';
    document.body.appendChild(improveIcon);

    // Переменные для хранения состояния
    let selectedText = '';
    let initialSelectedText = '';
    let promptType = '';
    let markdownBuffer = '';
    let currentRequestId = null;

    // Обработчик события при выделении текста
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

            // Вызов showResult и ожидание, пока она завершит свою работу
            showResult('').then(() => {
                // Гарантированно вызываем sendRequest после завершения showResult
                console.log('Отправка запроса:', initialSelectedText);
                sendRequest(initialSelectedText);
            });
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

    // Функция для отправки запроса к background script
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

        // Отправляем сообщение в background script
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

    // Слушаем сообщения от background script
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.requestId !== currentRequestId) {
            // Если идентификатор запроса не совпадает, игнорируем сообщение
            return;
        }
        if (request.action === 'streamData') {
            // Получаем потоковые данные и добавляем их к результату
            appendResultText(request.content);
        }
    });

    // Функция для добавления текста к результату
    function appendResultText(text) {
        const resultText = document.getElementById('resultText');
        if (resultText) {
            markdownBuffer += text;
            resultText.innerHTML = marked(markdownBuffer);

            // Подсвечиваем синтаксис в блоках кода
            resultText.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        }
    }

    // Функция для отображения окна результата
    function showResult(text) {
        return new Promise((resolve) => {
            let resultWindow = document.createElement('div');
            resultWindow.id = 'resultWindow';

            // Создаем заголовок окна
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

            // Создаем выпадающий список для выбора промпта
            let promptSelector = document.createElement('select');
            promptSelector.id = 'promptSelector';
            promptSelector.addEventListener('change', function() {
                promptType = this.value;
                const resultText = document.getElementById('resultText');
                if (resultText) resultText.innerText = '';
                cancelCurrentRequest(); // Отмена текущего запроса при смене промпта
                sendRequest(initialSelectedText);
            });

            // Создаем область для отображения результата
            let resultText = document.createElement('div');
            resultText.id = 'resultText';
            resultText.innerHTML = marked(text);

            // Создаем контейнер для кнопок
            let buttonsDiv = document.createElement('div');
            buttonsDiv.id = 'buttons';

            // Кнопка "Копировать"
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

            // Кнопка "Отправить заново"
            let resendButton = document.createElement('button');
            resendButton.id = 'resendButton';
            resendButton.innerText = 'Отправить заново';
            resendButton.addEventListener('click', function() {
                cancelCurrentRequest(); // Отмена текущего запроса
                sendRequest(initialSelectedText); // Отправка нового запроса с теми же параметрами
            });

            // Добавляем кнопки в контейнер
            buttonsDiv.appendChild(copyButton);
            buttonsDiv.appendChild(resendButton);

            // Собираем все элементы окна
            resultWindow.appendChild(header);
            resultWindow.appendChild(promptSelector);
            resultWindow.appendChild(resultText);
            resultWindow.appendChild(buttonsDiv);

            // Добавляем окно на страницу
            document.body.appendChild(resultWindow);

            // Реализуем возможность перетаскивания окна
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

            // Загружаем список промптов и разрешаем Promise после завершения
            loadPrompts(promptSelector).then(() => {
                resolve(); // Разрешаем Promise после завершения loadPrompts
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
                promptType = promptSelector.value;
            })
            .catch(error => console.error('Ошибка при загрузке промптов:', error));
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

    // Инициализация promptType при загрузке скрипта
    document.addEventListener('DOMContentLoaded', () => {
        loadPrompts({ appendChild: () => {} }); // Загружаем промпты без добавления в DOM
    });

})();
