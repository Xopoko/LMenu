import React, { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { FaKey, FaListUl, FaLanguage, FaCog } from "react-icons/fa";
import "./options.css";

function reorder(list, startIndex, endIndex) {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

export default function Options() {
  const [apiKeys, setApiKeys] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [showFloatingButton, setShowFloatingButton] = useState(false);

  useEffect(() => {
    document.body.classList.remove("dragging");
    chrome.storage.sync.get(["apiKeys"], (result) => {
      setApiKeys(result.apiKeys || []);
    });
    chrome.storage.sync.get(["prompts", "languages"], (result) => {
      if (!result.prompts || !result.languages) {
        fetch(chrome.runtime.getURL("prompts.json"))
          .then((response) => response.json())
          .then((data) => {
            setPrompts(data.prompts || []);
            setLanguages(data.languages || []);
            chrome.storage.sync.set({
              prompts: data.prompts,
              languages: data.languages,
            });
          });
      } else {
        setPrompts(result.prompts);
        setLanguages(result.languages);
      }
    });
    chrome.storage.sync.get({ showFloatingButton: false }, (res) => {
      setShowFloatingButton(!!res.showFloatingButton);
    });
  }, []);

  function handleDragStart() {
    document.body.classList.add("dragging");
  }

  function handleDragEnd(result) {
    document.body.classList.remove("dragging");
    if (!result.destination) return;
    const { source, destination, type } = result;
    if (
      source.index === destination.index &&
      source.droppableId === destination.droppableId
    ) {
      return;
    }
    if (type === "apiKeys") {
      const reordered = reorder(apiKeys, source.index, destination.index);
      saveApiKeys(reordered);
    } else if (type === "prompts") {
      const reordered = reorder(prompts, source.index, destination.index);
      savePrompts(reordered);
    } else if (type === "languages") {
      const reordered = reorder(languages, source.index, destination.index);
      saveLanguages(reordered);
    }
  }

  function handleShowFloatingButtonChange(e) {
    const newVal = e.target.checked;
    setShowFloatingButton(newVal);
    chrome.storage.sync.set({ showFloatingButton: newVal });
  }

  function saveApiKeys(newApiKeys) {
    setApiKeys(newApiKeys);
    chrome.storage.sync.set({ apiKeys: newApiKeys });
  }

  function addApiKey() {
    const newKey = {
      name: `API Key ${Date.now()}`,
      key: "",
      model: "gpt-3.5-turbo",
    };
    saveApiKeys([...apiKeys, newKey]);
  }

  function updateApiKey(index, field, value) {
    const updated = [...apiKeys];
    updated[index][field] = value;
    saveApiKeys(updated);
  }

  function deleteApiKey(index) {
    const updated = [...apiKeys];
    updated.splice(index, 1);
    saveApiKeys(updated);
  }

  function savePrompts(newPrompts) {
    setPrompts(newPrompts);
    chrome.storage.sync.set({ prompts: newPrompts });
  }

  function addPrompt() {
    const defaultKey = apiKeys[0]?.name || "";
    const newPrompt = {
      name: "New Prompt",
      systemContent: "",
      apiKeyName: defaultKey,
    };
    savePrompts([...prompts, newPrompt]);
  }

  function updatePrompt(index, field, value) {
    const updated = [...prompts];
    updated[index][field] = value;
    savePrompts(updated);
  }

  function deletePrompt(index) {
    const updated = [...prompts];
    updated.splice(index, 1);
    savePrompts(updated);
  }

  function saveLanguages(newLanguages) {
    setLanguages(newLanguages);
    chrome.storage.sync.set({ languages: newLanguages });
  }

  function addLanguage() {
    saveLanguages([...languages, "New Language"]);
  }

  function updateLanguage(index, value) {
    const updated = [...languages];
    updated[index] = value;
    saveLanguages(updated);
  }

  function deleteLanguage(index) {
    const updated = [...languages];
    updated.splice(index, 1);
    saveLanguages(updated);
  }

  return (
    <div className="settings-container">
      <h1>
        <FaCog className="header-icon" />
        Extension Settings
      </h1>

      <div className="section">
        <h2>General Settings</h2>
        <label>
          <input
            type="checkbox"
            checked={showFloatingButton}
            onChange={handleShowFloatingButtonChange}
          />
          Show floating button
        </label>
      </div>

      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="section">
          <h2>
            <FaKey style={{ marginRight: 8 }} />
            API Keys
          </h2>
          <button onClick={addApiKey}>Add API Key</button>
          <Droppable droppableId="apiKeysDroppable" type="apiKeys">
            {(provided, snapshot) => (
              <ul
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={snapshot.isDraggingOver ? "draggingOver" : ""}
              >
                {apiKeys.map((item, idx) => (
                  <Draggable
                    key={`${item.name}-${idx}`}
                    draggableId={`${item.name}-${idx}`}
                    index={idx}
                  >
                    {(dragProvided, dragSnapshot) => (
                      <li
                        className="draggableItem"
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        style={{
                          userSelect: "none",
                          ...dragProvided.draggableProps.style,
                        }}
                      >
                        <input
                          className="item-input"
                          type="text"
                          value={item.name}
                          onChange={(e) =>
                            updateApiKey(idx, "name", e.target.value)
                          }
                        />
                        <input
                          className="item-input"
                          type="password"
                          value={item.key}
                          onChange={(e) =>
                            updateApiKey(idx, "key", e.target.value)
                          }
                        />
                        <input
                          className="item-input"
                          type="text"
                          value={item.model}
                          onChange={(e) =>
                            updateApiKey(idx, "model", e.target.value)
                          }
                        />
                        <button
                          onClick={() => deleteApiKey(idx)}
                          className="delete-button"
                        >
                          Delete
                        </button>
                      </li>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </div>

        <div className="section">
          <h2>
            <FaListUl style={{ marginRight: 8 }} />
            Prompts
          </h2>
          <button onClick={addPrompt}>Add Prompt</button>
          <Droppable droppableId="promptsDroppable" type="prompts">
            {(provided, snapshot) => (
              <ul
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={snapshot.isDraggingOver ? "draggingOver" : ""}
              >
                {prompts.map((p, idx) => (
                  <Draggable
                    key={`${p.name}-${idx}`}
                    draggableId={`${p.name}-${idx}`}
                    index={idx}
                  >
                    {(dragProvided, dragSnapshot) => (
                      <li
                        className="draggableItem"
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        style={{
                          userSelect: "none",
                          ...dragProvided.draggableProps.style,
                        }}
                      >
                        <input
                          className="item-input"
                          type="text"
                          value={p.name}
                          onChange={(e) =>
                            updatePrompt(idx, "name", e.target.value)
                          }
                        />
                        <textarea
                          rows={3}
                          value={p.systemContent}
                          onChange={(e) =>
                            updatePrompt(idx, "systemContent", e.target.value)
                          }
                        />
                        <select
                          value={p.apiKeyName}
                          onChange={(e) =>
                            updatePrompt(idx, "apiKeyName", e.target.value)
                          }
                        >
                          {apiKeys.map((k, i) => (
                            <option key={i} value={k.name}>
                              {k.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => deletePrompt(idx)}
                          className="delete-button"
                        >
                          Delete
                        </button>
                      </li>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </div>

        <div className="section">
          <h2>
            <FaLanguage style={{ marginRight: 8 }} />
            Languages
          </h2>
          <button onClick={addLanguage}>Add Language</button>
          <Droppable droppableId="languagesDroppable" type="languages">
            {(provided, snapshot) => (
              <ul
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={snapshot.isDraggingOver ? "draggingOver" : ""}
              >
                {languages.map((lang, idx) => (
                  <Draggable
                    key={`${lang}-${idx}`}
                    draggableId={`${lang}-${idx}`}
                    index={idx}
                  >
                    {(dragProvided, dragSnapshot) => (
                      <li
                        className="draggableItem"
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        style={{
                          userSelect: "none",
                          ...dragProvided.draggableProps.style,
                        }}
                      >
                        <input
                          className="item-input"
                          type="text"
                          value={lang}
                          onChange={(e) =>
                            updateLanguage(idx, e.target.value)
                          }
                        />
                        <button
                          onClick={() => deleteLanguage(idx)}
                          className="delete-button"
                        >
                          Delete
                        </button>
                      </li>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </div>
      </DragDropContext>
    </div>
  );
}
