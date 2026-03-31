import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./lib/i18n";
import "./styles/index.css";

// Convert title attributes to data-tooltip for instant CSS tooltips
function convertTitles(root: Element) {
  root.querySelectorAll("[title]").forEach((el) => {
    const title = el.getAttribute("title");
    if (title) {
      el.setAttribute("data-tooltip", title);
      el.removeAttribute("title");
    }
  });
}

const observer = new MutationObserver((mutations) => {
  for (const m of mutations) {
    if (m.type === "childList") {
      m.addedNodes.forEach((n) => {
        if (n instanceof Element) convertTitles(n);
      });
    } else if (m.type === "attributes" && m.attributeName === "title" && m.target instanceof Element) {
      const title = m.target.getAttribute("title");
      if (title) {
        m.target.setAttribute("data-tooltip", title);
        m.target.removeAttribute("title");
      }
    }
  }
});
observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["title"] });
convertTitles(document.body);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
