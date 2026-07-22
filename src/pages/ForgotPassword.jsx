import { useState } from "react";
import { Mail, Lock, Key, ArrowRight, Smartphone, MoveLeft, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import authService from "../services/authService";
import LoadingScreen from "../components/LoadingScreen";
import { useLanguage } from "../i18n/LanguageContext";
import { AnimatedThemeToggler } from "../theme/animated-theme-toggler";

const easeOut = [0.22, 1, 0.36, 1];

const ForgotPassword = () => {
    const navigate = useNavigate();
    const { themeName, toggleTheme } = useTheme();
    const { t, language } = useLanguage();
    const tokens = designTokens[themeName];

    const [step, setStep] = useState(1); // 1: Request Code, 2: Choose Method, 3: Reset Password
    const [form, setForm] = useState({ loginIdentifier: "", code: "", newPassword: "", confirmPassword: "" });
    const [errors, setErrors] = useState({});
    const [generalError, setGeneralError] = useState("");
    const [generalSuccess, setGeneralSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [foundUsers, setFoundUsers] = useState([]);

    // Validate inputs
    const validateField = (name, value) => {
        let error = "";
        if (!value) {
            if (name === "loginIdentifier") error = t("auth.identifierRequired");
            else if (name === "code") error = t("auth.codeRequired") || "Verification code is required";
            else if (name === "newPassword") error = t("auth.passwordRequired");
            else if (name === "confirmPassword") error = "Please confirm your password.";
        } else if (name === "newPassword" && value.length < 8) {
            error = t("auth.passwordMinLength");
        } else if (name === "confirmPassword" && value !== form.newPassword) {
            error = "Passwords do not match.";
        }
        setErrors((prev) => ({ ...prev, [name]: error }));
        return error;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setErrors((prev) => ({ ...prev, [name]: "" }));
        setForm((prev) => ({ ...prev, [name]: value }));
        setGeneralError("");
        setGeneralSuccess("");
    };

    const handleCheckIdentifier = async (e) => {
        e.preventDefault();
        const identifierError = validateField("loginIdentifier", form.loginIdentifier);
        if (identifierError) {
            setGeneralError(t("auth.fixErrors"));
            return;
        }

        setIsLoading(true);
        try {
            const result = await authService.checkIdentifier(form.loginIdentifier);
            if (result.success && result.users) {
                if (result.users.length === 1) {
                    setForm(prev => ({ ...prev, loginIdentifier: result.users[0].username }));
                    setStep(2);
                } else {
                    setFoundUsers(result.users);
                    setStep(1.5);
                }
            }
        } catch (error) {
            setGeneralError(error.response?.data?.message || "Account not found.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRequestCode = async (method = 'email') => {
        const identifierError = validateField("loginIdentifier", form.loginIdentifier);
        if (identifierError) {
            setGeneralError(t("auth.fixErrors"));
            return;
        }

        setIsLoading(true);
        try {
            const result = await authService.requestPasswordReset(form.loginIdentifier, method);
            if (result.success) {
                setGeneralSuccess(result.message);
                setStep(3); // Move to enter code & reset password
            }
        } catch (error) {
            setGeneralError(error.response?.data?.message || "Failed to send reset code.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        const codeError = validateField("code", form.code);
        const passError = validateField("newPassword", form.newPassword);
        const confirmError = validateField("confirmPassword", form.confirmPassword);

        if (codeError || passError || confirmError) {
            setGeneralError(t("auth.fixErrors"));
            return;
        }

        setIsLoading(true);
        try {
            const result = await authService.resetPassword(form.loginIdentifier, form.code, form.newPassword);
            if (result.success) {
                setGeneralSuccess(result.message);
                setTimeout(() => navigate('/login'), 2000);
            }
        } catch (error) {
            setGeneralError(error.response?.data?.message || "Failed to reset password.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main
            className="auth-shell flex items-center justify-center px-4 py-24 min-h-screen"
            style={{
                backgroundColor: tokens.colors.bg,
                color: tokens.colors.text,
                backgroundImage: "url('https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&q=70&w=1400')",
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

            <LoadingScreen isLoading={isLoading} message={t("common.loading") || "Please wait..."} />

            <motion.section
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.36, ease: easeOut }}
                className="w-full max-w-md rounded-3xl border p-7 shadow-2xl md:p-9 relative"
                style={{
                    backgroundColor: tokens.colors.surfaceGlass || tokens.colors.surface,
                    borderColor: tokens.colors.border,
                    boxShadow: tokens.shadows.lg,
                    backdropFilter: "blur(18px) saturate(140%)",
                }}
            >
                <div className="mb-8">
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 mb-6 text-sm font-semibold transition hover:opacity-70"
                        style={{ color: tokens.colors.textSub }}
                    >
                        <MoveLeft size={16} className={language === 'ar' ? 'rotate-180' : ''} />
                        {t("auth.backToLogin") || "Back to Login"}
                    </Link>

                    <motion.h1
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.3, ease: easeOut }}
                        className="animated-page-title text-4xl font-extrabold tracking-tight"
                        style={{ lineHeight: 1.16 }}
                    >
                        {t("auth.forgotPassword") || "Recover Password"}
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.14, duration: 0.3, ease: easeOut }}
                        className="mt-3 text-sm leading-6"
                        style={{ color: tokens.colors.textSub }}
                    >
                        {step === 1 ? (t("auth.forgotPasswordSubtitle") || "Enter your email, username, or phone to choose a recovery method.") :
                            step === 1.5 ? "Multiple accounts found. Please select yours:" :
                                step === 2 ? "How would you like to receive the code?" :
                                    step === 3 ? "Enter the 6-digit verification code." :
                                        "Enter your new password."}
                    </motion.p>
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.form
                            key="step-1"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-5"
                            onSubmit={handleCheckIdentifier}
                        >
                            <InputField
                                id="loginIdentifier"
                                icon={Mail}
                                name="loginIdentifier"
                                label={"Email, Username, or Phone"}
                                value={form.loginIdentifier}
                                onChange={handleChange}
                                error={errors.loginIdentifier}
                                tokens={tokens}
                            />

                            <motion.button
                                type="submit"
                                whileHover={{ y: -1, scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                className="premium-focus flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl font-bold shadow-lg transition"
                                style={{ backgroundColor: tokens.colors.primary, color: tokens.colors.surface }}
                            >
                                {t("common.continue") || "Continue"}
                                <ArrowRight size={18} className={language === 'ar' ? 'rotate-180' : ''} />
                            </motion.button>
                        </motion.form>
                    )}

                    {step === 1.5 && (
                        <motion.div
                            key="step-1.5"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-4"
                        >
                            {foundUsers.map(u => (
                                <button
                                    key={u._id}
                                    onClick={() => {
                                        setForm(prev => ({ ...prev, loginIdentifier: u.username }));
                                        setStep(2);
                                    }}
                                    className="premium-focus flex w-full flex-col items-start gap-2 rounded-xl border-2 px-5 py-4 font-semibold transition hover:bg-[color-mix(in_srgb,var(--primary-color)_5%,transparent)] cursor-pointer shadow-sm hover:shadow"
                                    style={{ borderColor: tokens.colors.border, color: tokens.colors.text }}
                                >
                                    <div className="flex items-center gap-2 mb-1 w-full border-b pb-2" style={{ borderColor: tokens.colors.border }}>
                                        <User size={18} style={{ color: tokens.colors.primary }} />
                                        <span className="text-base font-bold opacity-90 uppercase tracking-widest">{u.username}</span>
                                    </div>
                                    <div className="flex flex-col gap-1 w-full text-start">
                                        {u.email && (
                                            <div className="flex items-center gap-2">
                                                <Mail size={15} className="opacity-60" />
                                                <span className="text-sm opacity-80">{u.email}</span>
                                            </div>
                                        )}
                                        {u.phone && (
                                            <div className="flex items-center gap-2">
                                                <Smartphone size={15} className="opacity-60" />
                                                <span className="text-sm opacity-80">{u.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                            <button
                                onClick={() => setStep(1)}
                                className="mt-4 text-sm font-semibold w-full py-2 hover:underline cursor-pointer"
                                style={{ color: tokens.colors.textSub }}
                            >
                                Go Back
                            </button>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step-2"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-4"
                        >
                            <button
                                onClick={() => handleRequestCode('email')}
                                className="premium-focus flex min-h-14 w-full cursor-pointer items-center gap-4 rounded-xl border-2 px-5 font-bold transition hover:bg-[color-mix(in_srgb,var(--primary-color)_5%,transparent)]"
                                style={{ borderColor: tokens.colors.border, color: tokens.colors.text }}
                            >
                                <Mail size={22} style={{ color: tokens.colors.primary }} />
                                <span className="flex-1 text-start">Send via Email</span>
                                <ArrowRight size={16} />
                            </button>

                            <button
                                onClick={() => handleRequestCode('whatsapp')}
                                className="premium-focus flex min-h-14 w-full cursor-pointer items-center gap-4 rounded-xl border-2 px-5 font-bold transition hover:bg-[color-mix(in_srgb,var(--primary-color)_5%,transparent)]"
                                style={{ borderColor: tokens.colors.border, color: tokens.colors.text }}
                            >
                                <Smartphone size={22} style={{ color: tokens.colors.primary }} />
                                <span className="flex-1 text-start">Send via WhatsApp</span>
                                <ArrowRight size={16} />
                            </button>

                            <button
                                onClick={() => setStep(1)}
                                className="mt-4 text-sm font-semibold w-full cursor-pointer py-2 hover:underline"
                                style={{ color: tokens.colors.textSub }}
                            >
                                Go Back
                            </button>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.form
                            key="step-3"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-5"
                            onSubmit={(e) => {
                                e.preventDefault();
                                const err = validateField("code", form.code);
                                if (!err) setStep(4);
                            }}
                        >
                            <InputField
                                id="code"
                                icon={Key}
                                name="code"
                                label={"6-Digit Code"}
                                value={form.code}
                                onChange={handleChange}
                                error={errors.code}
                                tokens={tokens}
                                maxLength={6}
                            />

                            <motion.button
                                type="submit"
                                whileHover={{ y: -1, scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                className="premium-focus flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl font-bold shadow-lg transition"
                                style={{ backgroundColor: tokens.colors.primary, color: tokens.colors.surface }}
                            >
                                Verify Code
                                <ArrowRight size={18} className={language === 'ar' ? 'rotate-180' : ''} />
                            </motion.button>
                        </motion.form>
                    )}

                    {step === 4 && (
                        <motion.form
                            key="step-4"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-5"
                            onSubmit={handleResetPassword}
                        >
                            <PasswordField
                                id="newPassword"
                                name="newPassword"
                                label={"New Password"}
                                value={form.newPassword}
                                onChange={handleChange}
                                showPassword={showPassword}
                                setShowPassword={setShowPassword}
                                error={errors.newPassword}
                                tokens={tokens}
                            />

                            <PasswordField
                                id="confirmPassword"
                                name="confirmPassword"
                                label={"Confirm Password"}
                                value={form.confirmPassword}
                                onChange={handleChange}
                                showPassword={showPassword}
                                setShowPassword={setShowPassword}
                                error={errors.confirmPassword}
                                tokens={tokens}
                            />

                            <motion.button
                                type="submit"
                                disabled={isLoading}
                                whileHover={{ y: -1, scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                className="premium-focus flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl font-bold shadow-lg transition"
                                style={{ backgroundColor: tokens.colors.primary, color: tokens.colors.surface }}
                            >
                                Reset Password
                                <ArrowRight size={18} className={language === 'ar' ? 'rotate-180' : ''} />
                            </motion.button>
                        </motion.form>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {generalError && (
                        <motion.p
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            className="mt-5 rounded-xl border px-4 py-3 text-center text-sm font-semibold"
                            style={{
                                color: "#b91c1c",
                                backgroundColor: "color-mix(in srgb, #ef4444 10%, transparent)",
                                borderColor: "color-mix(in srgb, #ef4444 28%, transparent)",
                            }}
                        >
                            {generalError}
                        </motion.p>
                    )}
                    {generalSuccess && (
                        <motion.p
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            className="mt-5 rounded-xl border px-4 py-3 text-center text-sm font-semibold"
                            style={{
                                color: "#15803d",
                                backgroundColor: "color-mix(in srgb, #22c55e 10%, transparent)",
                                borderColor: "color-mix(in srgb, #22c55e 28%, transparent)",
                            }}
                        >
                            {generalSuccess}
                        </motion.p>
                    )}
                </AnimatePresence>
            </motion.section>
        </main>
    );
};

export default ForgotPassword;

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
                className="premium-focus min-h-12 w-full rounded-xl border-2 px-11 text-base outline-none transition-all placeholder:opacity-60"
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
                className="premium-focus min-h-12 w-full rounded-xl border-2 px-11 pe-12 text-base outline-none transition-all placeholder:opacity-60"
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
            >
                {/* Note: I'm omitting importing Eye/EyeOff but they can be passed or we just import Lock as fallback. For brevity I will assume user knows this password field is simple or I'll just use inline text */}
                <span className="text-xs font-bold">{showPassword ? "HIDE" : "SHOW"}</span>
            </button>
        </div>
    </FieldShell>
);
