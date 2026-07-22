import React from 'react';
import Skeleton from '../Skeleton';
import { useTheme } from '../../theme/useTheme';
import { designTokens } from '../../theme/tokens';

const AgentCardSkeleton = ({ compact = false }) => {
    const { themeName } = useTheme();
    const tokens = designTokens[themeName];
    const c = tokens.colors;

    // Match AgentCard.jsx avatar sizes
    const avatarSize = compact ? "56px" : "68px";

    return (
        <div
            className="rounded-3xl border overflow-hidden flex flex-col h-full"
            style={{ backgroundColor: c.surface, borderColor: c.border }}
        >
            {/* Top seed stripe proxy */}
            <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${c.primary}40, ${c.primary}80)` }} />

            {/* Avatar + Main Info */}
            <div className={`px-5 pt-5 pb-3 flex items-start gap-4`}>
                <Skeleton width={avatarSize} height={avatarSize} borderRadius="16px" className="shrink-0" />
                <div className="flex-1 space-y-2 mt-1 flex flex-col items-start min-w-0">
                    <div className="flex items-center gap-2 w-full">
                        <Skeleton width="60%" height="18px" />
                        {!compact && <Skeleton width="40px" height="12px" borderRadius="100px" />}
                    </div>
                    <Skeleton width="40%" height="12px" />
                    <Skeleton width="50%" height="12px" />
                </div>
            </div>

            {/* Bio */}
            <div className="px-5 pb-4 space-y-2 flex flex-col items-start">
                <Skeleton width="100%" height="12px" />
                <Skeleton width={compact ? "60%" : "80%"} height="12px" />
            </div>

            {!compact && (
                <>
                    <div className="mx-5 border-t" style={{ borderColor: c.border }} />

                    {/* Contact Strip */}
                    <div className="mx-5 mt-3 rounded-2xl p-4 space-y-3" style={{ backgroundColor: `${c.bg}80`, border: `1px solid ${c.border}` }}>
                        <div className="flex items-center gap-2">
                            <Skeleton width="12px" height="12px" borderRadius="100px" />
                            <Skeleton width="120px" height="10px" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Skeleton width="12px" height="12px" borderRadius="100px" />
                            <Skeleton width="100px" height="10px" />
                        </div>
                    </div>
                </>
            )}

            {/* Action Buttons */}
            <div className="px-5 py-4 flex gap-2 mt-auto">
                <Skeleton height="36px" borderRadius="12px" className="flex-1" />
                <Skeleton height="36px" borderRadius="12px" className="flex-1" />
            </div>

            {/* View Listings Strip - only if not compact */}
            {!compact && (
                <div className="border-t p-3 flex justify-between" style={{ borderColor: c.border }}>
                    <Skeleton width="120px" height="12px" />
                    <Skeleton width="12px" height="12px" />
                </div>
            )}
        </div>
    );
};

export const AgentGridSkeleton = ({ count = 3, compact = false, className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" }) => (
    <div className={className}>
        {Array.from({ length: count }).map((_, i) => (
            <AgentCardSkeleton key={i} compact={compact} />
        ))}
    </div>
);

export default AgentCardSkeleton;
