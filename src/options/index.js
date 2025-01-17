import React from "react";
import { createRoot } from "react-dom/client";
import Options from "./Options.jsx";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);
root.render(<Options />);
