
/**
 * Escape special characters in a string for use in a regular expression.
 * @param {string} string - The string to escape.
 * @returns {string} - The escaped string.
 */
export const escapeRegex = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
