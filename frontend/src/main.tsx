import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import App from "./App";
import "tailwindcss/index.css";
import { ui } from "./styles";
import { LanguageProvider } from "./i18n/LanguageContext";

document.body.className = ui("app-body");

const usesFileProtocol = window.location.protocol === "file:";

// Conserve les anciens favoris "#/..." tout en basculant vers les URL propres.
if (!usesFileProtocol && window.location.hash.startsWith("#/")) {
  window.history.replaceState(window.history.state, "", window.location.hash.slice(1));
}

const ApplicationRouter = usesFileProtocol ? MemoryRouter : BrowserRouter;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <ApplicationRouter>
        <App />
      </ApplicationRouter>
    </LanguageProvider>
  </StrictMode>
);
