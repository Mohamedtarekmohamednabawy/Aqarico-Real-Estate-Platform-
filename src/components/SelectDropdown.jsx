import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, Check } from "lucide-react";

const SelectDropdown = ({ value, onChange, options, tokens, placeholder, minWidth = 200, triggerStyle = {} }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);

    const selectedOption = options.find((o) => o.value === value);

    const updatePos = () => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const width = Math.max(rect.width, minWidth);
        const maxLeft = window.scrollX + viewportWidth - width - 8;
        let leftValue = rect.left + window.scrollX;

        leftValue = Math.max(8 + window.scrollX, Math.min(leftValue, maxLeft));

        setPos({
            top: rect.bottom + window.scrollY + 6,
            left: leftValue,
            width: width,
        });
    };

    const handleToggle = () => {
        if (!isOpen) updatePos();
        setIsOpen((prev) => !prev);
    };

    useEffect(() => {
        const handleOutside = (e) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target) &&
                buttonRef.current && !buttonRef.current.contains(e.target)
            ) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const onUpdate = () => updatePos();
        window.addEventListener("scroll", onUpdate, true);
        window.addEventListener("resize", onUpdate);
        return () => {
            window.removeEventListener("scroll", onUpdate, true);
            window.removeEventListener("resize", onUpdate);
        };
    }, [isOpen]);

    const panel = isOpen && createPortal(
        <div
            ref={dropdownRef}
            style={{
                position: "absolute",
                top: pos.top,
                left: pos.left,
                width: Math.max(pos.width, minWidth),
                zIndex: 99999,
                backgroundColor: tokens.colors.surface,
                border: `1px solid ${tokens.colors.border}`,
                borderRadius: 12,
                boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
                overflow: "hidden",
                maxHeight: 280,
                overflowY: "auto",
            }}
        >
            {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                    <button
                        key={opt.value}
                        onClick={() => { onChange(opt.value); setIsOpen(false); }}
                        style={{
                            backgroundColor: isSelected ? tokens.colors.primary + "18" : "transparent",
                            color: isSelected ? tokens.colors.primary : tokens.colors.text,
                            width: "100%",
                            textAlign: "left",
                            padding: "10px 14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            fontSize: 13,
                            fontWeight: isSelected ? 700 : 400,
                            cursor: "pointer",
                            border: "none",
                            borderBottom: `1px solid ${tokens.colors.border}20`,
                            transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = tokens.colors.primary + "0d";
                        }}
                        onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                        }}
                    >
                        <span className="truncate">{opt.label}</span>
                        {isSelected && <Check size={14} style={{ color: tokens.colors.primary, flexShrink: 0 }} />}
                    </button>
                );
            })}
        </div>,
        document.body
    );

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={handleToggle}
                style={{
                    ...triggerStyle,
                    backgroundColor: tokens.colors.surface,
                    color: selectedOption ? tokens.colors.text : tokens.colors.textSub,
                    borderColor: tokens.colors.border,
                    width: "100%",
                    minHeight: 44,
                    padding: "0 12px",
                    borderRadius: 8,
                    borderWidth: 2,
                    borderStyle: "solid",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    fontSize: 14,
                    cursor: "pointer",
                    transition: "opacity 0.15s",
                }}
                className="hover:opacity-80"
            >
                <span className="truncate font-medium">
                    {selectedOption?.label || placeholder}
                </span>
                {isOpen
                    ? <ChevronUp size={16} style={{ color: tokens.colors.textSub, flexShrink: 0 }} />
                    : <ChevronDown size={16} style={{ color: tokens.colors.textSub, flexShrink: 0 }} />
                }
            </button>
            {panel}
        </div>
    );
};

export default SelectDropdown;