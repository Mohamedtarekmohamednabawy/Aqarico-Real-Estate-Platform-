import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, RotateCcw, Copy, Check, Mic, MicOff, MessageCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import UserAvatar from "./UserAvatar";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import authService from "../services/authService";
import chatService from "../services/chatService";
import { useComparison } from "../context/ComparisonContext";
import { dataManager } from "../data/dataManager";
import Swal from "sweetalert2";
import { useLanguage } from "../i18n/LanguageContext";
import { MAINTENANCE_MODE } from "../config";
import { checkAdminBypass } from "../utils/adminBypass";

const easeOut = [0.22, 1, 0.36, 1];

// ComparisonBar height estimates (px) — button shifts up by this when bar is visible
const BAR_HEIGHT_MOBILE = 68;  // sm and below
const BAR_HEIGHT_DESKTOP = 0;   // bar is centered on desktop, doesn't conflict

const FloatingChatButton = () => {
    const [showPopup, setShowPopup] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);

    const { themeName } = useTheme();
    const { compareList, loadCompareList } = useComparison();
    const { t, language } = useLanguage();
    const tokens = designTokens[themeName];

    // Use an initializer to prevent recreation
    const [welcomeMessage] = useState({
        role: "bot",
        text: "يا أهلا! معاك خبير عقارات إسكندرية، بتدور على إيه النهاردة؟",
        time: new Date(),
    });

    useEffect(() => {
        // Update welcome message if it's the only one when language changes
        if (messages.length === 1 && messages[0].role === "bot" && messages[0].text !== "يا أهلا! معاك خبير عقارات إسكندرية، بتدور على إيه النهاردة؟") {
            setMessages([welcomeMessage]);
        }
    }, [language, messages, welcomeMessage, t]);
    const [isLoading, setIsLoading] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [micLang, setMicLang] = useState('ar-EG');
    const [isMobile, setIsMobile] = useState(false);
    const recognitionRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const finalTranscriptRef = useRef('');
    const currentUser = authService.getCurrentUser();
    const isLoggedIn = !!currentUser;
    const location = useLocation();
    const navigate = useNavigate();
    const messagesRef = useRef(null);
    const textareaRef = useRef(null);

    // Track screen size to know if we're mobile
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 640);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // How much to push the button up when comparison bar is showing
    const barOffset = compareList.length > 0 && isMobile ? BAR_HEIGHT_MOBILE + 8 : 0;
    // base bottom: 32px (bottom-8). Total bottom = 32 + barOffset
    const buttonBottom = 32 + barOffset;
    // Chat dialog bottom: button height (60) + gap (8) + buttonBottom
    // On mobile use a smaller gap so the dialog doesn't push too high
    const dialogBottom = isMobile ? buttonBottom + 60 + 4 : buttonBottom + 60 + 8;

    // Auto-grow textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            const newHeight = Math.min(textareaRef.current.scrollHeight, 150);
            textareaRef.current.style.height = `${newHeight}px`;
        }
    }, [message]);

    // Setup SpeechRecognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;
        if (recognitionRef.current) recognitionRef.current.abort();

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = micLang;

        recognition.onresult = (event) => {
            let finalTranscript = "";
            let interimTranscript = "";

            for (let i = 0; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    // Mobile fix: If the browser is sending cumulative results (e.g. index 0 is "Hello", index 1 is "Hello World")
                    // we detect if the current result is a superset of the previous final results to prevent duplication.
                    if (finalTranscript.trim() && transcript.trim().startsWith(finalTranscript.trim())) {
                        finalTranscript = transcript;
                    } else {
                        finalTranscript += (finalTranscript ? " " : "") + transcript;
                    }
                } else {
                    interimTranscript += transcript;
                }
            }

            finalTranscriptRef.current = finalTranscript;
            setMessage(finalTranscript + interimTranscript);

            // Silence timer: stop recognition after 2s of no input
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
                if (recognitionRef.current) recognitionRef.current.stop();
            }, 2000);
        };

        recognition.onerror = (e) => {
            if (e.error !== 'no-speech') console.error('Speech error:', e.error);
            setIsListening(false);
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        };

        recognition.onend = () => {
            setIsListening(false);
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            const captured = finalTranscriptRef.current.trim();
            if (captured) {
                setTimeout(() => {
                    setMessage(captured);
                    window.dispatchEvent(new CustomEvent('micAutoSend', { detail: { text: captured } }));
                }, 100);
            }
            finalTranscriptRef.current = '';
        };

        recognitionRef.current = recognition;
        return () => {
            recognition.abort();
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        };
    }, [micLang]);

    // Mic auto-send
    useEffect(() => {
        const handler = (e) => {
            const text = e.detail?.text?.trim();
            if (!text) return;
            const userMsg = { role: 'user', text, time: new Date() };
            setMessages((prev) => [...prev, userMsg]);
            setMessage('');
            finalTranscriptRef.current = '';
            setIsLoading(true);
            chatService.sendMessage(text)
                .then((response) => {
                    const reply = response.reply || t("chat.errorReply");
                    const micActions = response.actions || [];
                    setMessages((prev) => [...prev, { role: 'bot', text: reply, time: new Date() }]);

                    // AI Action Detection: Use structured actions from backend OR fallback to regex parsing
                    const propertyIdRegex = /\b([a-f\d]{24})\b/g;
                    const manualCompareRegex = /\[COMPARE:\s*([a-f\d\s,]{24,})\]/i;
                    const actionCompareReadyRegex = /ACTION_COMPARE_READY:([a-f\d\s,]{24,})/i;

                    let micIdsToFetch = [];
                    let actionMatch = false;

                    // 1. Process structured actions
                    micActions.forEach(action => {
                        if (action && typeof action === 'object' && action.type === 'COMPARE_PROPERTIES' && Array.isArray(action.propertyIds)) {
                            micIdsToFetch = [...new Set([...micIdsToFetch, ...action.propertyIds])];
                            actionMatch = true;
                        }
                        if (typeof action === 'string' && action.startsWith('ACTION_COMPARE_READY:')) {
                            const ids = action.replace('ACTION_COMPARE_READY:', '').split(',').map(id => id.trim());
                            micIdsToFetch = [...new Set([...micIdsToFetch, ...ids])];
                            actionMatch = true;
                        }
                    });

                    // 2. Fallback: Check for signals in text
                    if (!actionMatch) {
                        const textActionMatch = reply.match(actionCompareReadyRegex);
                        if (textActionMatch) {
                            const ids = textActionMatch[1].split(',').map(id => id.trim());
                            micIdsToFetch = [...new Set(ids)];
                            actionMatch = true;
                            setMessages(prev => prev.map((m, idx) =>
                                idx === prev.length - 1 ? { ...m, text: m.text.replace(actionCompareReadyRegex, '').trim() } : m
                            ));
                        }
                    }

                    if (!actionMatch) {
                        const manualMatch = reply.match(manualCompareRegex);
                        if (manualMatch) {
                            const ids = manualMatch[1].split(',').map(id => id.trim());
                            micIdsToFetch = [...new Set(ids)];
                            setMessages(prev => prev.map((m, idx) =>
                                idx === prev.length - 1 ? { ...m, text: m.text.replace(manualCompareRegex, '').trim() } : m
                            ));
                        } else {
                            const matches = [...reply.matchAll(propertyIdRegex)];
                            if (matches.length > 0) {
                                micIdsToFetch = [...new Set(matches.map(m => m[1]))];
                            }
                        }
                    }

                    if (micIdsToFetch.length > 0) {
                        const shouldAutoAdd = text.toLowerCase().includes('compare') ||
                            text.includes('قارن') ||
                            text.includes('حط') ||
                            text.includes('تول') ||
                            text.toLowerCase().includes('tool') ||
                            actionMatch ||
                            reply.toLowerCase().includes('[compare:');

                        if (shouldAutoAdd && micIdsToFetch.length > 1) {
                            dataManager.fetchPropertiesByIds(micIdsToFetch)
                                .then(props => {
                                    const validProps = props.filter(Boolean);
                                    loadCompareList(validProps);
                                })
                                .catch(err => console.error("Mic Compare error:", err));
                        }
                    }
                })
                .catch(() => {
                    setMessages((prev) => [...prev, { role: 'bot', text: t("chat.errorReply"), time: new Date() }]);
                })
                .finally(() => setIsLoading(false));
        };
        window.addEventListener('micAutoSend', handler);
        return () => window.removeEventListener('micAutoSend', handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleMic = () => {
        const recognition = recognitionRef.current;
        if (!recognition) {
            alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
            return;
        }
        if (isListening) {
            recognition.stop();
            setIsListening(false);
        } else {
            finalTranscriptRef.current = '';
            setMessage('');
            recognition.start();
            setIsListening(true);
        }
    };

    // Auto-scroll
    useEffect(() => {
        if (messagesRef.current && (showChat || messages.length > 0)) {
            // Short delay to ensure DOM is fully painted
            const timer = setTimeout(() => {
                messagesRef.current.scrollTo({
                    top: messagesRef.current.scrollHeight,
                    behavior: messages.length <= 1 ? 'auto' : 'smooth'
                });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [messages, isLoading, showChat]);

    // Fetch history
    useEffect(() => {
        if (isLoggedIn) {
            const loadHistory = async () => {
                try {
                    const result = await chatService.fetchHistory();
                    if (result.success) setMessages([welcomeMessage, ...result.messages]);
                } catch {
                    setMessages([welcomeMessage]);
                }
            };
            loadHistory();
        } else {
            setMessages([welcomeMessage]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoggedIn]);

    const handleButtonClick = () => {
        if (!isLoggedIn) {
            setShowPopup(true);
            setTimeout(() => setShowPopup(false), 3000);
        } else {
            setShowChat(!showChat);
        }
    };

    const handleResetChat = async () => {
        const result = await Swal.fire({
            title: language === 'ar' ? 'مسح المحادثة؟' : 'Clear Chat?',
            text: language === 'ar' ? "سيتم حذف جميع الرسائل السابقة نهائياً." : "All previous messages will be permanently deleted.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: tokens.colors.primary,
            cancelButtonColor: '#d33',
            confirmButtonText: language === 'ar' ? 'نعم، امسحها' : 'Yes, delete it',
            cancelButtonText: language === 'ar' ? 'إلغاء' : 'Cancel',
            background: tokens.colors.bg,
            color: tokens.colors.text,
            customClass: { container: 'swal-above-chat' },
            didOpen: () => {
                const container = document.querySelector('.swal-above-chat');
                if (container) container.style.zIndex = '99999';
            },
        });
        if (!result.isConfirmed) return;
        try {
            await chatService.resetChat();
            setMessages([{ role: "bot", text: "يا أهلا! معاك خبير عقارات إسكندرية، بتدور على إيه النهاردة؟", time: new Date() }]);
        } catch (error) {
            console.error("Error resetting chat:", error);
        }
    };

    const handleSendMessage = async () => {
        const text = message.trim();
        if (!text || isLoading) return;

        const userMsg = { role: "user", text, time: new Date() };
        setMessages((prev) => [...prev, userMsg]);
        setMessage("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
        setIsLoading(true);

        // ADMIN ONLY: Random Sell
        const randomTriggers = ["random sell", "ran sell", "راندوم سيل", "سيل عشوائي", "بيع عشوائي"];
        if (randomTriggers.includes(text.toLowerCase().trim()) && currentUser?.role === 'admin') {
            const botReply = {
                role: "bot",
                text: t("chat.randomSell"),
                time: new Date(),
            };
            setTimeout(() => {
                setMessages((prev) => [...prev, botReply]);
                chatService.saveManualMessages([userMsg, botReply]).catch(err => console.error("Sync error:", err));
                const randomData = {
                    title: "شقة لقطة في العجمي - مجمع سكني متميز",
                    description: "شقة رائعة كاملة المرافق، قريبة من البحر والخدمات. فرصة ممتازة للسكن أو الاستثمار.",
                    price: Math.floor(Math.random() * (2000000 - 150000 + 1)) + 150000,
                    area: Math.floor(Math.random() * (250 - 50 + 1)) + 50,
                    bedrooms: Math.floor(Math.random() * 5) + 1,
                    bathrooms: Math.floor(Math.random() * 3) + 1,
                    location: "Kilo 21", district: "El Agami", type: "sale",
                    floor: Math.floor(Math.random() * 10) + 1, finish: "Semi Finished",
                    year_built: Math.floor(Math.random() * (2024 - 1990 + 1)) + 1990,
                    lat: "31.033300", lng: "29.733300"
                };
                const query = new URLSearchParams();
                Object.entries(randomData).forEach(([k, v]) => query.append(k, v));
                setTimeout(() => { navigate(`/add-listing?${query.toString()}`); setIsLoading(false); }, 1500);
            }, 2000);
            return;
        }

        try {
            const response = await chatService.sendMessage(text);
            const reply = response.reply || t("chat.errorReply");
            const actions = response.actions || [];

            setMessages((prev) => [...prev, { role: "bot", text: reply, time: new Date() }]);

            // AI Action Detection: Use structured actions from backend OR fallback to regex parsing
            // Use a more aggressive ID regex that finds raw 24-character hex strings
            const propertyIdRegex = /\b([a-f\d]{24})\b/g;
            const manualCompareRegex = /\[COMPARE:\s*([a-f\d\s,]{24,})\]/i;
            const actionCompareReadyRegex = /ACTION_COMPARE_READY:([a-f\d\s,]{24,})/i;

            let idsToFetch = [];
            let actionMatch = false;

            // 1. Process structured actions (most reliable path)
            if (actions.length > 0) {
                actions.forEach(action => {
                    // Structured dict format: { type: "COMPARE_PROPERTIES", propertyIds: [...] }
                    if (action && typeof action === 'object' && action.type === 'COMPARE_PROPERTIES' && Array.isArray(action.propertyIds)) {
                        idsToFetch = [...new Set([...idsToFetch, ...action.propertyIds])];
                        actionMatch = true;
                    }
                    // Legacy raw-string format: "ACTION_COMPARE_READY:id1,id2,id3"
                    if (typeof action === 'string' && action.startsWith('ACTION_COMPARE_READY:')) {
                        const ids = action.replace('ACTION_COMPARE_READY:', '').split(',').map(id => id.trim());
                        idsToFetch = [...new Set([...idsToFetch, ...ids])];
                        actionMatch = true;
                    }
                });
            }

            // 2. Fallback: Check for machine-readable ACTION_COMPARE_READY signal in text (in case of old backend)
            if (!actionMatch) {
                const textActionMatch = reply.match(actionCompareReadyRegex);
                if (textActionMatch) {
                    const ids = textActionMatch[1].split(',').map(id => id.trim());
                    idsToFetch = [...new Set(ids)];
                    actionMatch = true;
                    setMessages(prev => prev.map((m, idx) =>
                        idx === prev.length - 1 ? { ...m, text: m.text.replace(actionCompareReadyRegex, '').trim() } : m
                    ));
                }
            }

            // 3. Further Fallback: Check for explicit [COMPARE] tags or extract IDs from text
            if (!actionMatch) {
                const manualMatch = reply.match(manualCompareRegex);
                if (manualMatch) {
                    const ids = manualMatch[1].split(',').map(id => id.trim());
                    idsToFetch = [...new Set(ids)];
                    setMessages(prev => prev.map((m, idx) =>
                        idx === prev.length - 1 ? { ...m, text: m.text.replace(manualCompareRegex, '').trim() } : m
                    ));
                } else {
                    const matches = [...reply.matchAll(propertyIdRegex)];
                    if (matches.length > 0) {
                        idsToFetch = [...new Set(matches.map(m => m[1]))];
                    }
                }
            }

            // If we have IDs and the AI seems to be 'comparing' or responding to a search
            if (idsToFetch.length > 0) {
                // Determine if we should add automatically
                const shouldAutoAdd = text.toLowerCase().includes('compare') ||
                    text.includes('قارن') ||
                    text.includes('حط') ||
                    text.includes('تول') ||
                    text.toLowerCase().includes('tool') ||
                    actionMatch ||
                    reply.toLowerCase().includes('[compare:');

                if (shouldAutoAdd && idsToFetch.length > 1) {
                    // Fetch and add to compare
                    dataManager.fetchPropertiesByIds(idsToFetch)
                        .then(props => {
                            const validProps = props.filter(Boolean);
                            // Replace current comparison bar list with new AI results
                            loadCompareList(validProps);

                            // Optional: notify user if they didn't specifically ask but AI found matches
                            if (!actionMatch && !text.includes('قارن') && !text.includes('compare')) {
                                setMessages(prev => [...prev, {
                                    role: "bot",
                                    text: t("chat.comparisonAdded").replace("{count}", validProps.length.toString()),
                                    time: new Date()
                                }]);
                            }
                        })
                        .catch(err => console.error("AI Compare error:", err));
                }
            }
        } catch (err) {
            console.error("[CHAT DEBUG] Detailed Send Error:", {
                message: err.message,
                code: err.code,
                name: err.name,
                response: err.response?.data
            });

            // If it's a timeout but the message might have been saved, we can tell the user
            const isTimeout = err.code === 'ECONNABORTED' || err.message.toLowerCase().includes('timeout');
            const errorText = isTimeout
                ? (language === 'ar' ? "الرد أخد وقت طويل شوية، جرب تعمل ريفريش كمان ثانية." : "The response is taking a bit long. Try refreshing in a second.")
                : t("chat.errorReply");

            setMessages((prev) => [...prev, { role: "bot", text: errorText, time: new Date() }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
    };

    const formatTime = (date) => new Date(date).toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit", hour12: true,
    });

    const handleCopy = (text, index) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const renderBotText = (text) => {
        if (!text) return null;

        // Convert common markdown patterns to HTML-like components
        // We split by patterns and then process each part.
        // Support: ### Heading, * Bullet, **Bold**, *Italic*, ***BoldItalic***

        const lines = text.split('\n');

        return lines.map((line, lineIdx) => {
            const isBullet = line.trim().startsWith('* ');
            const processedLine = isBullet ? line.replace(/^\s*\*\s*/, '') : line;

            const parts = processedLine.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*)/g);

            let content = parts.map((part, i) => {
                if (part.startsWith('***') && part.endsWith('***')) {
                    return <strong key={i} style={{ fontWeight: 900, fontStyle: 'italic' }}>{part.slice(3, -3)}</strong>;
                }
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} style={{ fontWeight: 900 }}>{part.slice(2, -2)}</strong>;
                }
                if (part.startsWith('*') && part.endsWith('*')) {
                    return <em key={i} style={{ fontStyle: 'italic', fontWeight: 700 }}>{part.slice(1, -1)}</em>;
                }

                // Handle URLs
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                const urlParts = part.split(urlRegex);
                return urlParts.map((uPart, j) => {
                    if (urlRegex.test(uPart)) {
                        urlRegex.lastIndex = 0;
                        return (
                            <a key={`${i}-${j}`} href={uPart} target="_blank" rel="noopener noreferrer"
                                style={{ color: tokens.colors.primary, textDecoration: "underline", fontWeight: "bold" }}>
                                {t("chat.clickForDetails")}
                            </a>
                        );
                    }
                    return <span key={`${i}-${j}`}>{uPart}</span>;
                });
            });

            // Handle Headings (###)
            if (line.trim().startsWith('###')) {
                return (
                    <div key={lineIdx} style={{ marginTop: '1.2rem', marginBottom: '0.6rem' }}>
                        <h4 style={{
                            fontSize: '1.05rem',
                            fontWeight: 900,
                            color: tokens.colors.primary,
                            margin: 0,
                            paddingBottom: '4px',
                            borderBottom: `2px solid ${tokens.colors.primary}20`
                        }}>
                            {line.replace('###', '').trim()}
                        </h4>
                    </div>
                );
            }

            // Handle Bullets (* )
            if (line.trim().startsWith('* ')) {
                return (
                    <div key={lineIdx} style={{
                        display: 'flex',
                        gap: '8px',
                        paddingRight: language === 'ar' ? '8px' : '0',
                        paddingLeft: language === 'ar' ? '0' : '8px',
                        marginBottom: '4px'
                    }}>
                        <span style={{ color: tokens.colors.primary, fontWeight: 'bold' }}>•</span>
                        <div style={{ flex: 1 }}>{content}</div>
                    </div>
                );
            }

            return (
                <div key={lineIdx} style={{ minHeight: '1.2em' }}>
                    {content}
                </div>
            );
        });
    };

    const hiddenPaths = ["/login", "/register", "/forgot-password", "/verify-2fa", "/maintenance", "/dev/maintenance", "/dev/backend-down"];
    const isBypass = checkAdminBypass();

    if (hiddenPaths.includes(location.pathname)) return null;
    if (MAINTENANCE_MODE && !isBypass) return null;

    return (
        <>
            {/* ── Floating Button ── */}
            <motion.div
                animate={{ bottom: buttonBottom }}
                transition={{ duration: 0.24, ease: easeOut }}
                className="fixed right-8 z-[9999]"
            >
                <button
                    onClick={handleButtonClick}
                    style={{
                        background: isLoggedIn
                            ? `linear-gradient(135deg, ${tokens.colors.primary}, ${tokens.colors.secondary})`
                            : "linear-gradient(135deg, #6b7280, #4b5563)",
                    }}
                    className={`premium-focus flex items-center justify-center w-[60px] h-[60px] text-white border-0 rounded-full text-base font-semibold shadow-lg ${isLoggedIn ? "cursor-pointer hover:scale-105 active:scale-95" : "cursor-not-allowed"} transition-transform duration-200 ease-out`}
                >
                    <AnimatePresence mode="wait" initial={false}>
                        {showChat ? (
                            <motion.div key="close"
                                initial={{ rotate: -180, opacity: 0, scale: 0.5 }}
                                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                                exit={{ rotate: 180, opacity: 0, scale: 0.5 }}
                                transition={{ duration: 0.22, ease: easeOut }}
                                style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <X size={24} />
                            </motion.div>
                        ) : (
                            <motion.div key="chat"
                                initial={{ rotate: 180, opacity: 0, scale: 0.5 }}
                                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                                exit={{ rotate: -180, opacity: 0, scale: 0.5 }}
                                transition={{ duration: 0.22, ease: easeOut }}
                                style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <MessageCircle size={32} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </button>
            </motion.div>

            {/* ── Login popup ── */}
            <AnimatePresence>
                {showPopup && !isLoggedIn && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.8 }}
                        transition={{ duration: 0.3 }}
                        style={{
                            bottom: buttonBottom + 68,
                            backgroundColor: tokens.colors.surface,
                            color: tokens.colors.text,
                            borderColor: tokens.colors.border,
                            boxShadow: tokens.shadows.md,
                        }}
                        className="fixed right-8 p-4 px-6 rounded-xl border-2 z-[9999] max-w-[280px]"
                    >
                        <p className="m-0 text-[0.95rem] font-medium">
                            {t("chat.loginRequired")}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Chat Dialog ── */}
            <AnimatePresence>
                {showChat && isLoggedIn && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0, bottom: dialogBottom }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.3 }}
                        style={{
                            backgroundColor: tokens.colors.bg,
                            borderColor: tokens.colors.border,
                            boxShadow: tokens.shadows.lg,
                            bottom: dialogBottom,
                            maxHeight: `calc(100dvh - ${dialogBottom + 80}px)`,
                        }}
                        className="chat-dialog-container fixed right-2 sm:right-8 rounded-[16px] sm:rounded-[20px] w-[calc(100%-1rem)] sm:w-[calc(100%-4rem)] max-w-[400px] h-[600px] flex flex-col border overflow-hidden z-[9999]"

                    >
                        {/* Custom Selection Color */}
                        <style>{`
                            .chat-dialog-container *::selection {
                                background-color: ${tokens.colors.primary} !important;
                                color: white !important;
                                -webkit-text-fill-color: white !important;
                            }
                        `}</style>
                        {/* Header */}
                        <div style={{ background: `linear-gradient(135deg, ${tokens.colors.primary}, ${tokens.colors.secondary})` }}
                            className="flex items-center justify-between p-4 sm:p-6 text-white">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <MessageCircle size={32} className="sm:hidden" />
                                <MessageCircle size={40} className="hidden sm:block" />
                                <div>
                                    <h3 className="m-0 text-base sm:text-xl font-bold">{t("chat.title")}</h3>
                                    <span className="text-[0.78rem] sm:text-[0.85rem] opacity-90 block mt-0.5 sm:mt-1">{t("hero.titlePart1")} {t("hero.titlePart2")}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={handleResetChat} title={t("chat.clearChat")}
                                    className="bg-white/20 border-0 text-white w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 hover:bg-white/30 hover:rotate-[-90deg]">
                                    <RotateCcw size={18} />
                                </button>
                                <button onClick={() => setShowChat(false)}
                                    className="bg-white/20 border-0 text-white w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 hover:bg-white/30 hover:rotate-90">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div ref={messagesRef}
                            style={{ backgroundColor: tokens.colors.surface }}
                            className="flex-1 p-3 sm:p-6 flex flex-col gap-3 sm:gap-4 overflow-y-auto">
                            {messages.map((msg, index) =>
                                msg.role === "bot" ? (
                                    <motion.div key={index} className="flex gap-3"
                                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                                        <div style={{ background: `linear-gradient(135deg, ${tokens.colors.primary}, ${tokens.colors.secondary})` }}
                                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[0.9rem] flex-shrink-0 text-white">
                                            AI
                                        </div>
                                        <div style={{ backgroundColor: tokens.colors.bg, boxShadow: tokens.shadows.sm, position: "relative" }}
                                            className="p-4 rounded-2xl max-w-[75%] group" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                                            <p style={{ color: tokens.colors.text, whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                                                className="m-0 mb-2 leading-relaxed text-[0.9rem]">
                                                {renderBotText(msg.text)}
                                            </p>
                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                                <span style={{ color: tokens.colors.textSub }} className="text-xs opacity-70">
                                                    {formatTime(msg.time)}
                                                </span>
                                                <button onClick={() => handleCopy(msg.text, index)}
                                                    className="bg-transparent border-0 p-1 flex items-center justify-center cursor-pointer transition-all duration-200 opacity-40 group-hover:opacity-100 hover:scale-110"
                                                    title={t("chat.copyTooltip")}>
                                                    {copiedIndex === index
                                                        ? <Check size={14} className="text-green-500" />
                                                        : <Copy size={14} style={{ color: tokens.colors.primary }} />}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div key={index} className="flex gap-3 flex-row-reverse"
                                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                                        <UserAvatar user={currentUser} size="sm" showHoverEffect={false} />
                                        <div style={{ background: `linear-gradient(135deg, ${tokens.colors.primary}, ${tokens.colors.secondary})` }}
                                            className="p-4 rounded-2xl max-w-[75%] text-white group relative" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                                            <p className="m-0 mb-2 leading-relaxed text-[0.9rem]"
                                                style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                                {msg.text}
                                            </p>
                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/20">
                                                <span className="text-xs opacity-70 block">{formatTime(msg.time)}</span>
                                                <button onClick={() => handleCopy(msg.text, index)}
                                                    className="bg-transparent border-0 p-1 flex items-center justify-center cursor-pointer transition-all duration-200 opacity-40 group-hover:opacity-100 hover:scale-110"
                                                    title={t("chat.copyTooltip")}>
                                                    {copiedIndex === index
                                                        ? <Check size={14} className="text-white" />
                                                        : <Copy size={14} className="text-white" />}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            )}

                            {isLoading && (
                                <motion.div className="flex gap-3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                                    <div style={{ background: `linear-gradient(135deg, ${tokens.colors.primary}, ${tokens.colors.secondary})` }}
                                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[0.9rem] flex-shrink-0 text-white">
                                        AI
                                    </div>
                                    <div style={{ backgroundColor: tokens.colors.bg, boxShadow: tokens.shadows.sm }}
                                        className="p-4 rounded-2xl flex items-center gap-2">
                                        <div
                                            className="premium-loader-ring"
                                            style={{
                                                width: 18,
                                                height: 18,
                                                "--loader-primary": tokens.colors.primary,
                                                "--loader-accent": tokens.colors.gold || tokens.colors.secondary,
                                                "--loader-muted": tokens.colors.border,
                                            }}
                                        />
                                        <span style={{ color: tokens.colors.textSub }} className="text-sm">{t("chat.thinking")}</span>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Input */}
                        <div style={{ backgroundColor: tokens.colors.bg, borderColor: tokens.colors.border }}
                            className="flex flex-col border-t">
                            <AnimatePresence>
                                {isListening ? (
                                    <motion.div key="listening"
                                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                        className={`flex items-center gap-2 px-4 pt-2 ${language === 'ar' ? 'justify-start flex-row-reverse' : 'justify-end'}`}>
                                        <span className="text-xs font-semibold" style={{ color: tokens.colors.textSub }}>{language === 'ar' ? 'لغة المايك:' : 'Speak in:'}</span>
                                        {[{ code: 'ar-EG', label: 'عربي' }, { code: 'en-US', label: 'English' }].map(({ code, label }) => (
                                            <button key={code}
                                                onClick={() => { recognitionRef.current?.stop(); setIsListening(false); setMicLang(code); }}
                                                className="px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all duration-200"
                                                style={{
                                                    backgroundColor: micLang === code ? '#ef4444' : tokens.colors.surface,
                                                    color: micLang === code ? 'white' : tokens.colors.textSub,
                                                    border: `1.5px solid ${micLang === code ? '#ef4444' : tokens.colors.border}`,
                                                }}>
                                                {label}
                                            </button>
                                        ))}
                                    </motion.div>
                                ) : (
                                    <motion.div key="idle"
                                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                        className={`flex items-center gap-1 px-4 pt-2 ${language === 'ar' ? 'justify-start flex-row-reverse' : 'justify-end'}`}>
                                        <span className="text-xs" style={{ color: tokens.colors.textSub }}>{language === 'ar' ? 'لغة المايك:' : 'Mic language:'}</span>
                                        {[{ code: 'ar-EG', label: 'AR' }, { code: 'en-US', label: 'EN' }].map(({ code, label }) => (
                                            <button key={code} onClick={() => setMicLang(code)}
                                                className="px-2 py-0.5 rounded-full text-xs font-bold cursor-pointer transition-all duration-200"
                                                style={{
                                                    backgroundColor: micLang === code ? tokens.colors.primary : 'transparent',
                                                    color: micLang === code ? 'white' : tokens.colors.textSub,
                                                    border: `1.5px solid ${micLang === code ? tokens.colors.primary : tokens.colors.border}`,
                                                }}>
                                                {label}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                                <button onClick={toggleMic} disabled={isLoading}
                                    title={isListening ? 'Stop recording' : `Speak to AI (${micLang === 'ar-EG' ? 'Arabic' : 'English'})`}
                                    className="relative flex-shrink-0 border-0 w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                                    style={{
                                        background: isListening ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : tokens.colors.surface,
                                        border: `2px solid ${isListening ? '#ef4444' : tokens.colors.border}`,
                                    }}>
                                    {isListening && <span className="absolute inset-0 rounded-xl animate-ping opacity-40" style={{ backgroundColor: '#ef4444' }} />}
                                    {isListening
                                        ? <MicOff size={16} className="text-white relative z-10" />
                                        : <Mic size={16} style={{ color: tokens.colors.textSub }} className="relative z-10" />}
                                </button>

                                <textarea ref={textareaRef}
                                    placeholder={isListening ? `🎙️ Listening (${micLang === 'ar-EG' ? 'Arabic' : 'English'})...` : t("chat.typeMessage")}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    disabled={isLoading}
                                    dir={micLang === 'ar-EG' ? 'rtl' : 'ltr'}
                                    style={{
                                        borderColor: isListening ? '#ef4444' : tokens.colors.border,
                                        backgroundColor: tokens.colors.surface,
                                        color: tokens.colors.text,
                                        opacity: isLoading ? 0.6 : 1,
                                        resize: "none",
                                        overflowY: message.split('\n').length > 5 || (textareaRef.current?.scrollHeight > 150) ? "auto" : "hidden",
                                        maxHeight: "120px",
                                        minHeight: "40px"
                                    }}
                                    className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border-2 rounded-xl text-[0.85rem] sm:text-[0.95rem] outline-none transition-all duration-300 placeholder:opacity-60"
                                    onFocus={(e) => { e.target.style.borderColor = isListening ? '#ef4444' : tokens.colors.primary; }}
                                    onBlur={(e) => { e.target.style.borderColor = isListening ? '#ef4444' : tokens.colors.border; }}
                                    onKeyDown={handleKeyDown}
                                    rows={1}
                                />

                                <button
                                    onClick={() => { if (isListening) { recognitionRef.current?.stop(); setIsListening(false); } handleSendMessage(); }}
                                    disabled={isLoading || !message.trim()}
                                    style={{
                                        background: isLoading || !message.trim()
                                            ? "#9ca3af"
                                            : `linear-gradient(135deg, ${tokens.colors.primary}, ${tokens.colors.secondary})`,
                                    }}
                                    className="border-0 text-white w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:hover:scale-100 flex-shrink-0">
                                    {isLoading ? (
                                        <div
                                            className="premium-loader-ring"
                                            style={{
                                                width: 20,
                                                height: 20,
                                                "--loader-primary": "#ffffff",
                                                "--loader-accent": tokens.colors.gold || tokens.colors.secondary,
                                                "--loader-muted": "rgba(255,255,255,0.35)",
                                            }}
                                        />
                                    ) : <Send size={20} />}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default FloatingChatButton;