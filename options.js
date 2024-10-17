// options.js

document.getElementById('saveButton').addEventListener('click', function() {
    const apiKey = document.getElementById('apiKey').value.trim();
    if (apiKey) {
        chrome.storage.sync.set({ openaiApiKey: apiKey }, function() {
            alert('API ключ сохранен.');
            document.getElementById('apiKey').value = '';
        });
    } else {
        alert('Пожалуйста, введите API ключ.');
    }
});

window.onload = function() {
    chrome.storage.sync.get(['openaiApiKey'], function(result) {
        if (result.openaiApiKey) {
            document.getElementById('apiKey').value = result.openaiApiKey;
        }
    });
};
