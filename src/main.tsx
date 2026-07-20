// Install a consistent global `Temporal` before anything runs. Schedule-X v4
// reads the global `Temporal`; desktop Chrome may have it natively but the
// Android WebView does not, so we standardize on the polyfill everywhere — and
// crucially it's the SAME `Temporal` our event mapper builds objects with, so
// Schedule-X's `instanceof Temporal.ZonedDateTime` checks pass.
import "temporal-polyfill/global";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
