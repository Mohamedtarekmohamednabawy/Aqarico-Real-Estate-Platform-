import PropertyListingPage from "../components/PropertyListingPage";
import { useLanguage } from "../i18n/LanguageContext";

const Rent = () => {
    const { t } = useLanguage();
    return (
        <PropertyListingPage
            pageTitle={t("listing.rentTitle")}
            pageSubtitle={t("listing.rentSubtitle")}
            listingType="rent"
            defaultMaxPrice={10000000}
        />
    );
}

export default Rent;
