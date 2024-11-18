// src/common/utils.js

export function addSelectionListener() {
  document.addEventListener("mouseup", (e) => {
    setTimeout(() => {
      const currentSelection = window.getSelection().toString().trim();
      const improveIcon = document.getElementById("improveIcon");
      if (currentSelection.length > 0) {
        window.selectedText = currentSelection;
        improveIcon.style.top = `${e.pageY - 40}px`;
        improveIcon.style.left = `${e.pageX}px`;
        improveIcon.style.display = "flex";
      } else {
        improveIcon.style.display = "none";
      }
    }, 10);
  });
}

export async function loadResultWindowResources() {
  const [htmlContent, cssContent] = await Promise.all([
    fetch(chrome.runtime.getURL("resultWindow.html")).then((res) => res.text()),
    fetch(chrome.runtime.getURL("resultWindow.css")).then((res) => res.text()),
  ]);
  return { htmlContent, cssContent };
}

export function makeWindowDraggable(element) {
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;

  const header = element.querySelector("header");
  header.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
	const computedStyle = window.getComputedStyle(element);
	initialLeft = parseInt(computedStyle.left);
	initialTop = parseInt(computedStyle.top);
    element.classList.add("dragging");
  });

  document.addEventListener("mousemove", (e) => {
    if (isDragging) {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      element.style.left = `${initialLeft + deltaX}px`;
      element.style.top = `${initialTop + deltaY}px`;
    }
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      element.classList.remove("dragging");
    }
  });
}

export function populateSelector(selector, options, storedValue) {
  selector.innerHTML = "";
  options.forEach((optionValue) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.innerText = optionValue;
    selector.appendChild(option);
  });
  selector.value = options.includes(storedValue) ? storedValue : options[0];
}
