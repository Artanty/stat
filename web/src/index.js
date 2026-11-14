import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { App } from "./App";
import GetUpdates from "./GetUpdates";
import { installFeatGateConfig } from "./feat-gate";
import './style.css';
import '/node_modules/react-grid-layout/css/styles.css';
import '/node_modules/react-resizable/css/styles.css';

// BEFORE anything renders or fetches: the http-gate bundle (app-infra slot) reads this
// global at load time — feature config is build-time data, never a runtime fetch.
installFeatGateConfig();

const root = document.getElementById("root");

ReactDOM.createRoot(root).render(
  <BrowserRouter>
    <Routes>
      <Route index element={<App />} />
      <Route path="/get-updates" element={<GetUpdates />} />
    </Routes>
  </BrowserRouter>
);