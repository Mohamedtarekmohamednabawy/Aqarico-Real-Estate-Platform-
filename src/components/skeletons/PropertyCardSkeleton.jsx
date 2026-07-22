import React from 'react';
import Skeleton from '../Skeleton';
import { useTheme } from '../../theme/useTheme';
import { designTokens } from '../../theme/tokens';

const PropertyCardSkeleton = ({ adminView = false }) => {
    const { themeName } = useTheme();
    const tokens = designTokens[themeName];
    const c = tokens.colors;

    return (
        <div
            className="rounded-[24px] border overflow-hidden flex flex-col h-full"
            style={{ backgroundColor: c.surface, borderColor: c.border }}
        >
            {/* Image Placeholder - match h-56 (224px) */}
            <Skeleton height="224px" borderRadius="0" />

            <div className="p-5 flex flex-col items-start flex-1 gap-3">
                {/* Type Badge */}
                <div className="flex justify-between items-center w-full mb-1">
                    <Skeleton width="60px" height="24px" borderRadius="100px" />
                    <Skeleton width="40px" height="12px" />
                </div>

                {/* Title */}
                <Skeleton width="90%" height="28px" />

                {/* Location */}
                <div className="flex items-center gap-1.5">
                    <Skeleton width="14px" height="14px" borderRadius="4px" />
                    <Skeleton width="120px" height="14px" />
                </div>

                {/* User Info - only for public view */}
                {!adminView && (
                    <div className="flex items-center gap-2 mt-1">
                        <Skeleton width="24px" height="24px" borderRadius="100px" />
                        <Skeleton width="100px" height="12px" />
                    </div>
                )}

                <div className="w-full mt-2 pt-4 border-t" style={{ borderColor: c.border }}>
                    <div className="flex justify-between">
                        <Skeleton width="25%" height="16px" />
                        <Skeleton width="25%" height="16px" />
                        <Skeleton width="25%" height="16px" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 w-full mt-1">
                    <Skeleton width="80%" height="10px" />
                    <Skeleton width="70%" height="10px" />
                </div>

                {/* Button - only for public view */}
                {!adminView && (
                    <Skeleton height="44px" borderRadius="12px" className="w-full mt-auto" />
                )}
            </div>
        </div>
    );
};

export const PropertyGridSkeleton = ({ count = 6, adminView = false, className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" }) => (
    <div className={className}>
        {Array.from({ length: count }).map((_, i) => (
            <PropertyCardSkeleton key={i} adminView={adminView} />
        ))}
    </div>
);

export default PropertyCardSkeleton;
