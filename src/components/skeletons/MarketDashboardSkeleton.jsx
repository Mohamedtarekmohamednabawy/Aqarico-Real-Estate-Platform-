import React from 'react';
import Skeleton from '../Skeleton';
import { useTheme } from '../../theme/useTheme';
import { designTokens } from '../../theme/tokens';

const MarketStatSkeleton = () => {
    const { themeName } = useTheme();
    const tokens = designTokens[themeName];
    const c = tokens.colors;

    return (
        <div
            className="p-5 rounded-2xl border shadow-sm"
            style={{ backgroundColor: c.surface, borderColor: c.border }}
        >
            <div className="flex justify-between items-start mb-3">
                <Skeleton width="60px" height="12px" />
                <Skeleton width="16px" height="16px" borderRadius="4px" />
            </div>
            <Skeleton width="80px" height="28px" className="mb-1" />
            <Skeleton width="40px" height="12px" />
        </div>
    );
};

const DistrictCardSkeleton = () => {
    const { themeName } = useTheme();
    const tokens = designTokens[themeName];
    const c = tokens.colors;

    return (
        <div
            className="rounded-3xl border overflow-hidden"
            style={{ backgroundColor: c.surface, borderColor: c.border }}
        >
            <Skeleton width="100%" height="160px" borderRadius="0" />
            <div className="p-6">
                <div className="flex justify-between items-start mb-1">
                    <Skeleton width="100px" height="20px" />
                    <Skeleton width="50px" height="12px" />
                </div>
                <div className="flex items-baseline gap-1 mb-4">
                    <Skeleton width="80px" height="24px" />
                    <Skeleton width="30px" height="10px" />
                </div>
                <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                        <Skeleton width="60px" height="12px" />
                        <Skeleton width="40px" height="12px" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export const MarketDashboardSkeleton = () => {
    const { themeName } = useTheme();
    const tokens = designTokens[themeName];
    const c = tokens.colors;

    return (
        <main className="pt-28 pb-20 px-4 md:px-8 max-w-7xl mx-auto w-full">
            {/* Header Skeleton */}
            <div className="text-center mb-16">
                <Skeleton width="120px" height="32px" borderRadius="100px" className="mx-auto mb-6" />
                <div className="flex justify-center gap-3 mb-6">
                    <Skeleton width="200px" height="48px" />
                    <Skeleton width="150px" height="48px" />
                </div>
                <Skeleton width="min(60%, 500px)" height="24px" className="mx-auto" />
            </div>

            {/* KPI Cards Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                {[1, 2, 3, 4].map((i) => (
                    <MarketStatSkeleton key={i} />
                ))}
            </div>

            {/* Line Chart Skeleton */}
            <div
                style={{ backgroundColor: c.surface, borderColor: c.border }}
                className="p-8 rounded-3xl border mb-12 shadow-sm"
            >
                <div className="flex justify-between items-center mb-8">
                    <div className="space-y-3">
                        <Skeleton width="200px" height="24px" />
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <Skeleton width="12px" height="12px" borderRadius="100px" />
                                <Skeleton width="60px" height="10px" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Skeleton width="12px" height="12px" borderRadius="100px" />
                                <Skeleton width="60px" height="10px" />
                            </div>
                        </div>
                    </div>
                    <Skeleton width="24px" height="24px" borderRadius="6px" />
                </div>
                <Skeleton width="100%" height="256px" borderRadius="16px" />
            </div>

            {/* Districts Section Skeleton */}
            <div className="mb-8">
                <Skeleton width="250px" height="32px" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <DistrictCardSkeleton key={i} />
                ))}
            </div>
        </main>
    );
};

export default MarketDashboardSkeleton;
