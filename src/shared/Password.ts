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
