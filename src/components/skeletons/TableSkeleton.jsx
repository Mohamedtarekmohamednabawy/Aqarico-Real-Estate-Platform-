import React from 'react';
import Skeleton from '../Skeleton';
import { useTheme } from '../../theme/useTheme';
import { designTokens } from '../../theme/tokens';

const TableSkeleton = ({ rows = 5, cols = 5, colWidths = null }) => {
    const { themeName } = useTheme();
    const tokens = designTokens[themeName];
    const c = tokens.colors;

    const getWidth = (index) => {
        if (colWidths && colWidths[index]) return colWidths[index];
        return `${100 / cols}%`;
    };

    return (
        <div className="w-full overflow-hidden rounded-2xl border" style={{ borderColor: c.border }}>
            <div className="bg-bg/50 p-4 border-b flex gap-4" style={{ borderColor: c.border }}>
                {Array.from({ length: cols }).map((_, i) => (
                    <div key={i} style={{ width: getWidth(i) }} className="flex justify-start">
                        <Skeleton width="60%" height="16px" />
                    </div>
                ))}
            </div>
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="p-4 flex flex-row items-center gap-4 border-b last:border-0" style={{ borderColor: c.border }}>
                    {Array.from({ length: cols }).map((_, colIndex) => (
                        <div key={colIndex} style={{ width: getWidth(colIndex) }} className="flex items-center gap-3">
                            {colIndex === 0 && <Skeleton width="32px" height="32px" borderRadius="10px" className="shrink-0" />}
                            <Skeleton width={colIndex === 0 ? "70%" : "85%"} height="14px" />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default TableSkeleton;
