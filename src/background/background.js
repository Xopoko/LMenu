import BackgroundMessageHandler from "./messageHandler.js";

console.log("Background script initialized.");

chrome.runtime.onInstalled.addListener(() => {
  createOrUpdateContextMenu();
});

chrome.runtime.onStartup.addListener(() => {
  createOrUpdateContextMenu();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.prompts) {
    createOrUpdateContextMenu();
  }
});

function createOrUpdateContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.storage.sync.get(["lastSelectedPrompt"], (data) => {
      const lastSelectedPrompt = data.lastSelectedPrompt || "Last used prompt";
      chrome.contextMenus.create({
        id: "use-lmenu-last",
        title: `LMenu: ${lastSelectedPrompt}`,
        contexts: ["selection"],
      });
      chrome.contextMenus.create({
        id: "use-lmenu-prompts",
        title: "LMenu Prompts",
        contexts: ["selection"],
      });
      chrome.storage.sync.get(["prompts"], (result) => {
        const prompts = result.prompts || [];
        prompts.forEach((prompt, index) => {
          chrome.contextMenus.create({
            id: `use-lmenu-prompts-${index}`,
            parentId: "use-lmenu-prompts",
            title: prompt.name,
            contexts: ["selection"],
          });
        });
      });
    });
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let selectedText = info.selectionText || "";
  if (!selectedText) {
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString(),
      });
      selectedText = result.result || "";
    } catch (err) {
      console.error("Failed to retrieve selection via scripting:", err);
    }
  }
  if (info.menuItemId === "use-lmenu-last") {
    chrome.storage.sync.get(["lastSelectedPrompt"], (res) => {
      const lastSelectedPrompt = res.lastSelectedPrompt || "";
      chrome.tabs.sendMessage(tab.id, {
        action: "openLMenu",
        text: selectedText,
        chosenPrompt: lastSelectedPrompt,
      });
    });
  } else if (info.menuItemId.startsWith("use-lmenu-prompts-")) {
    const idx = info.menuItemId.split("-").pop();
    chrome.storage.sync.get(["prompts"], (res) => {
      const prompts = res.prompts || [];
      const chosenPrompt = prompts[idx]?.name || "";
      chrome.tabs.sendMessage(tab.id, {
        action: "openLMenu",
        text: selectedText,
        chosenPrompt: chosenPrompt,
      });
    });
  }
});
