// options.js

document.addEventListener('DOMContentLoaded', function () {
    // Загрузка API ключа
    chrome.storage.sync.get(['openaiApiKey'], function (result) {
        if (result.openaiApiKey) {
            document.getElementById('apiKey').value = result.openaiApiKey;
        }
    });

    // Сохранение API ключа
    document.getElementById('saveButton').addEventListener('click', function () {
        const apiKey = document.getElementById('apiKey').value.trim();
        if (apiKey) {
            chrome.storage.sync.set({ openaiApiKey: apiKey }, function () {
                alert('API key is saved.');
            });
        } else {
            alert('Please enter a valid API key.');
        }
    });

    // Инициализация промптов и языков
    initializePromptsAndLanguages();

    // Обработчики для кнопок
    document.getElementById('addPromptButton').addEventListener('click', function () {
        showPromptForm();
    });

    document.getElementById('savePromptButton').addEventListener('click', function () {
        savePrompt();
    });

    document.getElementById('cancelPromptButton').addEventListener('click', function () {
        hidePromptForm();
    });

    document.getElementById('addLanguageButton').addEventListener('click', function () {
        showLanguageForm();
    });

    document.getElementById('saveLanguageButton').addEventListener('click', function () {
        saveLanguage();
    });

    document.getElementById('cancelLanguageButton').addEventListener('click', function () {
        hideLanguageForm();
    });
});

function initializePromptsAndLanguages() {
    chrome.storage.sync.get(['prompts', 'languages'], function (result) {
        let prompts = result.prompts;
        let languages = result.languages;

        if (!prompts || !languages) {
            // Если данных нет в хранилище, загружаем из prompts.json
            fetch(chrome.runtime.getURL('prompts.json'))
                .then((response) => response.json())
                .then((data) => {
                    prompts = data.prompts;
                    languages = data.languages;

                    chrome.storage.sync.set({ prompts: prompts, languages: languages }, function () {
                        displayPrompts(prompts);
                        displayLanguages(languages);
                    });
                });
        } else {
            displayPrompts(prompts);
            displayLanguages(languages);
        }
    });
}

function displayPrompts(prompts) {
    const promptsContainer = document.getElementById('promptsContainer');
    promptsContainer.innerHTML = '';

    prompts.forEach((prompt, index) => {
        const promptDiv = document.createElement('div');
        promptDiv.className = 'item';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = prompt.name;

        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', function () {
            editPrompt(index);
        });

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', function () {
            deletePrompt(index);
        });

        promptDiv.appendChild(nameSpan);
        promptDiv.appendChild(editButton);
        promptDiv.appendChild(deleteButton);

        promptsContainer.appendChild(promptDiv);
    });
}

function displayLanguages(languages) {
    const languagesContainer = document.getElementById('languagesContainer');
    languagesContainer.innerHTML = '';

    languages.forEach((language, index) => {
        const languageDiv = document.createElement('div');
        languageDiv.className = 'item';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = language;

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', function () {
            deleteLanguage(index);
        });

        languageDiv.appendChild(nameSpan);
        languageDiv.appendChild(deleteButton);

        languagesContainer.appendChild(languageDiv);
    });
}

function showPromptForm(index) {
    const promptForm = document.getElementById('promptForm');
    promptForm.style.display = 'block';

    if (index !== undefined) {
        // Редактирование существующего промпта
        chrome.storage.sync.get(['prompts'], function (result) {
            const prompt = result.prompts[index];
            document.getElementById('promptName').value = prompt.name;
            document.getElementById('promptContent').value = prompt.systemContent;
            promptForm.dataset.index = index;
        });
    } else {
        // Добавление нового промпта
        document.getElementById('promptName').value = '';
        document.getElementById('promptContent').value = '';
        promptForm.dataset.index = '';
    }
}

function hidePromptForm() {
    const promptForm = document.getElementById('promptForm');
    promptForm.style.display = 'none';
    promptForm.dataset.index = '';
}

function savePrompt() {
    const name = document.getElementById('promptName').value.trim();
    const content = document.getElementById('promptContent').value.trim();

    if (name && content) {
        chrome.storage.sync.get(['prompts'], function (result) {
            let prompts = result.prompts || [];
            const index = document.getElementById('promptForm').dataset.index;

            if (index !== '') {
                // Редактирование существующего промпта
                prompts[index] = { name: name, systemContent: content };
            } else {
                // Добавление нового промпта
                prompts.push({ name: name, systemContent: content });
            }

            chrome.storage.sync.set({ prompts: prompts }, function () {
                displayPrompts(prompts);
                hidePromptForm();
            });
        });
    } else {
        alert('Please enter both name and content for the prompt.');
    }
}

function editPrompt(index) {
    showPromptForm(index);
}

function deletePrompt(index) {
    chrome.storage.sync.get(['prompts'], function (result) {
        let prompts = result.prompts || [];
        prompts.splice(index, 1);
        chrome.storage.sync.set({ prompts: prompts }, function () {
            displayPrompts(prompts);
        });
    });
}

function showLanguageForm() {
    const languageForm = document.getElementById('languageForm');
    languageForm.style.display = 'block';
    document.getElementById('languageName').value = '';
}

function hideLanguageForm() {
    const languageForm = document.getElementById('languageForm');
    languageForm.style.display = 'none';
}

function saveLanguage() {
    const language = document.getElementById('languageName').value.trim();
    if (language) {
        chrome.storage.sync.get(['languages'], function (result) {
            let languages = result.languages || [];
            if (!languages.includes(language)) {
                languages.push(language);
                chrome.storage.sync.set({ languages: languages }, function () {
                    displayLanguages(languages);
                    hideLanguageForm();
                });
            } else {
                alert('Language already exists.');
            }
        });
    } else {
        alert('Please enter a language name.');
    }
}

function deleteLanguage(index) {
    chrome.storage.sync.get(['languages'], function (result) {
        let languages = result.languages || [];
        languages.splice(index, 1);
        chrome.storage.sync.set({ languages: languages }, function () {
            displayLanguages(languages);
        });
    });
}
