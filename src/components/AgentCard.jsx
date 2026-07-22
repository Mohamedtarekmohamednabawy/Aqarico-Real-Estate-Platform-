import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Phone,
    Mail,
    MessageCircle,
    CheckCircle,
    MapPin,
    Home,
    Star,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Award,
} from "lucide-react";
import { displayFormattedPhone } from "../data/countries";
import { useCurrency } from "../context/CurrencyContext";
import { useLanguage } from "../i18n/LanguageContext";
import { optimizeImageUrl } from "../utils/imageUrl";

/* ─── helpers ────────────────────────────────────────────────────────────── */
const getPhoneHref = (p, country = "EG") => {
    if (!p) return "";
    const formatted = displayFormattedPhone(p, country);
    return `tel:${formatted.replace(/[^\d+]/g, "")}`;
};
const getEmailHref = (e) => { const c = String(e || "").trim(); return c ? `mailto:${c}` : ""; };
const getWhatsApp = (p, msg = "", country = "EG") => {
    if (!p) return "";
    const formatted = displayFormattedPhone(p, country);
    const d = formatted.replace(/\D/g, "");
    return `https://wa.me/${d}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;
};

const AVATAR_SEEDS = [
    { bg: "#FAC775", color: "#633806" },
    { bg: "#F5C4B3", color: "#712B13" },
    { bg: "#9FE1CB", color: "#085041" },
    { bg: "#CED1F6", color: "#3C3489" },
    { bg: "#B5D4F4", color: "#0C447C" },
    { bg: "#C0DD97", color: "#27500A" },
];

const getInitials = (name = "") =>
    name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

/* ─────────────────────────────────────────────────────────────────────────────
   AgentCard
   Props:
     agent            — agent object from backend
     tokens           — designTokens[themeName].colors / full tokens object
     index            — position in list (drives avatar seed)
     listings         — pre-fetched property array for this agent
     loadingListings  — bool: show spinner in listings panel
     onToggleListings — callback(agent) when user opens listings tab
     compact          — bool: render smaller version for homepage preview
 ────────────────────────────────────────────────────────────────────────────── */
const AgentCard = ({
    agent,
    tokens,
    index = 0,
    listings = [],
    loadingListings = false,
    onToggleListings,
    compact = false,
}) => {
    const { formatPrice } = useCurrency();
    const { t, language } = useLanguage();
    const tokensResolved = tokens.colors ?? tokens;
    const seed = AVATAR_SEEDS[index % AVATAR_SEEDS.length];
    const [listingsOpen, setListingsOpen] = useState(false);
    const [revealedContact, setRevealedContact] = useState({ phone: false, email: false });

    /* normalise backend shape */
    const name = agent.name || `${agent.firstName ?? ""} ${agent.lastName ?? ""}`.trim();
    const rawPhone = agent.phone || agent.phoneNumber || agent.user?.phone || "";
    const phone = rawPhone
        ? (displayFormattedPhone ? displayFormattedPhone(rawPhone, agent.user?.country || "EG") : rawPhone)
        : "";
    const email = agent.email || agent.user?.email || "";
    const avatar = agent.avatar || agent.profileImage || agent.user?.avatar || "";
    const agentLocation = agent.location || "";
    const agentDistrict = agent.district || agent.area || "";
    const bio = agent.bio || agent.description || "";
    const totalSales = agent.assignedListings?.length ?? agent.listingsCount ?? agent.totalSales ?? agent.totalProperties ?? listings.length ?? 0;
    const rating = agent.rating ?? null;
    const specialty = agent.specialty || agent.specialization || "";
    const verified = agent.isVerified ?? agent.isVerifiedByAdmin ?? agent.verified ?? false;

    const waMsg = t("agentCard.waMsg", { name: name || t("agentCard.agent") });
    const userCountry = agent.user?.country || "EG";
    const whatsappHref = getWhatsApp(rawPhone, waMsg, userCountry);

    const displayListings = listingsOpen ? listings : listings.slice(0, 5);

    const handleListingsToggle = () => {
        const next = !listingsOpen;
        setListingsOpen(next);
        if (next && onToggleListings) onToggleListings(agent);
    };

    const revealContact = (type) => {
        setRevealedContact((prev) => ({ ...prev, [type]: true }));
    };

    return (
        <motion.article
            whileHover={compact ? { y: -5 } : undefined}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ backgroundColor: tokensResolved.surface, borderColor: tokensResolved.border, color: tokensResolved.text }}
            className="rounded-3xl border overflow-hidden flex flex-col shadow-sm hover:shadow-lg transition-shadow duration-300 relative group"
        >
            {/* accent glow top-right */}
            <div
                className="absolute top-0 right-0 w-36 h-36 opacity-10 pointer-events-none transition-transform group-hover:scale-125 duration-700"
                style={{ background: `radial-gradient(circle at top right, ${seed.bg}, transparent)`, borderBottomLeftRadius: "100%" }}
            />

            {/* seed stripe */}
            <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${seed.bg}, ${tokensResolved.primary})` }} />

            {/* ── avatar + name ── */}
            <div className="px-5 pt-5 pb-3 flex items-start gap-4">
                <div className="relative shrink-0">
                    {avatar ? (
                        <img
                            src={optimizeImageUrl(avatar, {
                                width: compact ? 112 : 136,
                                height: compact ? 112 : 136,
                                quality: 72,
                            })}
                            alt={name}
                            width={compact ? 56 : 68}
                            height={compact ? 56 : 68}
                            loading="lazy"
                            decoding="async"
                            className="rounded-2xl object-cover transition-transform duration-500 group-hover:scale-105"
                            style={{
                                width: compact ? 56 : 68,
                                height: compact ? 56 : 68,
                                border: `2px solid ${seed.bg}`,
                                imageRendering: 'auto',
                                WebkitBackfaceVisibility: 'hidden',
                                backfaceVisibility: 'hidden',
                                transform: 'translateZ(0)'
                            }}
                        />
                    ) : (
                        <div
                            className="rounded-2xl flex items-center justify-center font-black"
                            style={{ width: compact ? 56 : 68, height: compact ? 56 : 68, background: seed.bg, color: seed.color, fontSize: compact ? 16 : 20 }}
                        >
                            {getInitials(name) || "?"}
                        </div>
                    )}
                    {verified && (
                        <div
                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow"
                            style={{ backgroundColor: tokensResolved.primary }}
                            title={t("agentCard.verified")}
                        >
                            <CheckCircle size={12} color="#fff" strokeWidth={3} />
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black truncate" style={{ fontSize: compact ? 14 : 16 }}>{name || t("agentCard.agent")}</h3>
                        {verified && (
                            <span
                                className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0"
                                style={{ backgroundColor: `${tokensResolved.primary}15`, color: tokensResolved.primary }}
                            >
                                {t("agentCard.verified")}
                            </span>
                        )}
                    </div>

                    {specialty ? (
                        <p className="text-xs font-semibold mt-0.5 flex items-center gap-1" style={{ color: tokensResolved.primary }}>
                            <Award size={11} /> {specialty}
                        </p>
                    ) : (
                        <p className="text-xs font-semibold mt-0.5 flex items-center gap-1" style={{ color: tokensResolved.primary }}>
                            <Award size={11} /> {t("agentCard.premierAgent")}
                        </p>
                    )}

                    {agentDistrict && (
                        <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: tokensResolved.textSub }}>
                            <MapPin size={11} /> <strong>{agentDistrict}</strong> {agentLocation && `• ${agentLocation}`}
                        </p>
                    )}

                    <div className="flex items-center gap-3 mt-1.5">
                        {totalSales > 0 && (
                            <span className="text-xs flex items-center gap-1" style={{ color: tokensResolved.textSub }}>
                                <Home size={11} />
                                <span className="font-bold" style={{ color: tokensResolved.text }}>{totalSales}</span> {t("agentCard.listings")}
                            </span>
                        )}
                        {rating !== null && (
                            <span className="text-xs flex items-center gap-1" style={{ color: tokensResolved.textSub }}>
                                <Star size={11} fill={tokensResolved.primary} stroke={tokensResolved.primary} />
                                <span className="font-bold" style={{ color: tokensResolved.text }}>{Number(rating).toFixed(1)}</span>
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* bio */}
            {bio ? (
                <p className="px-5 pb-3 text-xs leading-relaxed line-clamp-2" style={{ color: tokensResolved.textSub }}>
                    {bio}
                </p>
            ) : (
                <p className="px-5 pb-3 text-xs leading-relaxed line-clamp-2" style={{ color: tokensResolved.textSub }}>
                    {t("agentCard.fallbackBio", { name: name || t("agentCard.agent") })}
                </p>
            )}

            <div className="mx-5 border-t" style={{ borderColor: tokensResolved.border }} />

            {/* ── Contact details strip with reveal pattern ── */}
            <div
                className="mx-5 mt-3 rounded-2xl px-4 py-2.5 flex flex-col gap-2"
                style={{ backgroundColor: tokensResolved.bg, border: `1px solid ${tokensResolved.border}` }}
            >
                {/* Phone */}
                {rawPhone ? (
                    revealedContact.phone ? (
                        <div className="space-y-2">
                            <p className="text-xs font-mono flex items-center gap-2">
                                <Phone size={11} style={{ color: tokensResolved.primary, flexShrink: 0 }} />
                                <span style={{ color: tokensResolved.text }} dir="ltr">{phone}</span>
                            </p>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => revealContact("phone")}
                            className="text-xs font-bold flex items-center gap-2 cursor-pointer hover:underline"
                            style={{ color: tokensResolved.primary }}
                        >
                            <Phone size={11} /> {t("agentCard.showPhone")}
                        </button>
                    )
                ) : (
                    <p className="text-xs flex items-center gap-2" style={{ color: tokensResolved.textSub }}>
                        <Phone size={11} style={{ color: tokensResolved.textSub }} /> {t("agentCard.phoneUnavailable")}
                    </p>
                )}

                {/* Email */}
                {email ? (
                    revealedContact.email ? (
                        <p className="text-xs font-mono flex items-center gap-2 min-w-0">
                            <Mail size={11} style={{ color: tokensResolved.primary, flexShrink: 0 }} />
                            <span style={{ color: tokensResolved.text }} className="truncate">{email}</span>
                        </p>
                    ) : (
                        <button
                            type="button"
                            onClick={() => revealContact("email")}
                            className="text-xs font-bold flex items-center gap-2 cursor-pointer hover:underline"
                            style={{ color: tokensResolved.primary }}
                        >
                            <Mail size={11} /> {t("agentCard.showEmail")}
                        </button>
                    )
                ) : (
                    <p className="text-xs flex items-center gap-2" style={{ color: tokensResolved.textSub }}>
                        <Mail size={11} style={{ color: tokensResolved.textSub }} /> {t("agentCard.emailUnavailable")}
                    </p>
                )}
            </div>

            {/* ── Action buttons (only appear after reveal) ── */}
            <div className="px-5 py-3 flex gap-2 flex-wrap">
                {rawPhone && revealedContact.phone && (
                    <a
                        href={getPhoneHref(rawPhone, agent.user?.country || "EG")}
                        className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90 active:scale-95"
                        style={{ backgroundColor: `${tokensResolved.primary}18`, color: tokensResolved.primary }}
                    >
                        <Phone size={13} strokeWidth={2.5} /> {t("agentCard.call")}
                    </a>
                )}
                {email && revealedContact.email && (
                    <a
                        href={getEmailHref(email)}
                        className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90 active:scale-95"
                        style={{ backgroundColor: `${tokensResolved.primary}10`, color: tokensResolved.primary }}
                    >
                        <Mail size={13} strokeWidth={2.5} /> {t("agentCard.email")}
                    </a>
                )}
                {whatsappHref && revealedContact.phone && (
                    <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90 active:scale-95"
                        style={{ backgroundColor: "#25D36618", color: "#128C7E" }}
                    >
                        <MessageCircle size={13} strokeWidth={2.5} /> {t("agentCard.whatsapp")}
                    </a>
                )}
            </div>

            {/* ── listings toggle (full page only, hidden in compact) ── */}
            {!compact && (
                <div className="mt-auto">
                    <button
                        onClick={handleListingsToggle}
                        className="w-full flex items-center justify-between px-5 py-3 text-xs font-black uppercase tracking-widest transition-all border-t cursor-pointer"
                        style={{
                            borderColor: tokensResolved.border,
                            color: listingsOpen ? tokensResolved.primary : tokensResolved.textSub,
                            backgroundColor: listingsOpen ? `${tokensResolved.primary}08` : "transparent",
                        }}
                    >
                        <span className="flex items-center gap-2">
                            <Home size={13} />
                            {loadingListings ? t("agentCard.loading") : `${t("agentCard.viewListings")}${totalSales > 0 ? ` (${totalSales})` : ""}`}
                        </span>
                        {listingsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    <motion.div
                        initial={false}
                        animate={{ height: listingsOpen ? "auto" : 0, opacity: listingsOpen ? 1 : 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                    >
                        {listingsOpen && (
                            <div className="px-4 pb-4 pt-3 flex flex-col gap-3">
                                {loadingListings ? (
                                    <div className="text-center py-6" style={{ color: tokensResolved.textSub }}>
                                        <div className="w-5 h-5 border-2 rounded-full border-t-transparent animate-spin mx-auto mb-2" style={{ borderColor: tokensResolved.primary }} />
                                        <p className="text-xs">{t("agentCard.fetching")}</p>
                                    </div>
                                ) : listings.length === 0 ? (
                                    <p className="text-center py-4 text-xs" style={{ color: tokensResolved.textSub }}>{t("agentCard.noListings")}</p>
                                ) : (
                                    <>
                                        {displayListings.map((prop) => (
                                            <Link
                                                key={prop._id}
                                                to={`/property/${prop._id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3 rounded-2xl p-3 transition-all hover:opacity-80 group/prop cursor-pointer"
                                                style={{ backgroundColor: tokensResolved.bg, border: `1px solid ${tokensResolved.border}` }}
                                            >
                                                {prop.images?.[0] ? (
                                                    <img
                                                        src={optimizeImageUrl(prop.images[0], {
                                                            width: 160,
                                                            height: 120,
                                                            quality: 68,
                                                        })}
                                                        alt={prop.title}
                                                        width={56}
                                                        height={40}
                                                        loading="lazy"
                                                        decoding="async"
                                                        className="w-14 h-10 rounded-xl object-cover shrink-0"
                                                        style={{
                                                            imageRendering: 'auto',
                                                            WebkitBackfaceVisibility: 'hidden',
                                                            backfaceVisibility: 'hidden',
                                                            transform: 'translateZ(0)'
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-14 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${tokensResolved.primary}15` }}>
                                                        <Home size={16} style={{ color: tokensResolved.primary }} />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold line-clamp-1" style={{ color: tokensResolved.text }}>{prop.title}</p>
                                                    <p className="text-xs font-black mt-0.5" style={{ color: tokensResolved.primary }}>
                                                        {prop.price ? formatPrice(prop.price) : t("common.priceOnRequest")}
                                                    </p>
                                                </div>
                                                <ExternalLink size={12} className="shrink-0 opacity-0 group-hover/prop:opacity-40 transition-opacity" />
                                            </Link>
                                        ))}
                                        {listings.length > 0 && (
                                            <button
                                                onClick={(e) => { e.preventDefault(); setListingsOpen(v => !v); }}
                                                className="text-xs font-bold py-2 rounded-xl w-full transition-all cursor-pointer"
                                                style={{ color: tokensResolved.primary, backgroundColor: `${tokensResolved.primary}10` }}
                                            >
                                                {listingsOpen
                                                    ? t("agentCard.showLess")
                                                    : listings.length > 5 ? t("agentCard.moreListings", { count: listings.length - 5 }) : t("agentCard.expandListings")}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </motion.article>
    );
};

export default AgentCard;
