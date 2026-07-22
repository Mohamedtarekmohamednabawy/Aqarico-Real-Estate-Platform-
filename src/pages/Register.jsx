import { useState, useRef } from "react";
import { User, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import { validatePhoneNumber } from "../data/countries";
import PhoneNumberField from "../components/PhoneNumberField";
import { getPasswordStrength } from "../utils/utils";
import authService from "../services/authService";
import LoadingScreen from "../components/LoadingScreen";
import { useLanguage } from "../i18n/LanguageContext";
import { AnimatedThemeToggler } from "../theme/animated-theme-toggler";

const easeOut = [0.22, 1, 0.36, 1];

const Register = () => {
    const navigate = useNavigate();
    const { themeName, toggleTheme } = useTheme();
    const { t, language } = useLanguage();
    const tokens = designTokens[themeName];
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        username: "",
        email: "",
        password: "",
        country: "EG",
        phone: "",
    });

    const [errors, setErrors] = useState({});
    const [generalError, setGeneralError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const debounceRef = useRef({});

    const validateField = (name, value) => {
        let error = "";

        if (name === "firstName" && !/^[A-Za-z]{2,}$/.test(value)) {
            error = t("profile.errors.firstName");
        } else if (name === "lastName" && !/^[A-Za-z]{2,}$/.test(value)) {
            error = t("profile.errors.lastName");
        } else if (name === "username" && !/^[a-zA-Z0-9_]{3,30}$/.test(value)) {
            error = t("profile.errors.username");
        } else if (
            name === "email" &&
            !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value)
        ) {
            error = t("auth.errors.invalidEmail");
        } else if (name === "password") {
            if (value.length < 8) {
                error = t("auth.passwordMinLength");
            } else {
                const strength = getPasswordStrength(value);
                if (strength.score < 2) {
                    error = t("auth.errors.weakPassword");
                }
            }
        } else if (name === "phone" && value) {
            const validation = validatePhoneNumber(value, form.country);
            if (!validation.valid) {
                error = validation.error;
            }
        }

        setErrors((prev) => ({
            ...prev,
            [name]:
                prev[name] === "This email is already registered." &&
                    name === "email"
                    ? prev[name]
                    : error,
        }));

        return error;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        setErrors((prev) => ({ ...prev, [name]: "" }));
        setForm((prev) => ({ ...prev, [name]: value }));
        setGeneralError("");

        if (debounceRef.current[name]) clearTimeout(debounceRef.current[name]);

        debounceRef.current[name] = setTimeout(() => {
            validateField(name, value);
        }, 500);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const fieldErrors = {};
        Object.entries(form).forEach(([key, val]) => {
            fieldErrors[key] = validateField(key, val);
        });

        const requiredFields = ["firstName", "lastName", "username", "email", "password"];
        const hasEmptyRequired = requiredFields.some((key) => !form[key]);

        if (
            Object.values(fieldErrors).some((err) => err) ||
            hasEmptyRequired
        ) {
            setGeneralError(t("auth.fixErrors"));
            return;
        }

        setIsLoading(true);
        try {
            const result = await authService.register({
                firstName: form.firstName,
                lastName: form.lastName,
                username: form.username,
                email: form.email,
                password: form.password,
                phone: form.phone,
                country: form.country,
            });

            if (result.requiresVerification) {
                navigate("/verify-2fa", { state: { userId: result.userId, step: result.step, isRegister: true } });
                return;
            }

            window.dispatchEvent(new Event("userChanged"));

            setForm({
                firstName: "",
                lastName: "",
                username: "",
                email: "",
                password: "",
                country: "EG",
                phone: "",
            });
            setErrors({});
            setGeneralError("");

            navigate("/");
        } catch (error) {
            const message = error.response?.data?.message || t("auth.errors.regFailed");

            if (message.toLowerCase().includes("phone number")) {
                setErrors((prev) => ({ ...prev, phone: message }));
                setGeneralError(t("auth.errors.checkPhone"));
            } else if (message.toLowerCase().includes("email")) {
                setErrors((prev) => ({ ...prev, email: message }));
                setGeneralError(t("auth.errors.checkEmail"));
            } else if (message.toLowerCase().includes("username")) {
                setErrors((prev) => ({ ...prev, username: message }));
                setGeneralError(t("auth.errors.checkUsername"));
            } else {
                setGeneralError(message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const strength = getPasswordStrength(form.password);

    return (
        <main
            className="auth-shell flex items-center justify-center px-4 py-24"
            style={{
                backgroundColor: tokens.colors.bg,
                color: tokens.colors.text,
                backgroundImage:
                    "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1400&auto=format&fit=crop')",
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

            <LoadingScreen isLoading={isLoading} message={t("auth.creatingAccount")} />

            <motion.section
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.36, ease: easeOut }}
                className="w-full max-w-xl rounded-3xl border p-5 sm:p-6 shadow-2xl md:p-8"
                style={{
                    backgroundColor: tokens.colors.surfaceGlass || tokens.colors.surface,
                    borderColor: tokens.colors.border,
                    boxShadow: tokens.shadows.lg,
                    backdropFilter: "blur(18px) saturate(140%)",
                }}
            >
                <div className="mb-7">
                    <motion.p
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.06, duration: 0.24, ease: easeOut }}
                        className="mb-3 text-sm font-bold uppercase"
                        style={{ color: tokens.colors.primary, letterSpacing: "0.12em" }}
                    >
                        {t("auth.joinAqarico")}
                    </motion.p>
                    <motion.h1
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.3, ease: easeOut }}
                        className="animated-page-title text-4xl font-extrabold tracking-tight"
                        style={{ lineHeight: 1.16 }}
                    >
                        {t("auth.createAccountTitle")}
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.14, duration: 0.3, ease: easeOut }}
                        className="mt-3 text-sm leading-6"
                        style={{ color: tokens.colors.textSub }}
                    >
                        {t("auth.createAccountSubtitle")}
                    </motion.p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <InputField id="firstName" Icon={User} name="firstName" value={form.firstName} onChange={handleChange} label={t("auth.firstName")} error={errors.firstName} tokens={tokens} t={t} />
                        <InputField id="lastName" Icon={User} name="lastName" value={form.lastName} onChange={handleChange} label={t("auth.lastName")} error={errors.lastName} tokens={tokens} t={t} />
                    </div>

                    <InputField id="username" Icon={User} name="username" value={form.username} onChange={handleChange} label={t("auth.username")} error={errors.username} tokens={tokens} t={t} />
                    <InputField id="email" Icon={Mail} name="email" type="email" value={form.email} onChange={handleChange} label={t("auth.email")} error={errors.email} tokens={tokens} t={t} />

                    <PhoneNumberField
                        country={form.country}
                        phone={form.phone}
                        onCountryChange={(countryCode) => {
                            setForm({ ...form, country: countryCode });
                            if (form.phone) {
                                setTimeout(() => validateField("phone", form.phone), 0);
                            }
                        }}
                        onPhoneChange={handleChange}
                        tokens={tokens}
                        error={errors.phone}
                    />

                    <PasswordField
                        id="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        showPassword={showPassword}
                        setShowPassword={setShowPassword}
                        error={errors.password}
                        tokens={tokens}
                        autoComplete="new-password"
                        t={t}
                    />

                    <AnimatePresence>
                        {form.password && (
                            <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.2, ease: easeOut }}
                                className="rounded-xl px-3 py-2"
                                style={{ backgroundColor: "color-mix(in srgb, var(--primary-color) 8%, transparent)" }}
                            >
                                <div className="flex items-center justify-between gap-3 text-sm">
                                    <span style={{ color: tokens.colors.textSub }}>{t("auth.passwordStrength")}</span>
                                    <span style={{ color: strength.color }} className="font-bold">
                                        {strength.label}
                                    </span>
                                </div>
                                <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ backgroundColor: tokens.colors.border }}>
                                    <motion.div
                                        className="h-full rounded-full"
                                        initial={false}
                                        animate={{ width: `${strength.width}%` }}
                                        transition={{ duration: 0.22, ease: easeOut }}
                                        style={{ backgroundColor: strength.color }}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

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

                    <motion.button
                        type="submit"
                        disabled={isLoading}
                        whileHover={{ y: -1, scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.16, ease: easeOut }}
                        className="premium-focus flex min-h-12 w-full items-center justify-center gap-2 rounded-xl font-bold shadow-lg transition-opacity disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
                        style={{ backgroundColor: tokens.colors.primary, color: tokens.colors.surface }}
                    >
                        {t("auth.register")}
                        <ArrowRight size={18} className={language === 'ar' ? 'rotate-180' : ''} />
                    </motion.button>
                </form>

                <p className="mt-6 text-center text-sm" style={{ color: tokens.colors.textSub }}>
                    {t("auth.alreadyHaveAccount")}{" "}
                    <Link to="/login" className="premium-focus rounded-md font-bold hover:underline" style={{ color: tokens.colors.primary }}>
                        {t("auth.login")}
                    </Link>
                </p>
            </motion.section>
        </main>
    );
};

const FieldShell = ({ children, error, tokens }) => (
    <motion.div
        animate={error ? { x: [-4, 4, -2, 0] } : { x: 0 }}
        transition={{ duration: 0.22, ease: easeOut }}
    >
        {children}
        <AnimatePresence>
            {error && (
                <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: easeOut }}
                    className="text-sm font-semibold mt-1"
                    style={{ color: tokens.colors.error || "#ef4444" }}
                >
                    {error}
                </motion.p>
            )}
        </AnimatePresence>
    </motion.div>
);

const InputField = ({ Icon, label, error, id, tokens, ...props }) => (
    <FieldShell error={error} tokens={tokens}>
        <label htmlFor={id} className="block text-sm font-bold mb-2" style={{ color: tokens.colors.text }}>
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
    error,
    showPassword,
    setShowPassword,
    id,
    tokens,
    t,
    ...props
}) => (
    <FieldShell error={error} tokens={tokens}>
        <label htmlFor={id} className="block text-sm font-bold mb-2" style={{ color: tokens.colors.text }}>
            {t("auth.password")}
        </label>
        <div className="relative">
            <Lock className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2" size={19} style={{ color: tokens.colors.textSub }} />
            <input
                id={id}
                {...props}
                type={showPassword ? "text" : "password"}
                className="premium-focus min-h-12 w-full rounded-xl border-2 ps-11 pe-12 text-base outline-none transition-all placeholder:opacity-60"
                style={{
                    backgroundColor: tokens.colors.bg,
                    borderColor: error ? "#ef4444" : tokens.colors.border,
                    color: tokens.colors.text,
                }}
                placeholder={t("auth.password")}
                required
            />
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="premium-focus absolute end-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg transition hover:bg-[color-mix(in_srgb,var(--primary-color)_12%,transparent)] cursor-pointer"
                style={{ color: tokens.colors.textSub }}
                aria-label={t("auth.password")}
            >
                {showPassword ? <Eye size={19} /> : <EyeOff size={19} />}
            </button>
        </div>
    </FieldShell>
);

export default Register;