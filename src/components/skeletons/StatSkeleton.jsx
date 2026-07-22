import React from 'react';
import Skeleton from '../Skeleton';
import { useTheme } from '../../theme/useTheme';
import { designTokens } from '../../theme/tokens';

const StatSkeleton = () => {
    const { themeName } = useTheme();
    const tokens = designTokens[themeName];
    const c = tokens.colors;

    return (
        <div
            className="p-6 rounded-[2rem] border shadow-sm flex flex-col gap-6"
            style={{ backgroundColor: c.surface, borderColor: c.border }}
        >
            <div className="flex justify-between items-start">
                <div className="space-y-2 w-full flex flex-col items-start">
                    <Skeleton width="40%" height="8px" />
                    <Skeleton width="60%" height="12px" />
                </div>
                <Skeleton width="48px" height="48px" borderRadius="16px" className="shrink-0" />
            </div>
            <div className="flex items-end justify-between gap-4 mt-auto">
                <Skeleton width="50%" height="32px" />
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border" style={{ borderColor: `${c.border}40` }}>
                    <Skeleton width="6px" height="6px" borderRadius="100px" />
                    <Skeleton width="60px" height="10px" />
                </div>
            </div>
        </div>
    );
};

export const StatGridSkeleton = ({ count = 3 }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {Array.from({ length: count }).map((_, i) => (
            <StatSkeleton key={i} />
        ))}
    </div>
);

export default StatSkeleton;
