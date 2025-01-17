// src/background/background.js

import BackgroundMessageHandler from "./messageHandler.js";

console.log("Background script initialized.");

// Recreate context menu on install or startup
chrome.runtime.onInstalled.addListener(() => {
  createOrUpdateContextMenu();
});

chrome.runtime.onStartup.addListener(() => {
  createOrUpdateContextMenu();
});

function createOrUpdateContextMenu() {
  // Remove all existing context menu items
  chrome.contextMenus.removeAll(() => {
    // Get last selected prompt from storage
    chrome.storage.sync.get(["lastSelectedPrompt"], (data) => {
      const lastSelectedPrompt = data.lastSelectedPrompt || "Last used prompt";

      // 1) Create top-level item: "LMenu: <lastSelectedPrompt>"
      chrome.contextMenus.create({
        id: "use-lmenu-last",
        title: `LMenu: ${lastSelectedPrompt}`,
        contexts: ["selection"],
      });

      // 2) Create top-level item: "LMenu Prompts"
      chrome.contextMenus.create({
        id: "use-lmenu-prompts",
        title: "LMenu Prompts",
        contexts: ["selection"],
      });

      // Dynamically create sub-items for each prompt under "LMenu Prompts"
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

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let selectedText = info.selectionText || "";

  // If no direct selection available, attempt to grab from the page
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

  // Handle "LMenu: <lastUsedPrompt>"
  if (info.menuItemId === "use-lmenu-last") {
    chrome.storage.sync.get(["lastSelectedPrompt"], (res) => {
      const lastSelectedPrompt = res.lastSelectedPrompt || "";
      chrome.tabs.sendMessage(tab.id, {
        action: "openLMenu",
        text: selectedText,
        chosenPrompt: lastSelectedPrompt,
      });
    });
  }
  // Handle prompts under "LMenu Prompts"
  else if (info.menuItemId.startsWith("use-lmenu-prompts-")) {
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
