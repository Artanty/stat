import { createRoot } from "react-dom/client";
import { App } from "./App";
import '/node_modules/react-grid-layout/css/styles.css';
import '/node_modules/react-resizable/css/styles.css';
import './style.css';

const container = document.getElementById("root");
const root = createRoot(container)
root.render(<App />);