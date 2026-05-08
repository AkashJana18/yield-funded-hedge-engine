import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Buffer } from "buffer";
import App from "./App";
import { WalletContextProvider } from "./wallet/WalletContextProvider";
import "./index.css";
import "@solana/wallet-adapter-react-ui/styles.css";

(globalThis as typeof globalThis & { Buffer?: typeof Buffer }).Buffer ??= Buffer;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WalletContextProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </WalletContextProvider>
  </React.StrictMode>
);
