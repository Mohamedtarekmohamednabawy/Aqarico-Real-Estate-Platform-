import { Eye, EyeOff } from "lucide-react";

/**
 * Reusable form input components with consistent styling
 */

/**
 * Standard text input field with label, icon, and error states
 */
export const InputField = ({ label, value, onChange, error, tokens, icon: Icon, placeholder, type = "text", ...props }) => (
    <div>
        <label style={{ color: tokens.colors.text }} className="block text-sm font-medium mb-2">
            {label}
        </label>
        <div className="relative">
            {Icon && (
                <Icon
                    size={20}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: tokens.colors.textSub }}
                />
            )}
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                style={{
                    backgroundColor: tokens.colors.bg,
                    color: tokens.colors.text,
                    borderColor: error ? "#ef4444" : tokens.colors.border,
                    paddingLeft: Icon ? "2.75rem" : "1rem",
                }}
                className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-orange-500 transition"
                {...props}
            />
        </div>
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
);

/**
 * Select/dropdown field with label, icon, and error states
 */
export const SelectField = ({ label, value, onChange, error, tokens, icon: Icon, options }) => (
    <div>
        <label style={{ color: tokens.colors.text }} className="block text-sm font-medium mb-2">
            {label}
        </label>
        <div className="relative">
            {Icon && (
                <Icon
                    size={20}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10"
                    style={{ color: tokens.colors.textSub }}
                />
            )}
            <select
                value={value}
                onChange={onChange}
                style={{
                    backgroundColor: tokens.colors.bg,
                    color: tokens.colors.text,
                    borderColor: error ? "#ef4444" : tokens.colors.border,
                    paddingLeft: Icon ? "2.75rem" : "1rem",
                }}
                className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-orange-500 transition cursor-pointer appearance-none"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {/* Custom dropdown arrow */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                    <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: tokens.colors.textSub }} />
                </svg>
            </div>
        </div>
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
);

/**
 * Password input field with show/hide toggle
 */
export const PasswordInput = ({ label, value, onChange, error, show, setShow, tokens }) => (
    <div>
        <label style={{ color: tokens.colors.text }} className="block text-sm font-medium mb-2">
            {label}
        </label>
        <div className="relative">
            <input
                type={show ? "text" : "password"}
                value={value}
                onChange={onChange}
                style={{
                    backgroundColor: tokens.colors.bg,
                    color: tokens.colors.text,
                    borderColor: error ? "#ef4444" : tokens.colors.border,
                    paddingRight: "3rem",
                }}
                className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-orange-500 transition"
            />
            <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70 transition"
                style={{ color: tokens.colors.textSub }}
            >
                {show ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
);
