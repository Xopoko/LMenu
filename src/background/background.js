import BackgroundMessageHandler from "./messageHandler.js";

console.log("Background script initialized.");

// On install and on startup, build a dynamic context menu:
chrome.runtime.onInstalled.addListener(() => {
  createOrUpdateContextMenu();
});
chrome.runtime.onStartup.addListener(() => {
  createOrUpdateContextMenu();
});

function createOrUpdateContextMenu() {
  // Remove any existing menu items
  chrome.contextMenus.removeAll(() => {
    // Create a top-level menu for LMenu
    chrome.contextMenus.create({
      id: "use-lmenu",
      title: "Use LMenu for selected text",
      contexts: ["selection"],
    });

    // Fetch prompts from storage
    chrome.storage.sync.get(["prompts"], (result) => {
      const prompts = result.prompts || [];
      // Create a sub-menu item for each user prompt
      prompts.forEach((prompt, index) => {
        chrome.contextMenus.create({
          id: `use-lmenu-${index}`,
          parentId: "use-lmenu",
          title: prompt.name,
          contexts: ["selection"],
        });
      });
    });
  });
}

// Handle clicks on dynamic menu items
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  // If the user clicked any item under "use-lmenu"
  if (info.menuItemId.startsWith("use-lmenu")) {
    let selectedText = info.selectionText || "";

    // If no selectionText was provided, try to retrieve it via scripting
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

    // If the user clicked a sub-prompt, extract its index
    if (info.menuItemId.includes("-")) {
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
  }
});
