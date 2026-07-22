// Countries with phone formats and validation rules - Enhanced with more Arab countries
export const countries = [
    // Arab Countries (GCC + MENA)
    { code: "EG", name: "Egypt", dial: "+20", flag: "🇪🇬", format: "### ### ####", minLength: 10, maxLength: 11 },
    { code: "SA", name: "Saudi Arabia", dial: "+966", flag: "🇸🇦", format: "### ### ####", minLength: 9, maxLength: 10 },
    { code: "AE", name: "United Arab Emirates", dial: "+971", flag: "🇦🇪", format: "## ### ####", minLength: 9, maxLength: 10 },
    { code: "KW", name: "Kuwait", dial: "+965", flag: "🇰🇼", format: "#### ####", minLength: 8, maxLength: 9 },
    { code: "QA", name: "Qatar", dial: "+974", flag: "🇶🇦", format: "#### ####", minLength: 8, maxLength: 9 },
    { code: "BH", name: "Bahrain", dial: "+973", flag: "🇧🇭", format: "#### ####", minLength: 8, maxLength: 9 },
    { code: "OM", name: "Oman", dial: "+968", flag: "🇴🇲", format: "#### ####", minLength: 8, maxLength: 9 },
    { code: "JO", name: "Jordan", dial: "+962", flag: "🇯🇴", format: "# #### ####", minLength: 9, maxLength: 10 },
    { code: "LB", name: "Lebanon", dial: "+961", flag: "🇱🇧", format: "## ### ###", minLength: 8, maxLength: 9 },
    { code: "IQ", name: "Iraq", dial: "+964", flag: "🇮🇶", format: "### ### ####", minLength: 10, maxLength: 11 },
    { code: "SY", name: "Syria", dial: "+963", flag: "🇸🇾", format: "### ### ###", minLength: 9, maxLength: 10 },
    { code: "YE", name: "Yemen", dial: "+967", flag: "🇾🇪", format: "### ### ###", minLength: 9, maxLength: 10 },
    { code: "PS", name: "Palestine", dial: "+970", flag: "🇵🇸", format: "### ### ###", minLength: 9, maxLength: 10 },
    { code: "MA", name: "Morocco", dial: "+212", flag: "🇲🇦", format: "###-######", minLength: 9, maxLength: 10 },
    { code: "DZ", name: "Algeria", dial: "+213", flag: "🇩🇿", format: "### ## ## ##", minLength: 9, maxLength: 10 },
    { code: "TN", name: "Tunisia", dial: "+216", flag: "🇹🇳", format: "## ### ###", minLength: 8, maxLength: 9 },
    { code: "LY", name: "Libya", dial: "+218", flag: "🇱🇾", format: "##-#######", minLength: 9, maxLength: 10 },
    { code: "SD", name: "Sudan", dial: "+249", flag: "🇸🇩", format: "## ### ####", minLength: 9, maxLength: 10 },
    { code: "SO", name: "Somalia", dial: "+252", flag: "🇸🇴", format: "## ### ###", minLength: 8, maxLength: 10 },
    { code: "DJ", name: "Djibouti", dial: "+253", flag: "🇩🇯", format: "## ## ## ##", minLength: 8, maxLength: 9 },
    { code: "KM", name: "Comoros", dial: "+269", flag: "🇰🇲", format: "### ####", minLength: 7, maxLength: 8 },
    { code: "MR", name: "Mauritania", dial: "+222", flag: "🇲🇷", format: "## ## ## ##", minLength: 8, maxLength: 9 },

    // Major International Countries
    { code: "US", name: "United States", dial: "+1", flag: "🇺🇸", format: "(###) ###-####", minLength: 10, maxLength: 11 },
    { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧", format: "#### ### ####", minLength: 10, maxLength: 11 },
    { code: "TR", name: "Turkey", dial: "+90", flag: "🇹🇷", format: "(###) ### ####", minLength: 10, maxLength: 11 },
    { code: "IR", name: "Iran", dial: "+98", flag: "🇮🇷", format: "### ### ####", minLength: 10, maxLength: 11 },
    { code: "DE", name: "Germany", dial: "+49", flag: "🇩🇪", format: "### #### ####", minLength: 10, maxLength: 12 },
    { code: "FR", name: "France", dial: "+33", flag: "🇫🇷", format: "# ## ## ## ##", minLength: 9, maxLength: 10 },
    { code: "IT", name: "Italy", dial: "+39", flag: "🇮🇹", format: "### ### ####", minLength: 10, maxLength: 11 },
    { code: "ES", name: "Spain", dial: "+34", flag: "🇪🇸", format: "### ### ###", minLength: 9, maxLength: 10 },
    { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦", format: "(###) ###-####", minLength: 10, maxLength: 11 },
    { code: "AU", name: "Australia", dial: "+61", flag: "🇦🇺", format: "### ### ###", minLength: 9, maxLength: 10 },
    { code: "IN", name: "India", dial: "+91", flag: "🇮🇳", format: "##### #####", minLength: 10, maxLength: 11 },
    { code: "PK", name: "Pakistan", dial: "+92", flag: "🇵🇰", format: "### #######", minLength: 10, maxLength: 11 },
    { code: "BD", name: "Bangladesh", dial: "+880", flag: "🇧🇩", format: "#### ######", minLength: 10, maxLength: 11 },
    { code: "CN", name: "China", dial: "+86", flag: "🇨🇳", format: "### #### ####", minLength: 11, maxLength: 12 },
    { code: "JP", name: "Japan", dial: "+81", flag: "🇯🇵", format: "##-####-####", minLength: 10, maxLength: 11 },
    { code: "KR", name: "South Korea", dial: "+82", flag: "🇰🇷", format: "##-####-####", minLength: 10, maxLength: 11 },
    { code: "RU", name: "Russia", dial: "+7", flag: "🇷🇺", format: "(###) ###-##-##", minLength: 10, maxLength: 11 },
    { code: "BR", name: "Brazil", dial: "+55", flag: "🇧🇷", format: "(##) #####-####", minLength: 11, maxLength: 12 },
    { code: "MX", name: "Mexico", dial: "+52", flag: "🇲🇽", format: "### ### ####", minLength: 10, maxLength: 11 },
    { code: "ZA", name: "South Africa", dial: "+27", flag: "🇿🇦", format: "## ### ####", minLength: 9, maxLength: 10 },
    { code: "NG", name: "Nigeria", dial: "+234", flag: "🇳🇬", format: "### ### ####", minLength: 10, maxLength: 11 },
    { code: "KE", name: "Kenya", dial: "+254", flag: "🇰🇪", format: "### ### ###", minLength: 9, maxLength: 10 },
    { code: "ET", name: "Ethiopia", dial: "+251", flag: "🇪🇹", format: "## ### ####", minLength: 9, maxLength: 10 },
];

// Helper function to format phone number based on country format
export const formatPhoneNumber = (value, format) => {
    if (!value) return "";

    // Remove all non-digit characters
    const digits = value.replace(/\D/g, "");

    let formatted = "";
    let digitIndex = 0;

    for (let i = 0; i < format.length && digitIndex < digits.length; i++) {
        if (format[i] === "#") {
            formatted += digits[digitIndex];
            digitIndex++;
        } else {
            formatted += format[i];
        }
    }

    // If there are more digits than the format supports, append them
    if (digitIndex < digits.length) {
        formatted += digits.slice(digitIndex);
    }

    return formatted;
};

// Helper function to validate phone number for specific country
export const validatePhoneNumber = (value, countryCode) => {
    const country = countries.find(c => c.code === countryCode);
    if (!country) return { valid: false, error: "Invalid country" };

    const digits = value.replace(/\D/g, "");
    const length = digits.length;
    const hasLeadingZero = digits.startsWith('0');

    // Logic: if it's a variable length country (like Egypt 10/11), 
    // then leading zero MUST be 11, and no-leading-zero MUST be 10.
    let expectedLength = country.maxLength;
    if (country.maxLength > country.minLength && !hasLeadingZero) {
        expectedLength = country.minLength;
    }

    if (length < expectedLength) {
        return {
            valid: false,
            error: `Phone number should be ${expectedLength} digits.`
        };
    }

    if (length > expectedLength) {
        return {
            valid: false,
            error: `Phone number should be only ${expectedLength} digits.`
        };
    }

    return { valid: true, error: "" };
};

/**
 * Format a phone number for final display (e.g., +201227156457)
 * Prioritizes dial code + cleaned digits.
 */
export const displayFormattedPhone = (phone, countryCode = "EG") => {
    if (!phone) return "";

    // Normalize input (remove non-digits, keep leading + if present for initial check)
    const trimmed = phone.trim();
    if (trimmed.startsWith("+")) return trimmed.replace(/\s/g, "");

    const country = countries.find(c => c.code === countryCode) || countries[0];
    const dialDigits = country.dial.replace("+", "");

    // Clean all non-digits
    let cleaned = phone.replace(/\D/g, "");

    // If it starts with the dial digits, remove them to re-apply correctly
    if (cleaned.startsWith(dialDigits)) {
        cleaned = cleaned.substring(dialDigits.length);
    }

    // Always remove leading zeros
    cleaned = cleaned.replace(/^0+/, "");

    // Return dial code stuck to number, with LRM to fix RTL alignment issues
    return `\u200E${country.dial}${cleaned}`;
};
