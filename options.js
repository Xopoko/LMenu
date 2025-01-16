document.addEventListener('DOMContentLoaded', function () {
    initializeApiKeys();
    initializePromptsAndLanguages();

    document.getElementById('addApiKeyButton').addEventListener('click', function () {
        showApiKeyForm();
    });
    document.getElementById('saveApiKeyButton').addEventListener('click', function () {
        saveApiKey();
    });
    document.getElementById('cancelApiKeyButton').addEventListener('click', function () {
        hideApiKeyForm();
    });
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

    // "Show floating button" disabled by default
    chrome.storage.sync.get({ showFloatingButton: false }, function (result) {
        document.getElementById('showFloatingButton').checked = result.showFloatingButton;
    });
    document.getElementById('showFloatingButton').addEventListener('change', function () {
        chrome.storage.sync.set({ showFloatingButton: this.checked });
    });
});

function initializeApiKeys() {
    chrome.storage.sync.get(['apiKeys'], function (result) {
        let apiKeys = result.apiKeys || [];
        displayApiKeys(apiKeys);
    });
}

function displayApiKeys(apiKeys) {
    const apiKeysContainer = document.getElementById('apiKeysContainer');
    apiKeysContainer.innerHTML = '';
    apiKeys.forEach((apiKey, index) => {
        const apiKeyDiv = document.createElement('div');
        apiKeyDiv.className = 'item';
        const nameSpan = document.createElement('span');
        nameSpan.textContent = apiKey.name;
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', function () {
            showApiKeyForm(index);
        });
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', function () {
            deleteApiKey(index);
        });
        apiKeyDiv.appendChild(nameSpan);
        apiKeyDiv.appendChild(editButton);
        apiKeyDiv.appendChild(deleteButton);
        apiKeysContainer.appendChild(apiKeyDiv);
    });
}

function showApiKeyForm(index) {
    const apiKeyForm = document.getElementById('apiKeyForm');
    apiKeyForm.style.display = 'block';
    if (index !== undefined) {
        chrome.storage.sync.get(['apiKeys'], function (result) {
            const apiKey = result.apiKeys[index];
            document.getElementById('apiKeyName').value = apiKey.name;
            document.getElementById('apiKeyValue').value = apiKey.key;
            document.getElementById('apiKeyModel').value = apiKey.model;
            apiKeyForm.dataset.index = index;
        });
    } else {
        document.getElementById('apiKeyName').value = `API Key ${Date.now()}`;
        document.getElementById('apiKeyValue').value = '';
        document.getElementById('apiKeyModel').value = 'gpt-3.5-turbo';
        apiKeyForm.dataset.index = '';
    }
}

function hideApiKeyForm() {
    const apiKeyForm = document.getElementById('apiKeyForm');
    apiKeyForm.style.display = 'none';
    apiKeyForm.dataset.index = '';
}

function saveApiKey() {
    const name = document.getElementById('apiKeyName').value.trim();
    const key = document.getElementById('apiKeyValue').value.trim();
    const model = document.getElementById('apiKeyModel').value.trim();
    if (name && key && model) {
        chrome.storage.sync.get(['apiKeys', 'prompts'], function (result) {
            let apiKeys = result.apiKeys || [];
            let prompts = result.prompts || [];
            const index = document.getElementById('apiKeyForm').dataset.index;
            if (index !== '') {
                apiKeys[index] = { name, key, model };
            } else {
                apiKeys.push({ name, key, model });
            }
            chrome.storage.sync.set({ apiKeys }, function () {
                displayApiKeys(apiKeys);
                hideApiKeyForm();
                displayPrompts(prompts);
            });
        });
    } else {
        alert('Please fill in all fields for the API key.');
    }
}

function deleteApiKey(index) {
    chrome.storage.sync.get(['apiKeys', 'prompts'], function (result) {
        let apiKeys = result.apiKeys || [];
        let prompts = result.prompts || [];
        apiKeys.splice(index, 1);
        chrome.storage.sync.set({ apiKeys }, function () {
            displayApiKeys(apiKeys);
            displayPrompts(prompts);
        });
    });
}

function initializePromptsAndLanguages() {
    chrome.storage.sync.get(['prompts', 'languages'], function (result) {
        let prompts = result.prompts;
        let languages = result.languages;
        if (!prompts || !languages) {
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
    chrome.storage.sync.get(['apiKeys'], function (result) {
        const apiKeys = result.apiKeys || [];
        prompts.forEach((prompt, index) => {
            const promptDiv = document.createElement('div');
            promptDiv.className = 'item';
            const nameSpan = document.createElement('span');
            nameSpan.textContent = prompt.name;
            const apiKeySelector = document.createElement('select');
            apiKeySelector.style.marginLeft = '10px';
            apiKeys.forEach((apiKey) => {
                const option = document.createElement('option');
                option.value = apiKey.name;
                option.textContent = apiKey.name;
                apiKeySelector.appendChild(option);
            });
            if (prompt.apiKeyName) {
                apiKeySelector.value = prompt.apiKeyName;
            } else if (apiKeys.length > 0) {
                apiKeySelector.value = apiKeys[0].name;
                prompt.apiKeyName = apiKeys[0].name;
                savePrompts(prompts);
            }
            apiKeySelector.addEventListener('change', function () {
                prompt.apiKeyName = apiKeySelector.value;
                savePrompts(prompts);
            });
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.addEventListener('click', function () {
                showPromptForm(index);
            });
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', function () {
                deletePrompt(index);
            });
            promptDiv.appendChild(nameSpan);
            promptDiv.appendChild(apiKeySelector);
            promptDiv.appendChild(editButton);
            promptDiv.appendChild(deleteButton);
            promptsContainer.appendChild(promptDiv);
        });
    });
}

function savePrompts(prompts) {
    chrome.storage.sync.set({ prompts }, function () {
        console.log('Prompts updated.');
    });
}

function showPromptForm(index) {
    const promptForm = document.getElementById('promptForm');
    promptForm.style.display = 'block';
    chrome.storage.sync.get(['apiKeys'], function (result) {
        const apiKeys = result.apiKeys || [];
        const apiKeySelector = document.getElementById('promptApiKeySelector');
        apiKeySelector.innerHTML = '';
        apiKeys.forEach((apiKey) => {
            const option = document.createElement('option');
            option.value = apiKey.name;
            option.textContent = apiKey.name;
            apiKeySelector.appendChild(option);
        });
        if (index !== undefined) {
            chrome.storage.sync.get(['prompts'], function (result) {
                const prompt = result.prompts[index];
                document.getElementById('promptName').value = prompt.name;
                document.getElementById('promptContent').value = prompt.systemContent;
                apiKeySelector.value = prompt.apiKeyName || apiKeys[0]?.name;
                promptForm.dataset.index = index;
            });
        } else {
            document.getElementById('promptName').value = '';
            document.getElementById('promptContent').value = '';
            apiKeySelector.value = apiKeys[0]?.name;
            promptForm.dataset.index = '';
        }
    });
}

function hidePromptForm() {
    const promptForm = document.getElementById('promptForm');
    promptForm.style.display = 'none';
    promptForm.dataset.index = '';
}

function savePrompt() {
    const name = document.getElementById('promptName').value.trim();
    const content = document.getElementById('promptContent').value.trim();
    const apiKeyName = document.getElementById('promptApiKeySelector').value;
    if (name && content) {
        chrome.storage.sync.get(['prompts'], function (result) {
            let prompts = result.prompts || [];
            const index = document.getElementById('promptForm').dataset.index;
            if (index !== '') {
                prompts[index] = { name: name, systemContent: content, apiKeyName };
            } else {
                prompts.push({ name: name, systemContent: content, apiKeyName });
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

function deletePrompt(index) {
    chrome.storage.sync.get(['prompts'], function (result) {
        let prompts = result.prompts || [];
        prompts.splice(index, 1);
        chrome.storage.sync.set({ prompts: prompts }, function () {
            displayPrompts(prompts);
        });
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
