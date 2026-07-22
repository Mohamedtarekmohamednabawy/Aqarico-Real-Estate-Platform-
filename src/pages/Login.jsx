import { useState, useRef } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import authService from "../services/authService";
import LoadingScreen from "../components/LoadingScreen";
import { useLanguage } from "../i18n/LanguageContext";
import { AnimatedThemeToggler } from "../theme/animated-theme-toggler";

const easeOut = [0.22, 1, 0.36, 1];

const Login = () => {
    const navigate = useNavigate();
    const { themeName, toggleTheme } = useTheme();
    const { t, language } = useLanguage();
    const tokens = designTokens[themeName];
    const [form, setForm] = useState({ loginIdentifier: "", password: "" });
    const [errors, setErrors] = useState({});
    const [generalError, setGeneralError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const debounceRef = useRef({});

    const validateField = (name, value) => {
        let error = "";
        if (!value) {
            error = name === "loginIdentifier" ? t("auth.identifierRequired") : t("auth.passwordRequired");
        } else if (name === "password" && value.length < 8) {
            error = t("auth.passwordMinLength");
        }
        setErrors((prev) => ({ ...prev, [name]: error }));
        return error;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setErrors((prev) => ({ ...prev, [name]: "" }));
        setForm((prev) => ({ ...prev, [name]: value }));

        if (debounceRef.current[name]) clearTimeout(debounceRef.current[name]);
        debounceRef.current[name] = setTimeout(() => {
            validateField(name, value);
        }, 500);

        setGeneralError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const identifierError = validateField("loginIdentifier", form.loginIdentifier);
        const passwordError = validateField("password", form.password);

        if (identifierError || passwordError) {
            setGeneralError(t("auth.fixErrors"));
            return;
        }

        setIsLoading(true);
        try {
            const result = await authService.login(form.loginIdentifier, form.password);

            if (result.requiresVerification) {
                navigate("/verify-2fa", { state: { userId: result.userId, step: result.step } });
                return;
            }

            window.dispatchEvent(new Event("userChanged"));

            setForm({ loginIdentifier: "", password: "" });
            setErrors({});
            setGeneralError("");

            navigate("/");
        } catch (error) {
            const message = error.response?.data?.message || t("auth.errors.regFailed");
            setGeneralError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main
            className="auth-shell flex items-center justify-center px-4 py-24"
            style={{
                backgroundColor: tokens.colors.bg,
                color: tokens.colors.text,
                backgroundImage:
                    "url('https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&q=70&w=1400')",
            }}
        >
            <div className="absolute top-6 right-6 lg:top-10 lg:right-10 z-[100] flex items-center justify-center min-h-11 min-w-11">
                <AnimatedThemeToggler
                    fromCenter={true}
                    checked={themeName === "dark"}
                    onCheckedChange={toggleTheme}
                    className="cursor-pointer hover:scale-110 transition-transform"
                />
            </div>

            <LoadingScreen isLoading={isLoading} message={t("auth.loggingIn")} />

            <motion.section
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.36, ease: easeOut }}
                className="w-full max-w-md rounded-3xl border p-5 sm:p-7 shadow-2xl md:p-9"
                style={{
                    backgroundColor: tokens.colors.surfaceGlass || tokens.colors.surface,
                    borderColor: tokens.colors.border,
                    boxShadow: tokens.shadows.lg,
                    backdropFilter: "blur(18px) saturate(140%)",
                }}
            >
                <div className="mb-8">
                    <motion.p
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.06, duration: 0.24, ease: easeOut }}
                        className="mb-3 text-sm font-bold uppercase"
                        style={{ color: tokens.colors.primary, letterSpacing: "0.12em" }}
                    >
                        {t("auth.welcomeBack")}
                    </motion.p>
                    <motion.h1
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.3, ease: easeOut }}
                        className="animated-page-title text-4xl font-extrabold tracking-tight"
                        style={{ lineHeight: 1.16 }}
                    >
                        {t("auth.signInTitle")}
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.14, duration: 0.3, ease: easeOut }}
                        className="mt-3 text-sm leading-6"
                        style={{ color: tokens.colors.textSub }}
                    >
                        {t("auth.signInSubtitle")}
                    </motion.p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                    <InputField
                        id="loginIdentifier"
                        icon={Mail}
                        name="loginIdentifier"
                        label={t("auth.emailOrUsername")}
                        value={form.loginIdentifier}
                        onChange={handleChange}
                        error={errors.loginIdentifier}
                        tokens={tokens}
                    />

                    <PasswordField
                        id="password"
                        name="password"
                        label={t("auth.password")}
                        value={form.password}
                        onChange={handleChange}
                        showPassword={showPassword}
                        setShowPassword={setShowPassword}
                        error={errors.password}
                        tokens={tokens}
                        autoComplete="current-password"
                    />

                    <AnimatePresence mode="wait">
                        {generalError && (
                            <motion.p
                                initial={{ opacity: 0, height: 0, y: -10 }}
                                animate={{ opacity: 1, height: "auto", y: 0 }}
                                exit={{ opacity: 0, height: 0, y: -10 }}
                                transition={{ duration: 0.25, ease: easeOut }}
                                className="rounded-xl border px-4 py-3 text-center text-sm font-semibold overflow-hidden"
                                style={{
                                    color: "#b91c1c",
                                    backgroundColor: "color-mix(in srgb, #ef4444 10%, transparent)",
                                    borderColor: "color-mix(in srgb, #ef4444 28%, transparent)",
                                }}
                            >
                                {generalError}
                            </motion.p>
                        )}
                    </AnimatePresence>

                    <div className="flex justify-end mt-1">
                        <Link
                            to="/forgot-password"
                            className="text-sm font-semibold hover:underline"
                            style={{ color: tokens.colors.primary }}
                        >
                            {t("auth.forgotPassword") || "Forgot Password?"}
                        </Link>
                    </div>

                    <motion.button
                        type="submit"
                        disabled={isLoading}
                        whileHover={{ y: -1, scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.16, ease: easeOut }}
                        className="premium-focus flex min-h-12 w-full items-center justify-center gap-2 rounded-xl font-bold shadow-lg transition-opacity disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
                        style={{
                            backgroundColor: tokens.colors.primary,
                            color: tokens.colors.surface,
                        }}
                    >
                        {t("auth.login")}
                        <ArrowRight size={18} className={language === 'ar' ? 'rotate-180' : ''} />
                    </motion.button>
                </form>

                <p className="mt-6 text-center text-sm" style={{ color: tokens.colors.textSub }}>
                    {t("auth.noAccount")}{" "}
                    <Link
                        to="/register"
                        className="premium-focus rounded-md font-bold hover:underline"
                        style={{ color: tokens.colors.primary }}
                    >
                        {t("auth.register")}
                    </Link>
                </p>
            </motion.section>
        </main>
    );
};

export default Login;

const FieldShell = ({ children, error, tokens }) => (
    <motion.div
        animate={error ? { x: [-4, 4, -2, 0] } : { x: 0 }}
        transition={{ duration: 0.22, ease: easeOut }}
        className="space-y-1.5"
    >
        {children}
        <AnimatePresence>
            {error && (
                <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: easeOut }}
                    className="text-sm font-semibold"
                    style={{ color: tokens.colors.error || "#ef4444" }}
                >
                    {error}
                </motion.p>
            )}
        </AnimatePresence>
    </motion.div>
);

const InputField = ({ id, icon: Icon, label, error, tokens, ...props }) => (
    <FieldShell error={error} tokens={tokens}>
        <label htmlFor={id} className="text-sm font-bold" style={{ color: tokens.colors.text }}>
            {label}
        </label>
        <div className="relative">
            <Icon className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2" size={19} style={{ color: tokens.colors.textSub }} />
            <input
                id={id}
                {...props}
                className="premium-focus min-h-12 w-full rounded-xl border-2 ps-11 pe-4 text-base outline-none transition-all placeholder:opacity-60"
                style={{
                    backgroundColor: tokens.colors.bg,
                    borderColor: error ? "#ef4444" : tokens.colors.border,
                    color: tokens.colors.text,
                }}
                placeholder={label}
                required
            />
        </div>
    </FieldShell>
);

const PasswordField = ({
    id,
    label,
    value,
    error,
    showPassword,
    setShowPassword,
    tokens,
    ...props
}) => (
    <FieldShell error={error} tokens={tokens}>
        <label htmlFor={id} className="text-sm font-bold" style={{ color: tokens.colors.text }}>
            {label}
        </label>
        <div className="relative">
            <Lock className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2" size={19} style={{ color: tokens.colors.textSub }} />
            <input
                id={id}
                {...props}
                type={showPassword ? "text" : "password"}
                value={value}
                className="premium-focus min-h-12 w-full rounded-xl border-2 ps-11 pe-12 text-base outline-none transition-all placeholder:opacity-60"
                style={{
                    backgroundColor: tokens.colors.bg,
                    borderColor: error ? "#ef4444" : tokens.colors.border,
                    color: tokens.colors.text,
                }}
                placeholder={label}
                required
            />
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="premium-focus absolute end-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg transition hover:bg-[color-mix(in_srgb,var(--primary-color)_12%,transparent)] cursor-pointer"
                style={{ color: tokens.colors.textSub }}
                aria-label={label}
            >
                {showPassword ? <Eye size={19} /> : <EyeOff size={19} />}
            </button>
        </div>
    </FieldShell>
);
