import React, { createContext, useContext, useState, useCallback } from 'react';

const BackendStatusContext = createContext();

export const useBackendStatus = () => {
    const context = useContext(BackendStatusContext);
    if (!context) {
        throw new Error('useBackendStatus must be used within a BackendStatusProvider');
    }
    return context;
};

export const BackendStatusProvider = ({ children }) => {
    const [isBackendDown, setIsBackendDown] = useState(false);
    const [failedRequestCount, setFailedRequestCount] = useState(0);
    const [isCritical, setIsCritical] = useState(false);

    const setDown = useCallback((critical = false) => {
        setIsBackendDown(true);
        setIsCritical(critical);
        setFailedRequestCount(prev => prev + 1);
    }, []);

    const setUp = useCallback(() => {
        setIsBackendDown(false);
        setIsCritical(false);
        setFailedRequestCount(0);
    }, []);

    React.useEffect(() => {
        const handleDown = (e) => {
            // Trigger critical if specifically requested or if multiple failures occur
            const shouldBeCritical = e.detail?.isCritical || false;
            setDown(shouldBeCritical);
        };
        window.addEventListener('aqarico:backend_down', handleDown);
        return () => window.removeEventListener('aqarico:backend_down', handleDown);
    }, [setDown]);

    const retry = useCallback(() => {
        // This will be used to trigger a global refresh or re-fetch
        setUp();
        window.location.reload();
    }, [setUp]);

    return (
        <BackendStatusContext.Provider value={{ isBackendDown, isCritical, failedRequestCount, setDown, setUp, retry }}>
            {children}
        </BackendStatusContext.Provider>
    );
};
