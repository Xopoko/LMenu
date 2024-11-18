// src/content/content.js

import { initUI } from "../common/ui";
import { addSelectionListener } from "../common/utils";
// import { addMessageListener } from "../common/api";

(async () => {
	"use strict";

	await initUI();
	addSelectionListener();
})();
