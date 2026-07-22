import { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Circle, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { X, Navigation } from "lucide-react";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import PropertyCard from "./PropertyCard";
import { dataManager } from "../data/dataManager";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useLanguage } from "../i18n/LanguageContext";

const easeOut = [0.22, 1, 0.36, 1];

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const deg2rad = (deg) => deg * (Math.PI / 180);

const SERVER_RADIUS_LIMIT = 300;

const MapClickHandler = ({ onMapClick }) => {
    useMapEvents({
        click(e) { onMapClick(e.latlng); },
    });
    return null;
};

const FlyToLocation = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) map.flyTo(center, 13, { duration: 1 });
    }, [center, map]);
    return null;
};

const BaseMap = ({
    mode = "hero",
    properties = [],
    currentProperty = null,
    initialCenter = null,
    onLocationSelect = null,
    searchRadius = 5,
    height = "400px",
    zoom = 13,
    isLoading = false
}) => {
    const { themeName } = useTheme();
    const { t, language } = useLanguage();
    const tokens = designTokens[themeName];
    const sidebarRef = useRef(null);

    const [searchCenter, setSearchCenter] = useState(null);
    const [pickerPosition, setPickerPosition] = useState(initialCenter);
    const [nearbyProperties, setNearbyProperties] = useState([]);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [isNearbyLoading, setIsNearbyLoading] = useState(false);
    const debouncedSearchCenter = useDebouncedValue(searchCenter, 350);

    // Reset selected property when current property changes
    useEffect(() => {
        setSelectedProperty(null);
    }, [currentProperty?.id]);

    useEffect(() => {
        if (mode === "picker" && initialCenter) setPickerPosition(initialCenter);
    }, [mode, initialCenter]);

    useEffect(() => {
        if (mode === "hero" && searchCenter) {
            const localNearby = properties
                .filter(p => {
                    if (!p.coordinates) return false;
                    return calculateDistance(searchCenter.lat, searchCenter.lng, p.coordinates.lat, p.coordinates.lng) <= searchRadius;
                })
                .map(p => ({
                    ...p,
                    distance: calculateDistance(searchCenter.lat, searchCenter.lng, p.coordinates.lat, p.coordinates.lng)
                }))
                .sort((a, b) => (a.distance || 0) - (b.distance || 0))
                .slice(0, 100);
            setNearbyProperties(localNearby);
        } else if (mode === "property" && currentProperty?.coordinates) {
            const nearby = properties
                .filter(p => {
                    if (p.id === currentProperty.id) return false;
                    if (!p.coordinates) return false;
                    if (p.type !== currentProperty.type) return false;
                    return calculateDistance(
                        currentProperty.coordinates.lat, currentProperty.coordinates.lng,
                        p.coordinates.lat, p.coordinates.lng
                    ) <= searchRadius;
                })
                .map(p => ({
                    ...p,
                    distance: calculateDistance(
                        currentProperty.coordinates.lat, currentProperty.coordinates.lng,
                        p.coordinates.lat, p.coordinates.lng
                    )
                }))
                .sort((a, b) => (a.distance || 0) - (b.distance || 0))
                .slice(0, 100);
            setNearbyProperties(nearby);
        }
    }, [mode, searchCenter, currentProperty, properties, searchRadius]);

    useEffect(() => {
        if (mode !== "hero" || !debouncedSearchCenter) return;

        const controller = new AbortController();
        const lat = Number(debouncedSearchCenter.lat.toFixed(5));
        const lng = Number(debouncedSearchCenter.lng.toFixed(5));

        setNearbyProperties([]); // Clear old markers immediately
        setIsNearbyLoading(true);
        dataManager.fetchProperties(
            { lat, lng, radiusKm: searchRadius, limit: SERVER_RADIUS_LIMIT },
            { signal: controller.signal }
        )
            .then(result => {
                if (controller.signal.aborted) return;
                if (result.data && result.data.length > 0) {
                    const apiNearby = result.data
                        .filter(p => p.coordinates)
                        .map(p => ({
                            ...p,
                            distance: calculateDistance(
                                debouncedSearchCenter.lat, debouncedSearchCenter.lng,
                                p.coordinates.lat, p.coordinates.lng
                            )
                        }))
                        .sort((a, b) => (a.distance || 0) - (b.distance || 0))
                        .slice(0, 100);
                    setNearbyProperties(apiNearby);
                }
            })
            .catch((error) => {
                if (error?.code !== "ERR_CANCELED") console.error("Error fetching nearby properties:", error);
            })
            .finally(() => {
                if (!controller.signal.aborted) setIsNearbyLoading(false);
            });

        return () => controller.abort();
    }, [mode, debouncedSearchCenter, searchRadius]);

    const handleMapClick = (latlng) => {
        if (mode === "hero") {
            setSearchCenter(latlng);
            setSelectedProperty(null);
        } else if (mode === "picker") {
            setPickerPosition(latlng);
            if (onLocationSelect) onLocationSelect({ lat: latlng.lat, lng: latlng.lng });
        }
    };

    const createCustomIcon = (isCenter, color) => L.divIcon({
        className: "custom-marker",
        html: `
            <div style="
                background-color: ${color};
                width: ${isCenter ? "40px" : "30px"};
                height: ${isCenter ? "40px" : "30px"};
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
            ">
                <svg xmlns="http://www.w3.org/2000/svg" width="${isCenter ? "24" : "16"}" height="${isCenter ? "24" : "16"}" 
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
                    stroke-linecap="round" stroke-linejoin="round">
                    ${isCenter
                ? '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>'
                : '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle>'
            }
                </svg>
            </div>
        `,
        iconSize: [isCenter ? 40 : 30, isCenter ? 40 : 30],
        iconAnchor: [isCenter ? 20 : 15, isCenter ? 40 : 30],
        popupAnchor: [0, isCenter ? -40 : -30],
    });

    const centerIcon = useMemo(() => createCustomIcon(true, tokens.colors.primary), [tokens.colors.primary]);
    const propertyIcon = useMemo(() => createCustomIcon(false, tokens.colors.secondary), [tokens.colors.secondary]);

    const defaultCenter = [31.2001, 29.9187];
    const mapCenter = useMemo(() => {
        if (mode === "picker" && pickerPosition) return [pickerPosition.lat, pickerPosition.lng];
        if (mode === "picker" && initialCenter) return [initialCenter.lat, initialCenter.lng];
        if (mode === "property" && currentProperty?.coordinates) return [currentProperty.coordinates.lat, currentProperty.coordinates.lng];
        if (mode === "hero" && searchCenter) return [searchCenter.lat, searchCenter.lng];
        return defaultCenter;
    }, [mode, pickerPosition, initialCenter, currentProperty, searchCenter]);

    const alexBounds = [[30.75, 29.40], [31.45, 30.20]];

    return (
        <div
            className={`relative z-0 w-full rounded-${mode === "picker" ? "xl" : "2xl"} overflow-hidden border shadow-lg ${mode === "hero" ? "mt-8" : ""}`}
            style={{ height, borderColor: tokens.colors.border }}
        >
            {/* ── Loading overlay ────────────────────────────────────────
                MUST use inline zIndex > 400 to beat Leaflet's internal tile
                pane (z-index 200) and control pane (z-index 400).
                Tailwind z-50 = 50, which gets buried — so we bypass it.     */}
            <AnimatePresence>
                {(isNearbyLoading || isLoading) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{
                            position: "absolute",
                            inset: 0,
                            zIndex: 1000,          // beats Leaflet controls but stays inside wrapper z-0
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "rgba(0,0,0,0.45)",
                            backdropFilter: "blur(6px)",
                            WebkitBackdropFilter: "blur(6px)",
                        }}
                    >
                        {/* Spinner card — mirrors LoadingScreen design */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.28, ease: easeOut }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 72,
                                height: 72,
                                borderRadius: 22,
                                background: `linear-gradient(135deg, ${tokens.colors.surface}, ${tokens.colors.bg})`,
                                border: `1px solid ${tokens.colors.border}`,
                                boxShadow: tokens.shadows?.lg || "0 20px 40px rgba(0,0,0,0.3)",
                                marginBottom: 16,
                            }}
                        >
                            <div
                                className="premium-loader-ring"
                                style={{
                                    "--loader-primary": tokens.colors.primary,
                                    "--loader-accent": tokens.colors.gold || tokens.colors.secondary,
                                    "--loader-muted": tokens.colors.border,
                                }}
                            />
                        </motion.div>

                        {/* Label */}
                        <motion.p
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.12, duration: 0.25, ease: easeOut }}
                            style={{
                                color: "#fff",
                                fontSize: 11,
                                fontWeight: 900,
                                letterSpacing: "0.18em",
                                textTransform: "uppercase",
                                marginBottom: 10,
                            }}
                        >
                            {t("map.searching")}
                        </motion.p>

                        {/* Dots — same as LoadingScreen */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.2 }}
                            style={{ display: "flex", gap: 6 }}
                        >
                            {[0, 1, 2].map((dot) => (
                                <span
                                    key={dot}
                                    className="premium-loader-dot"
                                    style={{
                                        "--dot-delay": `${dot * 120}ms`,
                                        backgroundColor: tokens.colors.primary,
                                    }}
                                />
                            ))}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <MapContainer
                center={mapCenter}
                zoom={zoom}
                minZoom={11}
                maxBounds={alexBounds}
                maxBoundsViscosity={1.0}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%", zIndex: 0 }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapClickHandler onMapClick={handleMapClick} />
                <FlyToLocation center={
                    mode === "hero" ? searchCenter :
                        (mode === "picker" ? pickerPosition :
                            (mode === "property" && currentProperty?.coordinates ? currentProperty.coordinates : null))
                } />

                {mode === "picker" && pickerPosition && (
                    <Marker position={[pickerPosition.lat, pickerPosition.lng]} icon={centerIcon}>
                        <Popup>{t("map.selectedLocation")}</Popup>
                    </Marker>
                )}

                {mode === "property" && currentProperty?.coordinates && (
                    <Marker position={[currentProperty.coordinates.lat, currentProperty.coordinates.lng]} icon={centerIcon}>
                        <Popup>{currentProperty.title}</Popup>
                    </Marker>
                )}

                {mode === "hero" && searchCenter && (
                    <>
                        <Marker
                            position={searchCenter}
                            icon={centerIcon}
                            draggable={true}
                            eventHandlers={{
                                dragend: (e) => {
                                    const position = e.target.getLatLng();
                                    handleMapClick(position);
                                },
                            }}
                        >
                            <Popup>{t("map.dragToMove")}</Popup>
                        </Marker>

                        <Circle
                            center={searchCenter}
                            radius={5000}
                            pathOptions={{
                                color: tokens.colors.primary,
                                fillColor: tokens.colors.primary,
                                fillOpacity: 0.1,
                                weight: 1,
                            }}
                        />
                    </>
                )}

                <MarkerClusterGroup
                    chunkedLoading
                    spiderfyOnMaxZoom={true}
                    maxClusterRadius={40}
                    iconCreateFunction={(cluster) => {
                        const count = cluster.getChildCount();
                        const size = count < 10 ? 50 : count < 100 ? 60 : 70;
                        return L.divIcon({
                            html: `
                                <div style="
                                    width: ${size}px; height: ${size}px;
                                    background: linear-gradient(135deg, ${tokens.colors.secondary}, ${tokens.colors.primary});
                                    border-radius: 50%;
                                    display: flex; align-items: center; justify-content: center;
                                    color: white; font-weight: bold;
                                    font-size: ${count < 10 ? "18px" : "20px"};
                                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                                    border: 3px solid white;
                                ">${count}</div>
                            `,
                            className: "custom-cluster-icon",
                            iconSize: L.point(size, size),
                        });
                    }}
                >
                    {nearbyProperties.map((property) => (
                        <Marker
                            key={property.id}
                            position={[property.coordinates.lat, property.coordinates.lng]}
                            icon={propertyIcon}
                            eventHandlers={{ click: () => setSelectedProperty(property) }}
                        />
                    ))}
                </MarkerClusterGroup>
            </MapContainer>

            {/* Instruction overlays */}
            {mode === "hero" && !searchCenter && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg text-sm font-medium text-gray-700 pointer-events-none" style={{ zIndex: 1000 }}>
                    {t("map.clickHero")}
                </div>
            )}
            {mode === "picker" && !pickerPosition && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg text-sm font-medium text-gray-700 pointer-events-none" style={{ zIndex: 1000 }}>
                    {t("map.clickPicker")}
                </div>
            )}

            {/* Property details sidebar */}
            <AnimatePresence>
                {(mode === "hero" || mode === "property") && selectedProperty && !isLoading && !isNearbyLoading && (
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ duration: 0.28, ease: easeOut }}
                        className="absolute top-0 right-0 h-full w-full md:w-96 shadow-2xl backdrop-blur-sm"
                        style={{ backgroundColor: tokens.colors.surface + "ee", zIndex: 1100 }}
                    >
                        <div ref={sidebarRef} className="h-full w-full p-4 overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg" style={{ color: tokens.colors.text }}>
                                    {t("map.propertyDetails")}
                                </h3>
                                <button
                                    onClick={() => setSelectedProperty(null)}
                                    className="p-1 rounded-full hover:bg-black/10 transition-colors cursor-pointer"
                                    style={{ color: tokens.colors.text }}
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {((mode === "hero" && searchCenter) || (mode === "property" && currentProperty?.coordinates)) && (
                                <div
                                    className="mb-4 p-3 rounded-lg flex items-center gap-3 border shadow-sm"
                                    style={{ backgroundColor: tokens.colors.bg, borderColor: tokens.colors.border }}
                                >
                                    <Navigation size={20} style={{ color: tokens.colors.primary }} />
                                    <div>
                                        <p className="text-sm font-medium" style={{ color: tokens.colors.text }}>
                                            {calculateDistance(
                                                mode === "hero" ? searchCenter.lat : currentProperty.coordinates.lat,
                                                mode === "hero" ? searchCenter.lng : currentProperty.coordinates.lng,
                                                selectedProperty.coordinates.lat,
                                                selectedProperty.coordinates.lng
                                            ).toFixed(1)} {t("map.kmAway")}
                                        </p>
                                        <p className="text-xs" style={{ color: tokens.colors.textSub }}>
                                            {t("map.fromSource", { source: mode === "hero" ? t("map.selectedArea") : t("map.thisProperty") })}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <PropertyCard property={selectedProperty} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BaseMap;