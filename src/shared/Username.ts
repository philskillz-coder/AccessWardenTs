export interface UsernameRules {
    minLength?: number | undefined | null;
    maxLength?: number | undefined | null;
    requireAlphaNumeric?: boolean | null | undefined;
    requireSpecialChar?: boolean | null | undefined;
}

export const USERNAME_RULES = {
    minLength: 4,
    maxLength: 20,
    requireAlphaNumeric: true,
    requireSpecialChar: false
};

export function isUsernameValid(username: string, rules: UsernameRules = {}): boolean {
    // Default values for rules
    const {
        minLength = 4,
        maxLength = 20,
        requireAlphaNumeric = true,
        requireSpecialChar = false
    } = rules;

    // Check length
    if (username.length < minLength || username.length > maxLength) {
        return false;
    }

    // Check for alphanumeric characters
    if (requireAlphaNumeric && !/^[a-zA-Z0-9]+$/.test(username)) {
        return false;
    }

    // Check for special character
    if (requireSpecialChar && /[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(username)) {
        return false;
    }

    // All checks passed
    return true;
}

export function getFirstUsernameError(username: string, rules: UsernameRules = {}): string | null {
    // Default values for rules
    const {
        minLength = 4,
        maxLength = 20,
        requireAlphaNumeric = true,
        requireSpecialChar = false
    } = rules;

    // Check length
    if (username.length < minLength || username.length > maxLength) {
        return `Username must be between ${minLength} and ${maxLength} characters long.`;
    }

    // Check for alphanumeric characters
    if (requireAlphaNumeric && !/^[a-zA-Z0-9]+$/.test(username)) {
        return "Username must only contain alphanumeric characters.";
    }

    // Check for special character
    if (requireSpecialChar && /[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(username)) {
        return "Username cannot contain special characters.";
    }

    return null;
}
