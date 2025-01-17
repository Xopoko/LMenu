document.addEventListener('DOMContentLoaded', function () {
    initializeApiKeys();
    initializePromptsAndLanguages();

    document.getElementById('addApiKeyButton').addEventListener('click', function () {
        addApiKeyInline();
    });
    document.getElementById('addPromptButton').addEventListener('click', function () {
        addPromptInline();
    });
    document.getElementById('addLanguageButton').addEventListener('click', function () {
        addLanguageInline();
    });

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
    const container = document.getElementById('apiKeysContainer');
    container.innerHTML = '';
    apiKeys.forEach((apiKey, index) => {
        const item = createApiKeyItem(apiKey, index);
        container.appendChild(item);
    });
    addDragAndDropListeners(container, 'apiKeys');
}

function createApiKeyItem(apiKey, index) {
    const item = document.createElement('li');
    item.className = 'item';
    item.draggable = true;
    item.dataset.index = index;

    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle';
    dragHandle.innerHTML = '&#8942;';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'inline-input';
    nameInput.value = apiKey.name;

    const keyInput = document.createElement('input');
    keyInput.type = 'password';
    keyInput.className = 'inline-input';
    keyInput.value = apiKey.key;

    const modelInput = document.createElement('input');
    modelInput.type = 'text';
    modelInput.className = 'inline-input';
    modelInput.value = apiKey.model;

    const saveButton = document.createElement('button');
    saveButton.className = 'inline-button';
    saveButton.textContent = 'Save';
    saveButton.addEventListener('click', () => {
        saveApiKeyInline(index, nameInput.value.trim(), keyInput.value.trim(), modelInput.value.trim());
    });

    const deleteButton = document.createElement('button');
    deleteButton.className = 'inline-button button-secondary';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => {
        deleteApiKey(index);
    });

    item.appendChild(dragHandle);
    item.appendChild(nameInput);
    item.appendChild(keyInput);
    item.appendChild(modelInput);
    item.appendChild(saveButton);
    item.appendChild(deleteButton);

    return item;
}

function addApiKeyInline() {
    chrome.storage.sync.get(['apiKeys'], function (result) {
        let apiKeys = result.apiKeys || [];
        apiKeys.push({ name: `API Key ${Date.now()}`, key: '', model: 'gpt-3.5-turbo' });
        chrome.storage.sync.set({ apiKeys }, function () {
            displayApiKeys(apiKeys);
        });
    });
}

function saveApiKeyInline(index, name, key, model) {
    if (!name || !key || !model) {
        alert('Please fill in all fields.');
        return;
    }
    chrome.storage.sync.get(['apiKeys'], function (result) {
        let apiKeys = result.apiKeys || [];
        apiKeys[index] = { name, key, model };
        chrome.storage.sync.set({ apiKeys }, function () {
            displayApiKeys(apiKeys);
        });
    });
}

function deleteApiKey(index) {
    chrome.storage.sync.get(['apiKeys'], function (result) {
        let apiKeys = result.apiKeys || [];
        apiKeys.splice(index, 1);
        chrome.storage.sync.set({ apiKeys }, function () {
            displayApiKeys(apiKeys);
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
                    chrome.storage.sync.set({ prompts, languages }, function () {
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
    const container = document.getElementById('promptsContainer');
    container.innerHTML = '';
    chrome.storage.sync.get(['apiKeys'], function (result) {
        const apiKeys = result.apiKeys || [];
        prompts.forEach((prompt, index) => {
            const item = createPromptItem(prompt, index, apiKeys);
            container.appendChild(item);
        });
        addDragAndDropListeners(container, 'prompts');
    });
}

function createPromptItem(prompt, index, apiKeys) {
    const item = document.createElement('li');
    item.className = 'item';
    item.draggable = true;
    item.dataset.index = index;

    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle';
    dragHandle.innerHTML = '&#8942;';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'inline-input';
    nameInput.value = prompt.name;

    const contentInput = document.createElement('textarea');
    contentInput.className = 'inline-input';
    contentInput.value = prompt.systemContent;
    contentInput.style.height = '60px';

    const apiKeySelector = document.createElement('select');
    apiKeySelector.className = 'inline-select';
    apiKeys.forEach((apiKey) => {
        const option = document.createElement('option');
        option.value = apiKey.name;
        option.textContent = apiKey.name;
        apiKeySelector.appendChild(option);
    });
    apiKeySelector.value = prompt.apiKeyName || apiKeys[0]?.name || '';

    const saveButton = document.createElement('button');
    saveButton.className = 'inline-button';
    saveButton.textContent = 'Save';
    saveButton.addEventListener('click', () => {
        savePromptInline(index, nameInput.value.trim(), contentInput.value.trim(), apiKeySelector.value);
    });

    const deleteButton = document.createElement('button');
    deleteButton.className = 'inline-button button-secondary';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => {
        deletePrompt(index);
    });

    item.appendChild(dragHandle);
    item.appendChild(nameInput);
    item.appendChild(contentInput);
    item.appendChild(apiKeySelector);
    item.appendChild(saveButton);
    item.appendChild(deleteButton);

    return item;
}

function addPromptInline() {
    chrome.storage.sync.get(['prompts', 'apiKeys'], function (result) {
        let prompts = result.prompts || [];
        let apiKeys = result.apiKeys || [];
        const defaultKeyName = apiKeys[0]?.name || '';
        prompts.push({ name: 'New Prompt', systemContent: '', apiKeyName: defaultKeyName });
        chrome.storage.sync.set({ prompts }, function () {
            displayPrompts(prompts);
        });
    });
}

function savePromptInline(index, name, content, apiKeyName) {
    if (!name || !content) {
        alert('Please fill in name and content.');
        return;
    }
    chrome.storage.sync.get(['prompts'], function (result) {
        let prompts = result.prompts || [];
        prompts[index] = { name, systemContent: content, apiKeyName };
        chrome.storage.sync.set({ prompts }, function () {
            displayPrompts(prompts);
        });
    });
}

function deletePrompt(index) {
    chrome.storage.sync.get(['prompts'], function (result) {
        let prompts = result.prompts || [];
        prompts.splice(index, 1);
        chrome.storage.sync.set({ prompts }, function () {
            displayPrompts(prompts);
        });
    });
}

function displayLanguages(languages) {
    const container = document.getElementById('languagesContainer');
    container.innerHTML = '';
    languages.forEach((language, index) => {
        const item = createLanguageItem(language, index);
        container.appendChild(item);
    });
    addDragAndDropListeners(container, 'languages');
}

function createLanguageItem(language, index) {
    const item = document.createElement('li');
    item.className = 'item';
    item.draggable = true;
    item.dataset.index = index;

    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle';
    dragHandle.innerHTML = '&#8942;';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'inline-input';
    nameInput.value = language;

    const saveButton = document.createElement('button');
    saveButton.className = 'inline-button';
    saveButton.textContent = 'Save';
    saveButton.addEventListener('click', () => {
        saveLanguageInline(index, nameInput.value.trim());
    });

    const deleteButton = document.createElement('button');
    deleteButton.className = 'inline-button button-secondary';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => {
        deleteLanguage(index);
    });

    item.appendChild(dragHandle);
    item.appendChild(nameInput);
    item.appendChild(saveButton);
    item.appendChild(deleteButton);

    return item;
}

function addLanguageInline() {
    chrome.storage.sync.get(['languages'], function (result) {
        let languages = result.languages || [];
        languages.push('New Language');
        chrome.storage.sync.set({ languages }, function () {
            displayLanguages(languages);
        });
    });
}

function saveLanguageInline(index, language) {
    if (!language) {
        alert('Please enter a language.');
        return;
    }
    chrome.storage.sync.get(['languages'], function (result) {
        let languages = result.languages || [];
        languages[index] = language;
        chrome.storage.sync.set({ languages }, function () {
            displayLanguages(languages);
        });
    });
}

function deleteLanguage(index) {
    chrome.storage.sync.get(['languages'], function (result) {
        let languages = result.languages || [];
        languages.splice(index, 1);
        chrome.storage.sync.set({ languages }, function () {
            displayLanguages(languages);
        });
    });
}

function addDragAndDropListeners(listElement, storageKey) {
    let dragSrcEl = null;

    function handleDragStart(e) {
        dragSrcEl = this;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
    }

    function handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    function handleDragEnter() {
        this.classList.add('over');
    }

    function handleDragLeave() {
        this.classList.remove('over');
    }

    function handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        if (dragSrcEl !== this) {
            let draggedIndex = parseInt(dragSrcEl.dataset.index, 10);
            let droppedIndex = parseInt(this.dataset.index, 10);

            chrome.storage.sync.get([storageKey], function (result) {
                let items = result[storageKey] || [];
                const temp = items[draggedIndex];
                items[draggedIndex] = items[droppedIndex];
                items[droppedIndex] = temp;
                chrome.storage.sync.set({ [storageKey]: items }, function () {
                    if (storageKey === 'apiKeys') {
                        displayApiKeys(items);
                    } else if (storageKey === 'prompts') {
                        displayPrompts(items);
                    } else if (storageKey === 'languages') {
                        displayLanguages(items);
                    }
                });
            });
        }
        return false;
    }

    function handleDragEnd() {
        const items = listElement.querySelectorAll('.item');
        items.forEach(function (item) {
            item.classList.remove('over');
        });
    }

    const items = listElement.querySelectorAll('.item');
    items.forEach(function (item) {
        item.addEventListener('dragstart', handleDragStart, false);
        item.addEventListener('dragenter', handleDragEnter, false);
        item.addEventListener('dragover', handleDragOver, false);
        item.addEventListener('dragleave', handleDragLeave, false);
        item.addEventListener('drop', handleDrop, false);
        item.addEventListener('dragend', handleDragEnd, false);
    });
}
