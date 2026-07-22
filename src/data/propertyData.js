export const districts = ["All", "El Montazah", "Wasat", "Sharq", "El Agami", "El Gomrok", "El Amreya", "Gharb"];

export const districtLocations = {
    "El Agami": [
        "Abu Youssef", "El Bitash", "El Dekhila", "El Hanouvel", "Kilo 21",
    ],
    "El Amreya": [
        "Abu Talat", "El Amreya", "King Mariout",
    ],
    "El Gomrok": [
        "Bahary", "Mansheya", "Ras Al Tin",
    ],
    "El Montazah": [
        "Abo Qir", "El Asafra", "El Awayed", "El Mamoura", "El Mandara",
        "El Montazah", "El Seyouf", "Miami", "Sidi Bishr",
    ],
    "Gharb": [
        "El Max", "El Qabari", "El Wardiyan", "Mina El Basal",
    ],
    "Sharq": [
        "Bolekly", "Cleopatra", "El Saa'ah Sq", "Fleming", "Ganaklis",
        "Glim", "Kafr Abdo", "Lauran", "Roshdy", "Saba Basha",
        "San Stefano", "Sidi Gaber", "Smouha", "Sporting", "Stanley",
        "Victorya", "Zezenia",
    ],
    "Wasat": [
        "Bakoos", "Camp Cesar", "El Chatby", "El Hadara", "Ibrahimia",
        "Mahta El Raml", "Moharram Bek",
    ],
};

export const amenitiesList = [
    "Pool", "Garden", "Parking", "Security", "Gym", "Elevator",
    "Natural Gas", "Electricity Meter", "Water Meter",
    "Balcony", "Beach Access", "Club House", "Jacuzzi", "Furnished",
    "AC", "WiFi", "Smart Home", "Terrace", "Storage", "Loading Dock",
    "Central AC", "Garage", "Pool Access"
];

export const areaRanges = [
    { min: 0, max: 100, label: "0-100" },
    { min: 100, max: 150, label: "100-150" },
    { min: 150, max: 200, label: "150-200" },
    { min: 200, max: 300, label: "200-300" },
    { min: 300, max: 400, label: "300-400" },
    { min: 400, max: 600, label: "400-600" },
];

export const priceRanges = [
    { min: 0, max: 2000000, label: "0-2M" },
    { min: 2000000, max: 4000000, label: "2-4M" },
    { min: 4000000, max: 6000000, label: "4-6M" },
    { min: 6000000, max: 8000000, label: "6-8M" },
    { min: 8000000, max: 10000000, label: "8-10M" },
    { min: 10000000, max: 15000000, label: "10-15M" },
    { min: 15000000, max: 20000000, label: "15-20M" },
];

export const floorRanges = [
    { min: 0, max: 1, label: "Ground" },
    { min: 1, max: 3, label: "1-3" },
    { min: 3, max: 6, label: "3-6" },
    { min: 6, max: 10, label: "6-10" },
    { min: 10, max: 15, label: "10-15" },
    { min: 15, max: 20, label: "15-20" },
];

export const yearBuiltRanges = [
    { min: 1900, max: 1960, label: "1900-1960" },
    { min: 1960, max: 1980, label: "1960-1980" },
    { min: 1980, max: 2000, label: "1980-2000" },
    { min: 2000, max: 2010, label: "2000-2010" },
    { min: 2010, max: 2020, label: "2010-2020" },
    { min: 2020, max: 2036, label: "2020-2036" },
];

export const locationCoordinates = {
    "Abo Qir": { lat: 31.3167, lng: 30.0667 },
    "Camp Cesar": { lat: 31.2052, lng: 29.9195 },
    "San Stefano": { lat: 31.2455, lng: 29.9717 },
    "Lauran": { lat: 31.2541, lng: 29.9918 },
    "Bakoos": { lat: 31.2384, lng: 29.9670 },
    "Glim": { lat: 31.2575, lng: 29.9965 },
    "Fleming": { lat: 31.2462, lng: 29.9853 },
    "Cleopatra": { lat: 31.2215, lng: 29.9482 },
    "Sidi Gaber": { lat: 31.2387, lng: 29.9635 },
    "Roshdy": { lat: 31.2422, lng: 29.9733 },
    "Smouha": { lat: 31.2183, lng: 29.9581 },
    "Zezenia": { lat: 31.2415, lng: 29.9772 },
    "Kafr Abdo": { lat: 31.2300, lng: 29.9550 },
    "Sidi Bishr": { lat: 31.2652, lng: 29.9983 },
    "Bolekly": { lat: 31.2390, lng: 29.9620 },
    "El Mandara": { lat: 31.2725, lng: 30.0104 },
    "El Seyouf": { lat: 31.2492, lng: 29.9930 },
    "El Awayed": { lat: 31.2241, lng: 29.9965 },
    "Abu Youssef": { lat: 31.0667, lng: 29.7500 },
    "Bahary": { lat: 31.2035, lng: 29.8882 },
    "Mansheya": { lat: 31.1999, lng: 29.9060 },
    "Ibrahimia": { lat: 31.2173, lng: 29.9328 },
    "El Asafra": { lat: 31.2685, lng: 30.0050 },
    "Miami": { lat: 31.2655, lng: 29.9922 },
    "Sporting": { lat: 31.2237, lng: 29.9570 },
    "El Chatby": { lat: 31.2105, lng: 29.9242 },
    "Ganaklis": { lat: 31.2468, lng: 29.9880 },
    "Victorya": { lat: 31.2588, lng: 29.9972 },
    "El Hadara": { lat: 31.1965, lng: 29.9405 },
    "Moharram Bek": { lat: 31.1895, lng: 29.9262 },
    "Saba Basha": { lat: 31.2450, lng: 29.9785 },
    "Mahta El Raml": { lat: 31.1996, lng: 29.9056 },
    "El Amreya": { lat: 31.0238, lng: 29.8152 },
    "Stanley": { lat: 31.2479, lng: 29.9790 },
    "El Mamoura": { lat: 31.2858, lng: 30.0355 },
    "El Montazah": { lat: 31.2925, lng: 30.0198 },
    "El Bitash": { lat: 31.1092, lng: 29.7712 },
    "El Qabari": { lat: 31.1833, lng: 29.8833 },
    "El Wardiyan": { lat: 31.1785, lng: 29.8785 },
    "Mina El Basal": { lat: 31.1855, lng: 29.8920 },
    "King Mariout": { lat: 31.0255, lng: 29.8200 },
    "Abu Talat": { lat: 31.0425, lng: 29.7350 },
    "El Dekhila": { lat: 31.1444, lng: 29.8188 },
    "El Hanouvel": { lat: 31.0833, lng: 29.7500 },
    "Kilo 21": { lat: 31.0333, lng: 29.7333 },
    "El Max": { lat: 31.1555, lng: 29.8450 },
    "El Saa'ah Sq": { lat: 31.2452, lng: 29.9822 },
    "Ras Al Tin": { lat: 31.2065, lng: 29.8710 },
};

export const locations = ["All Locations", ...Object.keys(locationCoordinates)];

// To prevent any potential crashes in legacy parts
export const properties = [];
