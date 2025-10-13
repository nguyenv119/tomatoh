import React from "react";
import { createRoot } from "react-dom/client";
import { ReminderApp } from "./App";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("root container not found");
}

const root = createRoot(rootElement);
root.render(<ReminderApp />);
