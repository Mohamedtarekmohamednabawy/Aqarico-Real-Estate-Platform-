import React from 'react';
import { useTheme } from '../theme/useTheme';
import { designTokens } from '../theme/tokens';

/**
 * Base Skeleton component using the global .premium-skeleton animation from index.css
 */
const Skeleton = ({ width, height, borderRadius = '12px', className = '' }) => {
    const { themeName } = useTheme();
    const tokens = designTokens[themeName];
    const c = tokens.colors;

    return (
        <div
            className={`premium-skeleton ${className}`}
            style={{
                width: width || '100%',
                height: height || '20px',
                borderRadius,
            }}
        />
    );
};

export const FormSkeleton = () => {
    return (
        <div className="w-full space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="space-y-2">
                        <div className="flex flex-col items-start">
                            <Skeleton width="40%" height="12px" />
                        </div>
                        <Skeleton width="100%" height="48px" borderRadius="12px" />
                    </div>
                ))}
            </div>
            <div className="space-y-2">
                <div className="flex flex-col items-start">
                    <Skeleton width="30%" height="12px" />
                </div>
                <Skeleton width="100%" height="120px" borderRadius="12px" />
            </div>
            <div className="flex justify-end">
                <Skeleton width="35%" height="52px" borderRadius="16px" />
            </div>
        </div>
    );
};

export default Skeleton;
