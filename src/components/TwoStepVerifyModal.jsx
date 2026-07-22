import { useState, useEffect } from "react";
import { Mail, MessageSquare, ArrowRight, RefreshCw, ShieldCheck, Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import authService from "../services/authService";
import { useLanguage } from "../i18n/LanguageContext";
import Swal from "sweetalert2";

const easeOut = [0.22, 1, 0.36, 1];

const TwoStepVerifyModal = ({ isOpen, onClose, userId, step = "phone", onSuccess }) => {
    const { themeName } = useTheme();
    const { t, language } = useLanguage();
    const tokens = designTokens[themeName];

    const [code, setCode] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);
    const [error, setError] = useState("");
    const [currentStep, setCurrentStep] = useState(step);
    const [selectedMethod, setSelectedMethod] = useState(
        step === "phone" ? "whatsapp" : (step === "email" ? "email" : "whatsapp")
    );

    useEffect(() => {
        if (isOpen) {
            setTimeLeft(60);
            setCode("");
            setError("");
            setCurrentStep(step);
            setSelectedMethod(step === "phone" ? "whatsapp" : "email");
        }
    }, [isOpen, step]);

    useEffect(() => {
        if (isOpen && timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [timeLeft, isOpen]);

    const handleVerify = async (e) => {
        e.preventDefault();
        if (code.length !== 6) {
            setError(t("auth.verify2FA.invalidCodeError"));
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const result = await authService.verify2FA(userId, code);

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
                onSuccess(result);
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
            await authService.resend2FA(userId, selectedMethod);
            setTimeLeft(60);
            Swal.fire({
                icon: "success",
                title: t("auth.verify2FA.codeSentToast"),
                text: t("auth.verify2FA.newCodeSentToast", {
                    method: selectedMethod === "email" ? t("auth.email") : t("agentCard.whatsapp"),
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

    const stepLabel = currentStep === "email"
        ? t("auth.verify2FA.emailStep")
        : currentStep === "phone"
            ? t("auth.verify2FA.whatsappStep")
            : t("auth.verify2FA.deviceStep");

    const StepIcon = currentStep === "phone" ? MessageSquare : Mail;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-md rounded-3xl border shadow-2xl p-7 md:p-9 overflow-hidden"
                    style={{
                        backgroundColor: tokens.colors.surface,
                        borderColor: tokens.colors.border,
                        color: tokens.colors.text,
                    }}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 transition cursor-pointer"
                        style={{ color: tokens.colors.textSub }}
                    >
                        <X size={20} />
                    </button>

                    <div className="mb-8 text-center">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
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
                        <h1 className="text-3xl font-extrabold tracking-tight">
                            {stepLabel}
                        </h1>
                        <p className="mt-3 text-sm leading-6" style={{ color: tokens.colors.textSub }}>
                            {currentStep === "email"
                                ? t("auth.verify2FA.enterEmailCode")
                                : t("auth.verify2FA.whatsappCheckToast")}
                        </p>
                    </div>

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
                                className="w-full rounded-2xl border-2 px-4 py-4 text-center text-3xl font-extrabold tracking-[0.32em] outline-none transition-all placeholder:tracking-[0.32em] placeholder:opacity-30"
                                style={{
                                    backgroundColor: tokens.colors.bg,
                                    borderColor: error ? "#ef4444" : tokens.colors.border,
                                    color: tokens.colors.text,
                                }}
                                autoFocus
                            />
                            <AnimatePresence>
                                {error && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
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
                            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl font-bold shadow-lg transition-opacity disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
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
                            className="mx-auto mt-2 flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 font-bold transition disabled:cursor-not-allowed disabled:opacity-55 cursor-pointer"
                            style={{ color: tokens.colors.primary }}
                        >
                            {isResending ? (
                                <RefreshCw className="animate-spin" size={16} />
                            ) : (
                                `${t("auth.verify2FA.resendCode")}${timeLeft > 0 ? ` (${timeLeft}s)` : ""}`
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

const StepPill = ({ active, complete, icon: Icon, label, tokens }) => (
    <motion.div
        animate={{ scale: active ? 1.02 : 1 }}
        className="flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition-colors"
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

export default TwoStepVerifyModal;
