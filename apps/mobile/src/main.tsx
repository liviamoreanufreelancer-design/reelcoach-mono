/**
 * main.tsx — SPA entry point for Capacitor (iOS/Android) builds.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppContext } from "./router";
import { App as CapApp } from "@capacitor/app";

// Import CSS directly — in SPA mode the ?url import in __root.tsx
// is ignored (no SSR head injection). This ensures Tailwind + custom
// vars load correctly inside the Capacitor WKWebView.
import "./styles.css";

// iOS 26.5 WKWebView: un listener global "selectionchange" (adaugat de o
// biblioteca UI) blocheaza complet procesul WebContent la prima tasta intr-un
// input. Blocam inregistrarea lui pe document inainte sa monteze React.
// selectionchange nu e necesar pentru UX-ul mobil al app-ului.
const _origAdd = document.addEventListener.bind(document);
document.addEventListener = function (
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
) {
  if (type === "selectionchange") return;
  return _origAdd(type, listener, options);
} as typeof document.addEventListener;

const { router, queryClient } = createAppContext();

// Android hardware back button — navigate back or exit app.
CapApp.addListener("backButton", ({ canGoBack }) => {
  if (canGoBack) {
    router.history.back();
  } else {
    CapApp.exitApp();
  }
});

const container = document.getElementById("root");
if (!container) throw new Error("Root element #root not found");

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
