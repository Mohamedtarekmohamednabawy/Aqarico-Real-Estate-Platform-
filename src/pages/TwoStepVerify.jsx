import { useState, useEffect } from "react";
import { Mail, MessageSquare, ArrowRight, RefreshCw, ShieldCheck, Loader2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import authService from "../services/authService";
import { useLanguage } from "../i18n/LanguageContext";
import Swal from "sweetalert2";
import { AnimatedThemeToggler } from "../theme/animated-theme-toggler";

const easeOut = [0.22, 1, 0.36, 1];

const TwoStepVerify = () => {
    const navigate = useNavigate();
    const { state } = useLocation();
    const { themeName, toggleTheme } = useTheme();
    const { t, language } = useLanguage();
    const tokens = designTokens[themeName];
    const [code, setCode] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);
    const [error, setError] = useState("");
    const [currentStep, setCurrentStep] = useState(state?.step || "email");
    const [selectedMethod, setSelectedMethod] = useState(
        state?.step === "phone" ? "whatsapp" : (state?.step === "email" ? "email" : null)
    );
    const [isChoosing, setIsChoosing] = useState(false);

    const userId = state?.userId;

    useEffect(() => {
        if (!userId) {
            navigate("/login");
        }
    }, [userId, navigate]);

    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [timeLeft]);

    const handleVerify = async (e) => {
        e.preventDefault();
        if (code.length !== 6) {
            setError(t("auth.verify2FA.invalidCodeError"));
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const isRegister = state?.isRegister || false;
            const result = await authService.verify2FA(userId, code, isRegister);

            if (result.nextStep) {
                setCurrentStep(result.nextStep);
                setSelectedMethod("whatsapp");
                setCode("");
                setTimeLeft(60);
                Swal.fire({
                    icon: "success",
                    title: t("auth.verify2FA.emailVerifiedToast"),
                    text: t("auth.verify2FA.whatsappCheckToast"),
                    timer: 2000,
                    showConfirmButton: false,
                    background: tokens.colors.surface,
                    color: tokens.colors.text,
                    confirmButtonColor: tokens.colors.primary,
                });
            } else if (result.success) {
                const title = currentStep === "device"
                    ? t("auth.verify2FA.deviceVerifiedToast")
                    : t("auth.verify2FA.authenticatedToast");

                const text = isRegister
                    ? t("auth.verify2FA.verificationSuccessLogin") || "Account verified! Please sign in to continue."
                    : t("auth.verify2FA.welcomeAqaricoToast");

                await Swal.fire({
                    icon: "success",
                    title: title,
                    text: text,
                    timer: isRegister ? 2500 : 1800,
                    showConfirmButton: false,
                    background: tokens.colors.surface,
                    color: tokens.colors.text,
                    confirmButtonColor: tokens.colors.primary,
                });

                if (isRegister) {
                    navigate("/login");
                } else {
                    window.dispatchEvent(new Event("userChanged"));
                    navigate("/");
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || t("auth.verify2FA.invalidCodeError"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResend = async () => {
        if (timeLeft > 0 || isResending) return;

        setIsResending(true);
        try {
            await authService.resend2FA(userId);
            setTimeLeft(60);
            Swal.fire({
                icon: "success",
                title: t("auth.verify2FA.codeSentToast"),
                text: t("auth.verify2FA.newCodeSentToast", {
                    method: currentStep === "email" ? t("auth.email") : t("agentCard.whatsapp"),
                }),
                timer: 2000,
                showConfirmButton: false,
                background: tokens.colors.surface,
                color: tokens.colors.text,
                confirmButtonColor: tokens.colors.primary,
            });
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: t("admin.alerts.error"),
                background: tokens.colors.surface,
                color: tokens.colors.text,
                confirmButtonColor: tokens.colors.primary,
                text: err.response?.data?.message || t("auth.verify2FA.invalidCodeError"),
            });
        } finally {
            setIsResending(false);
        }
    };

    const handleMethodSelect = async (method) => {
        setIsChoosing(true);
        setError("");
        try {
            const result = await authService.resend2FA(userId, method);
            if (result.success) {
                setCurrentStep(result.step || "device");
                setSelectedMethod(method);
                setTimeLeft(60);
            }
        } catch (err) {
            setError(err.response?.data?.message || t("auth.verify2FA.invalidCodeError"));
        } finally {
            setIsChoosing(false);
        }
    };

    const stepLabel = currentStep === "email"
        ? t("auth.verify2FA.emailStep")
        : currentStep === "device-choose"
            ? t("auth.verify2FA.chooseMethod")
            : currentStep === "device"
                ? t("auth.verify2FA.deviceStep")
                : t("auth.verify2FA.whatsappStep");

    const StepIcon = currentStep === "phone" ? MessageSquare : Mail;

    return (
        <main
            className="auth-shell flex items-center justify-center px-4 py-24"
            style={{
                backgroundColor: tokens.colors.bg,
                color: tokens.colors.text,
                backgroundImage:
                    "url('https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&q=70&w=1400')",
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

            <motion.section
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.36, ease: easeOut }}
                className="w-full max-w-md rounded-3xl border p-7 shadow-2xl md:p-9"
                style={{
                    backgroundColor: tokens.colors.surfaceGlass || tokens.colors.surface,
                    borderColor: tokens.colors.border,
                    boxShadow: tokens.shadows.lg,
                    backdropFilter: "blur(18px) saturate(140%)",
                }}
            >
                <div className="mb-8 text-center">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, y: 10, scale: 0.94 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.28, ease: easeOut }}
                        className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl shadow-lg"
                        style={{
                            backgroundColor: tokens.colors.primary,
                            color: tokens.colors.surface,
                        }}
                    >
                        <StepIcon size={36} />
                    </motion.div>

                    <p
                        className="mb-3 text-sm font-bold uppercase"
                        style={{ color: tokens.colors.primary, letterSpacing: "0.12em" }}
                    >
                        {t("auth.verify2FA.secureAccess")}
                    </p>
                    <h1 className="animated-page-title text-3xl font-extrabold tracking-tight">
                        {stepLabel}
                    </h1>
                    <p className="mt-3 text-sm leading-6" style={{ color: tokens.colors.textSub }}>
                        {currentStep === "email"
                            ? t("auth.verify2FA.enterEmailCode")
                            : currentStep === "device-choose"
                                ? t("auth.verify2FA.chooseMethodSubtitle")
                                : currentStep === "device"
                                    ? t("auth.verify2FA.enterDeviceCode")
                                    : t("auth.verify2FA.emailConfirmedWhatsapp")}
                    </p>
                </div>

                {currentStep === "device-choose" ? (
                    <div className="space-y-4">
                        <motion.button
                            whileHover={{ y: -2, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={isChoosing}
                            onClick={() => handleMethodSelect("email")}
                            className="flex w-full items-center gap-4 rounded-2xl border-2 p-5 transition-all hover:shadow-lg disabled:opacity-50 cursor-pointer"
                            style={{
                                backgroundColor: tokens.colors.bg,
                                borderColor: tokens.colors.border,
                                color: tokens.colors.text
                            }}
                        >
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: `${tokens.colors.primary}15`, color: tokens.colors.primary }}>
                                <Mail size={24} />
                            </div>
                            <div className="text-left flex-1">
                                <h3 className="font-bold">{t("auth.verify2FA.viaEmail")}</h3>
                                <p className="text-xs" style={{ color: tokens.colors.textSub }}>{t("auth.verify2FA.enterEmailCode")}</p>
                            </div>
                            {isChoosing && <Loader2 className="animate-spin" size={20} />}
                        </motion.button>

                        <motion.button
                            whileHover={{ y: -2, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={isChoosing}
                            onClick={() => handleMethodSelect("whatsapp")}
                            className="flex w-full items-center gap-4 rounded-2xl border-2 p-5 transition-all hover:shadow-lg disabled:opacity-50 cursor-pointer"
                            style={{
                                backgroundColor: tokens.colors.bg,
                                borderColor: tokens.colors.border,
                                color: tokens.colors.text
                            }}
                        >
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: "#25D36620", color: "#25D366" }}>
                                <MessageSquare size={24} />
                            </div>
                            <div className="text-left flex-1">
                                <h3 className="font-bold">{t("auth.verify2FA.viaWhatsapp")}</h3>
                                <p className="text-xs" style={{ color: tokens.colors.textSub }}>{t("auth.verify2FA.whatsappCheckToast")}</p>
                            </div>
                            {isChoosing && <Loader2 className="animate-spin" size={20} />}
                        </motion.button>

                        {error && (
                            <p className="text-center text-sm font-semibold mt-4" style={{ color: "#ef4444" }}>
                                {error}
                            </p>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="mb-8 grid grid-cols-2 gap-3">
                            <StepPill
                                active={selectedMethod === "email"}
                                complete={currentStep === "phone"}
                                icon={Mail}
                                label={t("auth.email")}
                                tokens={tokens}
                            />
                            <StepPill
                                active={selectedMethod === "whatsapp"}
                                icon={MessageSquare}
                                label={t("agentCard.whatsapp")}
                                tokens={tokens}
                            />
                        </div>

                        <form onSubmit={handleVerify} className="space-y-5">
                            {/* ... existing form content ... */}
                            <motion.div
                                animate={error ? { x: [-4, 4, -2, 0] } : { x: 0 }}
                                transition={{ duration: 0.22, ease: easeOut }}
                            >
                                <label htmlFor="verification-code" className="mb-2 block text-sm font-bold">
                                    {t("auth.verify2FA.verifyCodeLabel")}
                                </label>
                                <input
                                    id="verification-code"
                                    type="text"
                                    inputMode="numeric"
                                    maxLength="6"
                                    placeholder="000000"
                                    value={code}
                                    onChange={(e) => {
                                        setCode(e.target.value.replace(/\D/g, ""));
                                        setError("");
                                    }}
                                    className="premium-focus min-h-16 w-full rounded-2xl border-2 px-4 text-center text-3xl font-extrabold tracking-[0.32em] outline-none transition-all placeholder:tracking-[0.32em] placeholder:opacity-30"
                                    style={{
                                        backgroundColor: tokens.colors.bg,
                                        borderColor: error ? "#ef4444" : tokens.colors.border,
                                        color: tokens.colors.text,
                                    }}
                                />
                                <AnimatePresence>
                                    {error && (
                                        <motion.p
                                            initial={{ opacity: 0, y: -6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -6 }}
                                            transition={{ duration: 0.18, ease: easeOut }}
                                            className="mt-2 text-center text-sm font-semibold"
                                            style={{ color: "#ef4444" }}
                                        >
                                            {error}
                                        </motion.p>
                                    )}
                                </AnimatePresence>
                            </motion.div>

                            <motion.button
                                type="submit"
                                disabled={isSubmitting}
                                whileHover={{ y: -1, scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ duration: 0.16, ease: easeOut }}
                                className="premium-focus flex min-h-12 w-full items-center justify-center gap-2 rounded-xl font-bold shadow-lg transition-opacity disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
                                style={{
                                    backgroundColor: tokens.colors.primary,
                                    color: tokens.colors.surface,
                                }}
                            >
                                {isSubmitting ? (
                                    <RefreshCw className="animate-spin" size={20} />
                                ) : (
                                    <>
                                        {t("auth.verify2FA.verifyAndContinue")}
                                        <ArrowRight size={18} className={language === 'ar' ? 'rotate-180' : ''} />
                                    </>
                                )}
                            </motion.button>
                        </form>

                        <div className="mt-8 border-t pt-6 text-center" style={{ borderColor: tokens.colors.border }}>
                            <p className="text-sm" style={{ color: tokens.colors.textSub }}>
                                {t("auth.verify2FA.didNotReceive")}
                            </p>
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={timeLeft > 0 || isResending}
                                className="premium-focus mx-auto mt-2 flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 font-bold transition disabled:cursor-not-allowed disabled:opacity-55 cursor-pointer"
                                style={{ color: tokens.colors.primary }}
                            >
                                {isResending ? (
                                    <RefreshCw className="animate-spin" size={16} />
                                ) : (
                                    `${t("auth.verify2FA.resendCode")}${timeLeft > 0 ? ` (${timeLeft}s)` : ""}`
                                )}
                            </button>
                        </div>
                    </>
                )}
            </motion.section>
        </main>
    );
};

const StepPill = ({ active, complete, icon: Icon, label, tokens }) => (
    <motion.div
        animate={{ scale: active ? 1.02 : 1 }}
        transition={{ duration: 0.18, ease: easeOut }}
        className="flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold"
        style={{
            backgroundColor: active
                ? tokens.colors.primary
                : complete
                    ? "color-mix(in srgb, #10b981 12%, transparent)"
                    : tokens.colors.bg,
            borderColor: active ? tokens.colors.primary : tokens.colors.border,
            color: active ? tokens.colors.surface : complete ? "#047857" : tokens.colors.textSub,
        }}
    >
        {complete ? <ShieldCheck size={16} /> : <Icon size={16} />}
        {label}
    </motion.div>
);

export default TwoStepVerify;
