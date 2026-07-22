import MotionReveal from "./MotionReveal";
import { useLanguage } from "../i18n/LanguageContext";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import Swal from 'sweetalert2';
import { displayFormattedPhone } from '../data/countries';

const Contact = () => {
    const { themeName } = useTheme();
    const { t, language } = useLanguage();
    const tokens = designTokens[themeName];

    const handleContactClick = () => {
        const phone = t("footer.phone") || "+20 122 715 6457";
        const email = t("footer.email") || "aqarico8@gmail.com";
        const name = t("common.aqaricoTeam");
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
            footer: `<a href="mailto:${email}" style="color: ${tokens.colors.primary}; font-weight: bold; text-decoration: underline;">${t('footer.mail')}: ${email}</a>`,
            willOpen: (popup) => {
                popup.dir = language === 'ar' ? 'rtl' : 'ltr';
            },
            customClass: {
                popup: 'rounded-[2rem] border shadow-2xl',
                confirmButton: 'rounded-xl px-6 py-3 font-bold',
                denyButton: 'rounded-xl px-6 py-3 font-bold',
                cancelButton: 'rounded-xl px-6 py-3 font-bold',
                footer: 'border-t-0 pt-0'
            }
        }).then(result => {
            if (result.isConfirmed) window.open(whatsappUrl, '_blank');
            else if (result.isDenied) window.location.href = telUrl;
        });
    };

    return (
        <section
            style={{
                backgroundColor: tokens.colors.surface,
                color: tokens.colors.text,
            }}
            className="py-20 px-6 text-center transition-colors duration-500"
        >
            <MotionReveal>
                <h2
                    style={{
                        fontSize: tokens.typography.headings.h2,
                        fontWeight: tokens.typography.weight.bold,
                        marginBottom: tokens.spacing.xl,
                    }}
                >
                    {t("landing.contact.title")}
                </h2>
                <p style={{ color: tokens.colors.textSub }}>
                    {t("landing.contact.subtitle")}
                </p>
                <button
                    onClick={handleContactClick}
                    style={{
                        backgroundColor: tokens.colors.primary,
                        color: tokens.colors.surface,
                        padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
                        borderRadius: tokens.borderRadius.lg,
                        marginTop: tokens.spacing.lg,
                    }}
                    className="premium-focus transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 active:scale-[0.98] cursor-pointer font-bold"
                >
                    {t("landing.contact.btn")}
                </button>
            </MotionReveal>
        </section>
    );
};
export default Contact;
