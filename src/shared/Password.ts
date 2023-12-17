export interface PasswordRules {
    minLength?: number | undefined | null;
    requireUppercase?: boolean | null | undefined;
    requireLowercase?: boolean | null | undefined;
    requireDigit?: boolean | null | undefined;
    requireSpecialChar?: boolean | null | undefined;
}

export const PASSWORD_RULES = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireDigit: true,
    requireSpecialChar: true
};

export function isPasswordValid(password: string, rules: PasswordRules = {}): boolean {
    // Default values for rules
    const {
        minLength = 8,
        requireUppercase = true,
        requireLowercase = true,
        requireDigit = true,
        requireSpecialChar = true,
    } = rules;

    // Check minimum length
    if (password.length < minLength) {
        return false;
    }

    // Check for uppercase character
    if (requireUppercase && !/[A-Z]/.test(password)) {
        return false;
    }

    // Check for lowercase character
    if (requireLowercase && !/[a-z]/.test(password)) {
        return false;
    }

    // Check for digit
    if (requireDigit && !/\d/.test(password)) {
        return false;
    }

    // Check for special character
    if (requireSpecialChar && !/[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(password)) {
        return false;
    }

    // All checks passed
    return true;
}

export function getFirstPasswordError(password: string, rules: PasswordRules = {}) : string | null {
    // Default values for rules
    const {
        minLength = 8,
        requireUppercase = true,
        requireLowercase = true,
        requireDigit = true,
        requireSpecialChar = true,
    } = rules;

    // Check minimum length
    if (password.length < minLength) {
        return `Password must be at least ${minLength} characters long.`;
    }

    // Check for uppercase character
    if (requireUppercase && !/[A-Z]/.test(password)) {
        return "Password must contain at least one uppercase character.";
    }

    // Check for lowercase character
    if (requireLowercase && !/[a-z]/.test(password)) {
        return "Password must contain at least one lowercase character.";
    }

    // Check for digit
    if (requireDigit && !/\d/.test(password)) {
        return "Password must contain at least one digit.";
    }

    // Check for special character
    if (requireSpecialChar && !/[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(password)) {
        return "Password must contain at least one special character.";
    }

    return null;
}
