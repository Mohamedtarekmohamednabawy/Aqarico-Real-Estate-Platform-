/**
 * Extract agent/owner information for a property
 */

/**
 * Get agent/owner data for a property
 * @param {Object} property - The property object
 * @param {Object} currentUser - The currently logged in user (optional)
 * @returns {Object|null} Agent data object with firstName, lastName, name, email, role, profileImage, phone
 */
export const getPropertyAgent = (property, currentUser = null) => {
    if (!property) return null;

    const users = JSON.parse(localStorage.getItem("users") || "[]");

    // Check if current user is the owner
    if (currentUser && property.ownerId === currentUser.email) {
        return {
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
            name: `${currentUser.firstName} ${currentUser.lastName}`,
            email: currentUser.email,
            role: currentUser.role || "Property Owner",
            profileImage: currentUser.profileImage || "",
            phone: currentUser.phone || "+20 100 000 0000"
        };
    }

    // Check if property has ownerId and find owner in users
    if (property.ownerId) {
        const owner = users.find(u => u.email === property.ownerId);
        if (owner) {
            return {
                firstName: owner.firstName,
                lastName: owner.lastName,
                name: `${owner.firstName} ${owner.lastName}`,
                email: owner.email,
                role: owner.role || "Real Estate Agent",
                profileImage: owner.profileImage || "",
                phone: owner.phone || "+20 100 000 0000"
            };
        }
    }

    // Check if property has agent object
    if (property.agent) {
        const nameParts = property.agent.name ? property.agent.name.split(" ") : ["Unknown", "Agent"];
        return {
            firstName: nameParts[0],
            lastName: nameParts.slice(1).join(" "),
            name: property.agent.name || "Unknown Agent",
            email: property.agent.email || "agent@aqarico.com",
            role: property.agent.role || "Real Estate Agent",
            profileImage: property.agent.image || property.agent.profileImage || "",
            phone: property.agent.phone || "+20 100 000 0000"
        };
    }

    // Fallback: Unknown agent
    return {
        firstName: "Unknown",
        lastName: "Agent",
        name: "Unknown Agent",
        email: "agent@aqarico.com",
        role: "Real Estate Agent",
        profileImage: "",
        phone: "+20 100 000 0000"
    };
};

/**
 * Get simple agent/owner data for property cards (lighter version)
 * @param {Object} property - The property object
 * @returns {Object|null} Simplified agent data with firstName, lastName, profileImage, role, phone
 */
export const getPropertyAgentSimple = (property) => {
    if (!property) return null;

    const users = JSON.parse(localStorage.getItem("users") || "[]");

    // Check ownerId first
    if (property.ownerId) {
        const owner = users.find(u => u.email === property.ownerId);
        if (owner) {
            return {
                firstName: owner.firstName,
                lastName: owner.lastName,
                profileImage: owner.profileImage || "",
                role: owner.role || "",
                phone: owner.phone || ""
            };
        }
    }

    // Check agent object
    if (property.agent) {
        const nameParts = property.agent.name ? property.agent.name.split(" ") : ["Unknown", "Agent"];
        return {
            firstName: nameParts[0],
            lastName: nameParts.slice(1).join(" "),
            profileImage: property.agent.image || property.agent.profileImage || "",
            role: property.agent.role || "Agent",
            phone: property.agent.phone || ""
        };
    }

    return null;
};
