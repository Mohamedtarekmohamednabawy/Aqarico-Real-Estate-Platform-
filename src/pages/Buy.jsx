import PropertyListingPage from "../components/PropertyListingPage";
import { useLanguage } from "../i18n/LanguageContext";

const Buy = () => {
    const { t } = useLanguage();
    return (
        <PropertyListingPage
            pageTitle={t("listing.buyTitle")}
            pageSubtitle={t("listing.buySubtitle")}
            listingType="sale"
            defaultMaxPrice={100000000}
        />
    );
}

export default Buy;
