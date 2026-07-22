import React from 'react';
import { motion } from 'framer-motion';
import { ServerOff, RefreshCw, WifiOff, AlertCircle } from 'lucide-react';
import { useTheme } from '../theme/useTheme';
import { designTokens } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { useBackendStatus } from '../context/BackendStatusContext';
import { AnimatedThemeToggler } from '../theme/animated-theme-toggler';

/**
 * Global full-page fallback for catastrophic backend failure.
 */
export const GlobalBackendUnavailable = () => {
    const { themeName, toggleTheme } = useTheme();
    const { t } = useLanguage();
    const { retry } = useBackendStatus();
    const [isSearching, setIsSearching] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState('');
    const tokens = designTokens[themeName];
    const c = tokens.colors;

    const handleRetry = async () => {
        setIsSearching(true);
        setErrorMsg('');

        const checkConnection = async (attempt = 1) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // Increased to 10s

            try {
                const url = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
                await fetch(url, {
                    method: 'HEAD',
                    mode: 'no-cors',
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                return true;
            } catch (err) {
                clearTimeout(timeoutId);
                console.warn(`[RETRY DEBUG] Attempt ${attempt} failed:`, err);
                return false;
            }
        };

        const success = await checkConnection(1);

        if (success) {
            retry();
        } else {
            // Second attempt after a short delay
            setTimeout(async () => {
                const secondTry = await checkConnection(2);
                if (secondTry) {
                    retry();
                } else {
                    setIsSearching(false);
                    setErrorMsg(t('error.reconnectFailed', 'Still unable to reach servers. Please try again in a moment.'));
                }
            }, 1500);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100000] flex flex-col items-center justify-center p-6 text-center"
            style={{ backgroundColor: c.bg }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full"
            >
                <div
                    className="w-20 h-20 rounded-[28px] mx-auto mb-8 flex items-center justify-center"
                    style={{ backgroundColor: c.primary + '15', color: c.primary }}
                >
                    <ServerOff size={40} className={isSearching ? 'animate-pulse' : ''} />
                </div>

                <h2 className="text-3xl font-black mb-4" style={{ color: c.text }}>
                    {t('error.backendUnavailableTitle', 'Connection Lost')}
                </h2>

                <p className="text-lg opacity-60 mb-10 leading-relaxed" style={{ color: c.textSub }}>
                    {t('error.backendUnavailableDesc', "Our servers are temporarily unavailable or you're experiencing network issues. Please check your connection.")}
                </p>

                <div className="space-y-4">
                    <button
                        onClick={handleRetry}
                        disabled={isSearching}
                        className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl disabled:opacity-70 disabled:cursor-not-allowed group cursor-pointer"
                        style={{
                            backgroundColor: c.primary,
                            color: 'white',
                            boxShadow: `0 12px 24px -8px ${c.primary}60`
                        }}
                    >
                        <RefreshCw size={18} className={`${isSearching ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                        {isSearching ? t('common.loading', 'Reconnecting...') : t('error.retry', 'Attempt Reconnect')}
                    </button>

                    {errorMsg && (
                        <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-sm font-bold flex items-center justify-center gap-2"
                            style={{ color: '#E24B4A' }}
                        >
                            <AlertCircle size={16} />
                            {errorMsg}
                        </motion.p>
                    )}
                </div>
            </motion.div>

            {/* Theme Toggler at bottom, matching Maintenance.jsx */}
            <div className="absolute bottom-10 flex flex-col items-center gap-4">
                <div className="flex items-center justify-center min-h-11 min-w-11">
                    <AnimatedThemeToggler
                        fromCenter={true}
                        checked={themeName === "dark"}
                        onCheckedChange={toggleTheme}
                        className="cursor-pointer hover:scale-110 transition-transform"
                    />
                </div>
                <div
                    className="text-[10px] font-bold uppercase tracking-widest opacity-20"
                    style={{ color: c.text }}
                >
                    {t('footer.copyright')}
                </div>
            </div>
        </div>
    );
};

/**
 * Component-level fallback for non-critical failures.
 */
export const ComponentBackendUnavailable = ({ onRetry, title, description }) => {
    const { themeName } = useTheme();
    const { t } = useLanguage();
    const [loading, setLoading] = React.useState(false);
    const tokens = designTokens[themeName];
    const c = tokens.colors;

    const handleRetry = () => {
        setLoading(true);
        setTimeout(() => {
            onRetry();
        }, 600);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 rounded-3xl border flex flex-col items-center text-center gap-4 bg-surface"
            style={{ backgroundColor: c.surface, borderColor: c.border }}
        >
            <div className={`p-3 rounded-2xl bg-primary/10 text-primary ${loading ? 'animate-pulse' : ''}`}>
                <WifiOff size={24} />
            </div>

            <div>
                <h4 className="font-bold mb-1" style={{ color: c.text }}>
                    {title || t('error.componentTitle', 'Failed to load data')}
                </h4>
                <p className="text-xs opacity-50 max-w-[240px]" style={{ color: c.textSub }}>
                    {description || t('error.componentDesc', 'We encountered a minor issue connecting to our servers.')}
                </p>
            </div>

            <button
                onClick={handleRetry}
                disabled={loading}
                className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all hover:bg-primary/5 active:scale-95 disabled:opacity-50 group cursor-pointer"
                style={{ border: `1px solid ${c.primary}30`, color: c.primary }}
            >
                <RefreshCw size={14} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
                {loading ? t('common.loading', 'Retrying...') : t('error.retry', 'Retry')}
            </button>
        </motion.div>
    );
};

export default GlobalBackendUnavailable;
