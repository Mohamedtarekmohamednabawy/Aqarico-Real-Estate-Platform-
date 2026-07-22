import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const ComparisonContext = createContext();

export const useComparison = () => {
    const context = useContext(ComparisonContext);
    if (!context) {
        throw new Error('useComparison must be used within a ComparisonProvider');
    }
    return context;
};

export const ComparisonProvider = ({ children }) => {
    const [compareList, setCompareList] = useState([]);

    // Clear compare list if user logs out
    useEffect(() => {
        const checkAuth = () => {
            if (!authService.isLoggedIn()) {
                setCompareList([]);
            }
        };

        window.addEventListener('userChanged', checkAuth);
        return () => window.removeEventListener('userChanged', checkAuth);
    }, []);

    const addToCompare = (property) => {
        setCompareList(prev => {
            if (prev.find(p => p._id === property._id)) return prev;
            if (prev.length >= 4) {
                return [...prev.slice(1), property];
            }
            return [...prev, property];
        });
    };

    const removeFromCompare = (propertyId) => {
        setCompareList(prev => prev.filter(p => p._id !== propertyId));
    };

    const toggleCompare = (property) => {
        if (!authService.isLoggedIn()) {
            return; // Or show login modal
        }
        if (compareList.find(p => p._id === property._id)) {
            removeFromCompare(property._id);
        } else {
            addToCompare(property);
        }
    };

    const clearCompare = () => {
        setCompareList([]);
    };

    // Load a full array of property objects at once (used by AI compare route)
    const loadCompareList = (properties) => {
        setCompareList(properties.slice(0, 4));
    };

    const isSelected = (propertyId) => {
        return compareList.some(p => p._id === propertyId);
    };

    return (
        <ComparisonContext.Provider value={{
            compareList,
            addToCompare,
            removeFromCompare,
            toggleCompare,
            clearCompare,
            loadCompareList,
            isSelected
        }}>
            {children}
        </ComparisonContext.Provider>
    );
};