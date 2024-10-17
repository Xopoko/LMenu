// content.js

(function() {
    'use strict';

    let improveIcon = document.createElement('div');
    improveIcon.id = 'improveIcon';
    improveIcon.innerHTML = '<i class="fas fa-magic"></i>';
    improveIcon.style.display = 'none';
    document.body.appendChild(improveIcon);

    let selectedText = '';
    let initialSelectedText = '';
    let promptType = 'Перевод на русский';

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

    // Получение tabId
    chrome.runtime.sendMessage({ action: 'getTabId' }, function(response) {
        if (response && response.tabId !== undefined) {
            window.currentTabId = response.tabId;
        } else {
            console.error('Не удалось получить tabId.');
        }
    });

    function sendRequest(text) {
        const resultWindow = document.getElementById('resultWindow');
        if (resultWindow) {
            const loader = document.createElement('div');
            loader.id = 'loader';
            loader.innerText = 'Ожидание ответа от API...';
            resultWindow.appendChild(loader);
        }

        chrome.runtime.sendMessage({
            action: 'sendToOpenAI',
            text: text,
            promptType: promptType,
            tabId: window.currentTabId
        }, function(response) {
            if (response && response.success) {
                // Инициализация успешна, обработка будет через сообщения
            } else {
                alert(response.error || 'Неизвестная ошибка.');
            }
        });
    }

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === 'streamData') {
            console.log('Получены данные от background.js:', request.content);
            appendResultText(request.content);
        } else if (request.action === 'streamComplete') {
            console.log('Поток данных завершен.');
            const loader = document.getElementById('loader');
            if (loader) loader.remove();
        } else if (request.action === 'streamError') {
            console.error('Ошибка при получении данных:', request.error);
            const loader = document.getElementById('loader');
            if (loader) loader.innerText = 'Ошибка при получении данных.';
        }
    });

    function appendResultText(text) {
        const resultText = document.getElementById('resultText');
        if (resultText) {
            resultText.innerText += text;
        } else {
            console.error('Элемент resultText не найден.');
        }
    }

    function showResult(text) {
        let resultWindow = document.createElement('div');
        resultWindow.id = 'resultWindow';

        // Заголовок окна
        let header = document.createElement('header');
        let title = document.createElement('h2');
        title.innerText = 'Результат';
        let closeButton = document.createElement('button');
        closeButton.id = 'closeButton';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', function() {
            document.body.removeChild(resultWindow);
        });
        header.appendChild(title);
        header.appendChild(closeButton);

        // Селектор действий
        let promptSelector = document.createElement('select');
        promptSelector.id = 'promptSelector';
        promptSelector.innerHTML = `
            <option value="Перевод на русский">Перевод на русский</option>
            <option value="Исправить орфографические ошибки">Исправить орфографические ошибки</option>
        `;
        promptSelector.value = promptType;
        promptSelector.addEventListener('change', function() {
            promptType = this.value;
            // Очистить предыдущий результат
            const resultText = document.getElementById('resultText');
            if (resultText) resultText.innerText = '';
            sendRequest(initialSelectedText);
        });

        // Блок результата
        let resultText = document.createElement('div');
        resultText.id = 'resultText';
        resultText.innerText = text;

        // Кнопки действия
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

        buttonsDiv.appendChild(copyButton);

        // Добавляем элементы в окно
        resultWindow.appendChild(header);
        resultWindow.appendChild(promptSelector);
        resultWindow.appendChild(resultText);
        resultWindow.appendChild(buttonsDiv);

        document.body.appendChild(resultWindow);

        // Реализация перетаскивания окна
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
            if (isDragging) {
                isDragging = false;
                resultWindow.classList.remove('dragging');
            }
        });
    }

})();
