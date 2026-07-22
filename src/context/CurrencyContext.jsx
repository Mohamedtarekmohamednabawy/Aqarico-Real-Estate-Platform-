import { createContext, useContext, useState, useEffect } from "react";
import authService from "../services/authService";
import { useLanguage } from "../i18n/LanguageContext";

const CurrencyContext = createContext();

export const currencies = {
    EGP: { symbol: "EGP", rate: 1, step: 100000, name: "Egyptian Pound" },
    USD: { symbol: "$", rate: 0.032, step: 5000, name: "US Dollar" },
    EUR: { symbol: "€", rate: 0.030, step: 5000, name: "Euro" },
    GBP: { symbol: "£", rate: 0.026, step: 5000, name: "British Pound" },
    SAR: { symbol: "SAR", rate: 0.12, step: 10000, name: "Saudi Riyal" },
    AED: { symbol: "AED", rate: 0.12, step: 10000, name: "UAE Dirham" },
    JPY: { symbol: "¥", rate: 4.8, step: 500000, name: "Japanese Yen" },
    CNY: { symbol: "¥", rate: 0.23, step: 20000, name: "Chinese Yuan" },
    KWD: { symbol: "KWD", rate: 0.0098, step: 3000, name: "Kuwaiti Dinar" },
    QAR: { symbol: "QAR", rate: 0.12, step: 10000, name: "Qatari Riyal" },
    TRY: { symbol: "₺", rate: 1.1, step: 150000, name: "Turkish Lira" },
    CAD: { symbol: "C$", rate: 0.045, step: 6000, name: "Canadian Dollar" },
};

export const CurrencyProvider = ({ children }) => {
    const [currency, setCurrencyState] = useState(() => {
        const user = authService.getCurrentUser();
        if (user && user.currency) return user.currency;

        const userId = user?._id || "guest";
        return localStorage.getItem(`currency_${userId}`) || "EGP";
    });

    const setCurrency = (newCurrency) => {
        setCurrencyState(newCurrency);
        const currentUser = authService.getCurrentUser();
        const userId = currentUser?._id || "guest";
        localStorage.setItem(`currency_${userId}`, newCurrency);

        if (authService.isLoggedIn()) {
            authService.updateSettings({ currency: newCurrency }).catch(err => {
                console.error("Failed to sync currency to backend:", err);
            });
        }
    };

    // Update currency when user logs in/out or settings are synced
    useEffect(() => {
        const handleUserChange = () => {
            const currentUser = authService.getCurrentUser();
            if (currentUser && currentUser.currency && currentUser.currency !== currency) {
                setCurrencyState(currentUser.currency);
                localStorage.setItem(`currency_${currentUser._id}`, currentUser.currency);
            }
        };

        window.addEventListener("userChanged", handleUserChange);
        window.addEventListener("storage", handleUserChange);

        return () => {
            window.removeEventListener("userChanged", handleUserChange);
            window.removeEventListener("storage", handleUserChange);
        };
    }, [currency]);

    const convertPrice = (priceInEGP) => {
        if (!priceInEGP) return 0;
        const rate = currencies[currency].rate;
        return Math.round(priceInEGP * rate);
    };

    const { t } = useLanguage();

    const formatPrice = (priceInEGP) => {
        if (priceInEGP === null || priceInEGP === undefined) return "";
        const converted = convertPrice(priceInEGP);
        const currencyData = currencies[currency];

        // Localized symbol/name (e.g. "جنيه مصري" or "EGP")
        const label = t(`currency.${currency}`);
        const displayLabel = label.includes(".") ? label : label; // Placeholder for logic if needed

        return new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(converted) + " " + (label === `currency.${currency}` ? currencyData.symbol : label);
    };

    const getStep = () => {
        return currencies[currency].step;
    };

    const convertToEGP = (priceInSelectedCurrency) => {
        if (!priceInSelectedCurrency) return 0;
        const rate = currencies[currency].rate;
        return Math.round(priceInSelectedCurrency / rate);
    };

    return (
        <CurrencyContext.Provider value={{
            currency,
            setCurrency,
            convertPrice,
            formatPrice,
            convertToEGP,
            getStep,
            currencies
        }}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (!context) {
        throw new Error("useCurrency must be used within CurrencyProvider");
    }
    return context;
};
