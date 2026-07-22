import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import {
    Mail,
    Phone,
    MapPin,
} from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import Swal from 'sweetalert2';
import { displayFormattedPhone } from '../data/countries';
import logoEN160 from "../assets/EN_Logo-160.png";
import logoEN320 from "../assets/EN_Logo-320.png";
import logoENWebp from "../assets/EN_Logo-320.webp";
import logoAR160 from "../assets/AR_Logo-160.png";
import logoAR320 from "../assets/AR_Logo-320.png";
import logoARWebp from "../assets/AR_Logo-320.webp";

const Footer = () => {
    const { themeName } = useTheme();
    const { t, language } = useLanguage();
    const tokens = designTokens[themeName];
    const logo = language === 'ar'
        ? { src: logoAR160, srcSet: `${logoAR160} 160w, ${logoAR320} 320w`, webp: logoARWebp }
        : { src: logoEN160, srcSet: `${logoEN160} 160w, ${logoEN320} 320w`, webp: logoENWebp };

    const handlePhoneClick = () => {
        const phone = t("footer.phone") || "+20 122 715 6457";
        const name = "Aqarico Support";
        const formatted = displayFormattedPhone(phone, 'EG');
        const cleanPhone = formatted.replace(/\D/g, '');
        const whatsappUrl = `https://wa.me/${cleanPhone}`;
        const telUrl = `tel:${formatted.replace(/[^\d+]/g, '')}`;

        Swal.fire({
            title: t('about.contactOptions'),
            text: t('about.howToReach', { name }),
            icon: 'question',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: t('about.whatsapp'),
            denyButtonText: t('about.call'),
            cancelButtonText: t('about.cancel'),
            confirmButtonColor: '#25D366',
            denyButtonColor: tokens.colors.primary,
            background: tokens.colors.surface || tokens.colors.bg,
            color: tokens.colors.text,
            customClass: {
                popup: 'rounded-[2rem] border shadow-2xl',
                confirmButton: 'rounded-xl px-6 py-3 font-bold',
                denyButton: 'rounded-xl px-6 py-3 font-bold',
                cancelButton: 'rounded-xl px-6 py-3 font-bold',
            }
        }).then(result => {
            if (result.isConfirmed) window.open(whatsappUrl, '_blank');
            else if (result.isDenied) window.location.href = telUrl;
        });
    };

    return (
        <footer
            style={{
                backgroundColor: tokens.colors.bg,
                color: tokens.colors.text,
            }}
            className="transition-colors duration-500 pt-16 pb-8 px-6"
        >
            {/* Top Section */}
            <div
                className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-12"
                dir={language === 'ar' ? 'rtl' : 'ltr'}
            >
                {/* Brand */}
                <div className="text-start max-w-sm">
                    <a
                        href="/"
                        style={{ color: tokens.colors.text }}
                        className="inline-block cursor-pointer select-none"
                    >
                        <picture>
                            <source srcSet={logo.webp} type="image/webp" />
                            <img
                                src={logo.src}
                                srcSet={logo.srcSet}
                                sizes="160px"
                                alt={t("common.logoAlt")}
                                width={160}
                                height={40}
                                loading="lazy"
                                decoding="async"
                                className="h-10 w-auto hover:scale-110 transition-transform duration-300"
                            />
                        </picture>
                    </a>
                    <p
                        style={{ color: tokens.colors.textSub }}
                        className="mt-6 text-sm leading-relaxed whitespace-pre-line"
                    >
                        {t("footer.brandDescription")}
                    </p>
                </div>

                {/* Quick Links */}
                <div className="text-start">
                    <h3
                        className="font-bold text-lg mb-6"
                        style={{ color: tokens.colors.text }}
                    >
                        {t("footer.quickLinks")}
                    </h3>
                    <ul className="flex flex-col gap-4">
                        {[
                            { key: "home", href: "/" },
                            { key: "buy", href: "/buy" },
                            { key: "rent", href: "/rent" },
                            { key: "sell", href: "/sell" },
                            { key: "findAgent", href: "/agents" },
                            { key: "aboutUs", href: "/about" },
                        ].map((link) => (
                            <li key={link.key}>
                                <a
                                    href={link.href}
                                    style={{ color: tokens.colors.textSub }}
                                    className="text-sm transition-all duration-300 hover:text-blue-500 inline-block cursor-pointer"
                                >
                                    {t(`nav.${link.key}`)}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Trust & Verification */}
                <div className="text-start">
                    <h3
                        className="font-bold text-lg mb-6"
                        style={{ color: tokens.colors.text }}
                    >
                        {t("footer.trustTitle")}
                    </h3>
                    <p
                        style={{ color: tokens.colors.textSub }}
                        className="text-sm leading-relaxed m-0 mb-8"
                    >
                        {t("footer.trustDescription")}
                    </p>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <MapPin size={18} style={{ color: tokens.colors.primary }} />
                            <span className="text-sm font-semibold" style={{ color: tokens.colors.textSub }}>{t("footer.address")}</span>
                        </div>

                        <button
                            onClick={handlePhoneClick}
                            className="flex items-center gap-3 group transition-all duration-300 w-fit cursor-pointer bg-transparent border-none p-0"
                        >
                            <Phone size={18} style={{ color: tokens.colors.primary }} className="group-hover:scale-110 transition-transform" />
                            <span
                                className="text-sm font-bold group-hover:underline transition-opacity"
                                style={{ color: tokens.colors.textSub, direction: 'ltr', unicodeBidi: 'embed' }}
                            >
                                {displayFormattedPhone(t("footer.phone") || "+20 122 715 6457", 'EG')}
                            </span>
                        </button>

                        <a
                            href={`mailto:${t("footer.email") || "aqarico8@gmail.com"}`}
                            className="flex items-center gap-3 group transition-all duration-300 w-fit cursor-pointer"
                        >
                            <Mail size={18} style={{ color: tokens.colors.primary }} className="group-hover:scale-110 transition-transform" />
                            <span
                                className="text-sm font-bold group-hover:underline transition-opacity"
                                style={{ color: tokens.colors.textSub }}
                            >
                                {t("footer.email") || "aqarico8@gmail.com"}
                            </span>
                        </a>
                    </div>
                </div>
            </div>

            {/* Bottom Section */}
            <div
                className="border-t"
                style={{
                    borderColor: tokens.colors.border,
                    paddingTop: tokens.spacing.md,
                }}
            >
                <p
                    className="text-center text-sm"
                    style={{ color: tokens.colors.textSub }}
                >
                    {t("footer.copyright")}
                </p>
            </div>
        </footer>
    );
};

export default Footer;