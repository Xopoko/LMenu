// src/content/content.js

import { initUI } from "../common/ui";
import { addSelectionListener } from "../common/utils";

(async () => {
  "use strict";

  await initUI();
  addSelectionListener();
})();
