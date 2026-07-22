import { useState, useEffect } from "react";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import { ShieldCheck } from "lucide-react";
import { optimizeImageUrl } from "../utils/imageUrl";

const UserAvatar = ({
    user,
    size = "md",
    showHoverEffect = true,
    className = "",
    overlay = null,
}) => {
    const { themeName } = useTheme();
    const tokens = designTokens[themeName];

    const sizeMap = {
        xs: { dimension: "w-6 h-6", text: "text-[10px]", badge: "w-2.5 h-2.5", pixels: 48 },
        sm: { dimension: "w-8 h-8", text: "text-xs", badge: "w-3 h-3", pixels: 64 },
        md: { dimension: "w-10 h-10", text: "text-sm", badge: "w-4 h-4", pixels: 80 },
        lg: { dimension: "w-12 h-12", text: "text-base", badge: "w-4.5 h-4.5", pixels: 96 },
        xl: { dimension: "w-16 h-16", text: "text-xl", badge: "w-5 h-5", pixels: 128 },
        "2xl": { dimension: "w-20 h-20", text: "text-2xl", badge: "w-6 h-6", pixels: 160 },
        xxl: { dimension: "w-24 h-24", text: "text-3xl", badge: "w-7 h-7", pixels: 192 },
    };

    const sizeClasses = sizeMap[size] || sizeMap.md;

    const getInitials = () => {
        if (!user) return "?";
        const first = (user.firstName || "").charAt(0).toUpperCase();
        const last = (user.lastName || "").charAt(0).toUpperCase();
        return (first + last) || "?";
    };

    // Support both `avatar` (backend) and `profileImage` (legacy)
    const avatarUrl = user?.avatar || user?.profileImage || null;

    const [imageError, setImageError] = useState(false);
    const isAdmin = user?.role === 'admin';

    // Reset error whenever the URL changes
    useEffect(() => {
        setImageError(false);
    }, [avatarUrl]);

    const renderContent = () => {
        if (avatarUrl && !imageError) {
            return (
                <div
                    className={`${sizeClasses.dimension} rounded-full overflow-hidden border-2 ${showHoverEffect ? "transition-transform duration-300 hover:scale-110" : ""
                        } ${className}`}
                    style={{ borderColor: tokens.colors.border }}
                >
                    <img
                        src={optimizeImageUrl(avatarUrl, {
                            width: sizeClasses.pixels,
                            height: sizeClasses.pixels,
                            quality: 72,
                        })}
                        alt={`${user?.firstName || 'User'}`}
                        width={sizeClasses.pixels / 2}
                        height={sizeClasses.pixels / 2}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                        style={{
                            imageRendering: 'auto',
                            WebkitBackfaceVisibility: 'hidden',
                            backfaceVisibility: 'hidden',
                            transform: 'translateZ(0)'
                        }}
                        onError={() => setImageError(true)}
                    />
                    {overlay}
                </div>
            );
        }

        return (
            <div
                className={`${sizeClasses.dimension} rounded-full flex items-center justify-center font-bold ${showHoverEffect ? "transition-all duration-300 hover:scale-110" : ""
                    } ${className}`}
                style={{
                    backgroundColor: tokens.colors.primary + "20",
                    color: tokens.colors.primary,
                    border: `2px solid ${tokens.colors.primary}40`,
                }}
            >
                <span className={sizeClasses.text}>{getInitials()}</span>
                {overlay}
            </div>
        );
    };

    return (
        <div className="relative inline-block">
            {renderContent()}
            {isAdmin && (
                <div
                    className="absolute -top-1 -right-1 rounded-full p-1 shadow-lg backdrop-blur-sm border"
                    style={{
                        zIndex: 10,
                        backgroundColor: themeName === 'dark' ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.8)',
                        borderColor: tokens.colors.border
                    }}
                >
                    <ShieldCheck
                        className={`${sizeClasses.badge || "w-4 h-4"} text-amber-500`}
                        fill="currentColor"
                        fillOpacity={0.2}
                    />
                </div>
            )}
        </div>
    );
};

export default UserAvatar;
