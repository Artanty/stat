import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { App, MiniApp } from "./App";
import { installFeatGateConfig } from "./feat-gate";
import './style.css';

// BEFORE anything renders or fetches: the http-gate bundle (app-infra slot) reads this
// global at load time — feature configuration is build-time data, never a runtime fetch.
installFeatGateConfig();

const root = document.getElementById("root");

ReactDOM.createRoot(root).render(
  <BrowserRouter>
    <Routes>
      <Route index element={<App />} />
      <Route path="/mini" element={<MiniApp />} />
    </Routes>
  </BrowserRouter>
);
