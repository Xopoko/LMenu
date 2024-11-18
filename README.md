# LMenu Chrome Extension

**LMenu** is a Chrome extension that enhances your browsing experience by allowing you to interact with LLM models directly from any webpage. Select any text, and get immediate improvements, translations, or code explanations with a single click.

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/LMenu_Chrome_Extension.git
cd LMenu_Chrome_Extension
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Extension

```bash
npm run build
```

This will compile the source code using Webpack and output the bundled files into the `dist` directory.

## Adding the Extension to Chrome

### 1. Open Chrome Extensions Page

Navigate to `chrome://extensions/` in your Chrome browser.

### 2. Enable Developer Mode

Toggle the **Developer mode** switch in the top right corner of the page.

### 3. Load the Unpacked Extension

- Click on the **Load unpacked** button.
- In the file dialog, navigate to the `LMenu_Chrome_Extension` directory.
- Select the directory and click **Open**.

The extension should now appear in your list of installed extensions.

### 4. Configure the Extension

- Click on the **Extensions** icon in the Chrome toolbar.
- Find **LMenu** in the list and click on the **Options** link.
- In the options page, add your OpenAI API keys, prompts, and preferred languages.

## Contributing

Contributions are welcome! Please fork the repository and create a pull request with your changes.

## License

This project is licensed under the MIT License.
