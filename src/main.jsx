import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./theme/ThemeProvider";
import { CurrencyProvider } from "./context/CurrencyContext";
import "./index.css";
import "leaflet/dist/leaflet.css";
import "flag-icons/css/flag-icons.min.css";
import { LanguageProvider } from "./i18n/LanguageContext";
import { BrowserRouter } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root")).render(
    <StrictMode>
        <ThemeProvider>
            <LanguageProvider>
                <CurrencyProvider>
                    <BrowserRouter>
                        <App />
                    </BrowserRouter>
                </CurrencyProvider>
            </LanguageProvider>
        </ThemeProvider>
    </StrictMode>
);
