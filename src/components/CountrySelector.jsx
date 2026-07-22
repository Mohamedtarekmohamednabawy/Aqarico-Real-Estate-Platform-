import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown } from "lucide-react";

const CountrySelector = ({ value, onChange, error }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Import countries data (you'll need to create this)
    const countries = [
        { code: "EG", name: "Egypt", dial: "+20", flag: "🇪🇬" },
        { code: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
        { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
        { code: "SA", name: "Saudi Arabia", dial: "+966", flag: "🇸🇦" },
        { code: "AE", name: "United Arab Emirates", dial: "+971", flag: "🇦🇪" },
        { code: "KW", name: "Kuwait", dial: "+965", flag: "🇰🇼" },
        { code: "QA", name: "Qatar", dial: "+974", flag: "🇶🇦" },
        { code: "BH", name: "Bahrain", dial: "+973", flag: "🇧🇭" },
        { code: "OM", name: "Oman", dial: "+968", flag: "🇴🇲" },
        { code: "JO", name: "Jordan", dial: "+962", flag: "🇯🇴" },
        { code: "LB", name: "Lebanon", dial: "+961", flag: "🇱🇧" },
        { code: "DE", name: "Germany", dial: "+49", flag: "🇩🇪" },
        { code: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
        { code: "IT", name: "Italy", dial: "+39", flag: "🇮🇹" },
        { code: "ES", name: "Spain", dial: "+34", flag: "🇪🇸" },
        { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
        { code: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
        { code: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
        { code: "CN", name: "China", dial: "+86", flag: "🇨🇳" },
        { code: "JP", name: "Japan", dial: "+81", flag: "🇯🇵" },
    ];

    const filteredCountries = countries.filter(
        (country) =>
            country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            country.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            country.dial.includes(searchTerm)
    );

    const selectedCountry = countries.find((c) => c.code === value) || countries[0];

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-3 py-2.5 rounded-lg bg-white/70 border ${error ? "border-red-600" : "border-black/40"
                    } flex items-center justify-between hover:bg-white/80 transition cursor-pointer`}
            >
                <span className="flex items-center gap-2">
                    <span className="text-xl">{selectedCountry.flag}</span>
                    <span className="font-medium">{selectedCountry.code}</span>
                    <span className="text-gray-600">{selectedCountry.dial}</span>
                </span>
                <ChevronDown size={18} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-2xl border border-gray-200 max-h-64 overflow-hidden">
                    {/* Search Input */}
                    <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search country..."
                                className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:border-blue-500 text-sm"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    {/* Country List */}
                    <div className="overflow-y-auto max-h-52">
                        {filteredCountries.length > 0 ? (
                            filteredCountries.map((country) => (
                                <button
                                    key={country.code}
                                    type="button"
                                    onClick={() => {
                                        onChange(country);
                                        setIsOpen(false);
                                        setSearchTerm("");
                                    }}
                                    className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-100 transition cursor-pointer text-left ${country.code === value ? "bg-blue-50" : ""
                                        }`}
                                >
                                    <span className="text-xl">{country.flag}</span>
                                    <span className="flex-1 font-medium text-gray-800">{country.name}</span>
                                    <span className="text-sm text-gray-500">{country.dial}</span>
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-3 text-center text-gray-500 text-sm">No countries found</div>
                        )}
                    </div>
                </div>
            )}

            {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
        </div>
    );
};

export default CountrySelector;
