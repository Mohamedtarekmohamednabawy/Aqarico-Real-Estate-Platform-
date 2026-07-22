import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";

const StyledNumberInput = ({
    value,
    onChange,
    min = 0,
    max = 1000000000,
    step = 1,
    placeholder,
    tokens,
    name,
    required = false,
    className = ""
}) => {
    const { language } = useLanguage();
    // local display state (formatted with commas)
    const [display, setDisplay] = useState("");

    // helper: convert any incoming value -> numeric string without commas
    const toNumericString = (v) => {
        if (v === "" || v === null || v === undefined) return "";
        // if it's a number, convert to string
        const s = typeof v === "number" ? String(v) : v;
        // remove non-digits
        const digits = s.toString().replace(/[^\d-]/g, "");
        if (digits === "") return "";
        // Trim leading zeros properly via Number
        const n = Number(digits);
        return Number.isNaN(n) ? "" : String(n);
    };

    // helper: format numeric string with commas
    const formatWithCommas = (numericString) => {
        if (numericString === "" || numericString == null) return "";
        const n = Number(numericString);
        if (Number.isNaN(n)) return "";
        return n.toLocaleString("en-US");
    };

    // Keep display in sync with incoming value prop
    useEffect(() => {
        const numeric = toNumericString(value);
        setDisplay(formatWithCommas(numeric));
    }, [value]);

    // Emit change back to parent as numeric string (no commas)
    const emitChange = (numericString) => {
        // Call onChange with event-like object so existing handlers work
        if (typeof onChange === "function") {
            onChange({ target: { name, value: numericString } });
        }
    };

    // When user types in the input
    const [inputValue, setInputValue] = useState("");

    useEffect(() => {
        setInputValue(toNumericString(value));
    }, [value]);

    const handleInputChange = (e) => {
        const raw = e.target.value;
        const numeric = raw.replace(/[^\d]/g, "");

        // Update display immediately for better UX
        setInputValue(numeric);
        setDisplay(formatWithCommas(numeric));
    };

    // When the user leaves the input, enforce min/max bounds seamlessly
    const handleBlur = (e) => {
        const raw = e.target.value;
        const numeric = raw.replace(/[^\d]/g, "");
        if (numeric !== "") {
            let n = Number(numeric);
            // Enforce hard bounds on blur
            if (n > max) n = max;
            if (n < min) n = min;
            const clampedStr = String(n);
            setInputValue(clampedStr);
            setDisplay(formatWithCommas(clampedStr));
            emitChange(clampedStr);
        }
    };

    // Handle Enter key
    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            const numeric = inputValue.replace(/[^\d]/g, "");
            if (numeric !== "") {
                let n = Number(numeric);
                if (n > max) n = max;
                if (n < min) n = min;
                const clampedStr = String(n);
                setInputValue(clampedStr);
                setDisplay(formatWithCommas(clampedStr));
                emitChange(clampedStr);
            }
            e.target.blur();
        }
    };

    // Increment / Decrement handlers
    const handleIncrement = () => {
        const current = toNumericString(value) === "" ? 0 : Number(toNumericString(value));
        const newVal = Math.min(current + step, max);
        setInputValue(String(newVal));
        setDisplay(formatWithCommas(String(newVal)));
        emitChange(String(newVal));
    };

    const handleDecrement = () => {
        const current = toNumericString(value) === "" ? 0 : Number(toNumericString(value));
        const newVal = Math.max(current - step, min);
        setInputValue(String(newVal));
        setDisplay(formatWithCommas(String(newVal)));
        emitChange(String(newVal));
    };

    return (
        <div className={`relative flex items-center ${className}`}>
            <style>
                {`
          /* Hide default browser spinners for numeric look */
          input::-webkit-outer-spin-button,
          input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          input {
            -moz-appearance: textfield;
          }
        `}
            </style>

            <input
                type="text"
                name={name}
                inputMode="numeric"
                pattern="[0-9,]*"
                value={display}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                required={required}
                placeholder={placeholder}
                style={{
                    backgroundColor: tokens?.colors?.bg ?? "white",
                    color: tokens?.colors?.text ?? "black",
                    borderColor: tokens?.colors?.border ?? "#e5e7eb",
                }}
                className={`w-full px-4 py-2.5 ${language === 'ar' ? 'pl-10' : 'pr-10'} rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all`}
            />

            {/* Custom Spinners */}
            <div className={`absolute ${language === 'ar' ? 'left-1' : 'right-1'} flex flex-col gap-0.5`}>
                <button
                    onClick={handleIncrement}
                    type="button"
                    className="p-0.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                    disabled={toNumericString(value) !== "" && Number(toNumericString(value)) >= max}
                    tabIndex={-1}
                    aria-label="increment"
                >
                    <ChevronUp size={14} />
                </button>
                <button
                    onClick={handleDecrement}
                    type="button"
                    className="p-0.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                    disabled={toNumericString(value) !== "" && Number(toNumericString(value)) <= min}
                    tabIndex={-1}
                    aria-label="decrement"
                >
                    <ChevronDown size={14} />
                </button>
            </div>
        </div>
    );
};

export default StyledNumberInput;
