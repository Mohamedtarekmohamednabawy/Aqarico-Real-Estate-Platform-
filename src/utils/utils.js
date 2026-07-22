/**
 * Shared utility functions for the Aqarico application
 */

/**
 * Hash a password using SHA-256
 * @param {string} text - The password to hash
 * @returns {Promise<string>} The hashed password as a hex string
 */
export const hashPassword = async (text) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
};

/**
 * Calculate password strength based on requirements
 * @param {string} password - The password to check
 * @returns {Object} Object with label, color, and width for strength indicator
 */
export const getPasswordStrength = (password) => {
    if (!password) return { label: "", color: "", width: 0, score: 0 };

    // --- Pattern penalties ---
    const commonPatterns = [
        /^123/, /^abc/i, /^qwerty/i, /^password/i, /^letmein/i,
        /^welcome/i, /^monkey/i, /^dragon/i, /(.)\1{2,}/, // repeated chars e.g. "aaa"
        /^(012|123|234|345|456|567|678|789)+$/, // sequential digits
    ];
    const hasWeakPattern = commonPatterns.some((p) => p.test(password));

    // --- Scoring ---
    let score = 0;

    // Length is the primary factor (NIST 2025 + NIST.gov recommendation: 15+ chars)
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (password.length >= 15) score += 2; // big jump for passphrases
    if (password.length >= 20) score += 1;

    // Character variety (bonus, not required)
    if (/[a-z]/.test(password)) score += 0.5;
    if (/[A-Z]/.test(password)) score += 0.5;
    if (/\d/.test(password)) score += 0.5;
    if (/[\W_]/.test(password)) score += 0.5;

    // Variety of unique characters (entropy boost)
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= 8) score += 0.5;
    if (uniqueChars >= 12) score += 0.5;

    // Penalize weak patterns
    if (hasWeakPattern) score = Math.max(0, score - 2);

    // --- Map score to 4 levels ---
    // Max theoretical score ≈ 10, practical strong password ≈ 6+
    if (score >= 7) {
        return { label: "Excellent", color: "#10b981", width: 100, score: 4 };
    }
    if (score >= 5) {
        return { label: "Strong", color: "#3b82f6", width: 75, score: 3 };
    }
    if (score >= 3) {
        return { label: "Fair", color: "#f59e0b", width: 50, score: 2 };
    }
    if (score >= 1) {
        return { label: "Weak", color: "#ef4444", width: 25, score: 1 };
    }
    return { label: "Weak", color: "#ef4444", width: 10, score: 0 };
};
