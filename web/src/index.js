import { createRoot } from "react-dom/client";
import { App } from "./App";
import GetUpdates from "./GetUpdates";
import '/node_modules/react-grid-layout/css/styles.css';
import '/node_modules/react-resizable/css/styles.css';
import './style.css';
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";

const root = document.getElementById("root");

ReactDOM.createRoot(root).render(
  <BrowserRouter>
    <Routes>
      <Route index element={<App />} />
      <Route path="/get-updates" element={<GetUpdates />} />
    </Routes>
  </BrowserRouter>
);