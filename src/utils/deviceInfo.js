/**
 * Utility to manage unique device identification.
 * Stores a persistent random ID in localStorage to identify the browser/device.
 */
export const getDeviceId = () => {
    let deviceId = localStorage.getItem('aqarico_device_id');
    if (!deviceId) {
        // Generate a reasonably unique ID without external dependencies
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            deviceId = crypto.randomUUID();
        } else {
            deviceId = Math.random().toString(36).substring(2, 15) +
                Math.random().toString(36).substring(2, 15) +
                Date.now().toString(36);
        }
        localStorage.setItem('aqarico_device_id', deviceId);
    }
    return deviceId;
};

/**
 * Gathers basic metadata about the current device/browser.
 */
export const getDeviceMetadata = () => {
    const userAgent = navigator.userAgent;
    let browser = "Unknown";
    let os = "Unknown";

    // Browser detection
    if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("SamsungBrowser")) browser = "Samsung Browser";
    else if (userAgent.includes("Opera") || userAgent.includes("OPR")) browser = "Opera";
    else if (userAgent.includes("Edge")) browser = "Edge";
    else if (userAgent.includes("Chrome")) browser = "Chrome";
    else if (userAgent.includes("Safari")) browser = "Safari";

    // OS detection
    if (userAgent.includes("Windows")) os = "Windows";
    else if (userAgent.includes("Mac OS")) os = "macOS";
    else if (userAgent.includes("Android")) os = "Android";
    else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";
    else if (userAgent.includes("Linux")) os = "Linux";

    return {
        browser,
        os,
        name: `${browser} on ${os}`,
    };
};
