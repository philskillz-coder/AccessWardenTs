export interface BaseRules {
    nullable?: boolean | null;
    minLength?: number | null;
    maxLength?: number | null;

    allowEmpty?: boolean | null;
    allowWhitespace?: boolean | null;
    allowNewlines?: boolean | null;
    allowSpecialChars?: boolean | null; // special chars are: !@#$%^&*()_+{}[]:;<>,.?~
    allowNonLatinChars?: boolean | null; // non-latin chars are: äöüÄÖÜß
    allowEmoji?: boolean | null;

    requireOnlyAlphaNumeric?: boolean | null; // alphanumeric chars are: a-z A-Z 0-9

    requireAnyUppercase?: boolean | null; // A-Z
    requireAnyLowercase?: boolean | null; // a-z
    requireAnyNumeric?: boolean | null; // 0-9
    requireAnySpecial?: boolean | null; // !@#$%^&*()_+{}[]:;<>,.?~

    minSpecialChars?: number | null;
    maxSpecialChars?: number | null;

    minNumericChars?: number | null;
    maxNumericChars?: number | null;

    minUppercaseChars?: number | null;
    maxUppercaseChars?: number | null;
    minLowercaseChars?: number | null;
    maxLowercaseChars?: number | null;

    regex?: RegExp | null;
}

export function baseCheck(value: string, rules?: BaseRules | null | undefined): boolean {
    if (rules === null || rules === undefined) {
        return true;
    }
    const {
        nullable = false,
        minLength = null,
        maxLength = null,

        allowEmpty = false,
        allowWhitespace = false,
        allowNewlines = false,
        allowSpecialChars = true,
        allowNonLatinChars = true,
        allowEmoji = false,

        requireOnlyAlphaNumeric = false,

        requireAnyUppercase = false,
        requireAnyLowercase = false,
        requireAnyNumeric = false,
        requireAnySpecial = false,

        minSpecialChars = null,
        maxSpecialChars = null,

        minNumericChars = null,
        maxNumericChars = null,

        minUppercaseChars = null,
        maxUppercaseChars = null,
        minLowercaseChars = null,
        maxLowercaseChars = null,

        regex = null
    } = rules;

    if (nullable !== null) {
        if (!nullable && value === null) { // null is not allowed
            return false;
        }
        if (nullable && value === null) { // null is allowed and value is null
            return true;
        }
    }

    if (minLength !== null && value.length < minLength) {
        return false;
    }
    if (maxLength !== null && value.length > maxLength) {
        return false;
    }

    if (allowEmpty !== null && !allowEmpty && value?.length === 0) {
        return false;
    }

    if (allowWhitespace !== null && !allowWhitespace && /\s/.test(value)) {
        return false;
    }

    if (allowNewlines !== null && !allowNewlines && /\n/.test(value)) {
        return false;
    }

    if (allowSpecialChars !== null && !allowSpecialChars && /[!@#$%^&*()_+{}[\]:;<>,.?~\\/-]/.test(value)) {
        return false;
    }

    if (allowNonLatinChars !== null && !allowNonLatinChars && /[äöüÄÖÜß]/.test(value)) {
        return false;
    }

    if (allowEmoji !== null && !allowEmoji && /\p{Emoji}/u.test(value)) {
        return false;
    }

    if (requireOnlyAlphaNumeric !== null && requireOnlyAlphaNumeric && !/^[a-zA-Z0-9]+$/.test(value)) {
        return false;
    }

    if (requireAnyUppercase !== null && requireAnyUppercase && !/[A-Z]/.test(value)) {
        return false;
    }

    if (requireAnyLowercase !== null && requireAnyLowercase && !/[a-z]/.test(value)) {
        return false;
    }

    if (requireAnyNumeric !== null && requireAnyNumeric && !/[0-9]/.test(value)) {
        return false;
    }

    if (requireAnySpecial !== null && requireAnySpecial && !/[!@#$%^&*()_+{}[\]:;<>,.?~\\/-]/.test(value)) {
        return false;
    }

    if (minSpecialChars !== null && value.match(/[!@#$%^&*()_+{}[\]:;<>,.?~\\/-]/g)?.length < minSpecialChars) {
        return false;
    }

    if (maxSpecialChars !== null && value.match(/[!@#$%^&*()_+{}[\]:;<>,.?~\\/-]/g)?.length > maxSpecialChars) {
        return false;
    }

    if (minNumericChars !== null && value.match(/[0-9]/g)?.length < minNumericChars) {
        return false;
    }

    if (maxNumericChars !== null && value.match(/[0-9]/g)?.length > maxNumericChars) {
        return false;
    }

    if (minUppercaseChars !== null && value.match(/[A-Z]/g)?.length < minUppercaseChars) {
        return false;
    }

    if (maxUppercaseChars !== null && value.match(/[A-Z]/g)?.length > maxUppercaseChars) {
        return false;
    }

    if (minLowercaseChars !== null && value.match(/[a-z]/g)?.length < minLowercaseChars) {
        return false;
    }

    if (maxLowercaseChars !== null && value.match(/[a-z]/g)?.length > maxLowercaseChars) {
        return false;
    }

    if (regex !== null && !rules.regex.test(value)) {
        return false;
    }

    // All checks passed
    return true;
}

export function getFirstCheckError(value: string, rules?: BaseRules | null | undefined): string | null {
    if (rules === null || rules === undefined) {
        return null;
    }
    const {
        nullable = false,
        minLength = null,
        maxLength = null,

        allowEmpty = false,
        allowWhitespace = false,
        allowNewlines = false,
        allowSpecialChars = true,
        allowNonLatinChars = true,
        allowEmoji = false,

        requireOnlyAlphaNumeric = false,

        requireAnyUppercase = false,
        requireAnyLowercase = false,
        requireAnyNumeric = false,
        requireAnySpecial = false,

        minSpecialChars = null,
        maxSpecialChars = null,

        minNumericChars = null,
        maxNumericChars = null,

        minUppercaseChars = null,
        maxUppercaseChars = null,
        minLowercaseChars = null,
        maxLowercaseChars = null,

        regex = null
    } = rules;

    if (nullable !== null) {
        if (!nullable && value === null) { // null is not allowed
            return "Value cannot be null.";
        }
        if (nullable && value === null) { // null is allowed and value is null
            return null;
        }
    }

    if (minLength !== null && value.length < minLength) {
        return `Value must be at least ${minLength} characters long.`;
    }
    if (maxLength !== null && value.length > maxLength) {
        return `Value must be at most ${maxLength} characters long.`;
    }

    if (allowEmpty !== null && !allowEmpty && value?.length === 0) {
        return "Value cannot be empty.";
    }

    if (allowWhitespace !== null && !allowWhitespace && /\s/.test(value)) {
        return "Value cannot contain whitespace.";
    }

    if (allowNewlines !== null && !allowNewlines && /\n/.test(value)) {
        return "Value cannot contain newlines.";
    }

    if (allowSpecialChars !== null && !allowSpecialChars && /[!@#$%^&*()_+{}[\]:;<>,.?~\\/-]/.test(value)) {
        return "Value cannot contain special characters.";
    }

    if (allowNonLatinChars !== null && !allowNonLatinChars && /[äöüÄÖÜß]/.test(value)) {
        return "Value cannot contain non-latin characters (äöüÄÖÜß).";
    }

    if (allowEmoji !== null && !allowEmoji && /\p{Emoji}/u.test(value)) {
        return "Value cannot contain emoji.";
    }

    if (requireOnlyAlphaNumeric !== null && requireOnlyAlphaNumeric && !/^[a-zA-Z0-9]+$/.test(value)) {
        return "Value must only contain alphanumeric characters (a-z A-Z 0-9).";
    }

    if (requireAnyUppercase !== null && requireAnyUppercase && !/[A-Z]/.test(value)) {
        return "Value must contain at least one uppercase character (A-Z).";
    }

    if (requireAnyLowercase !== null && requireAnyLowercase && !/[a-z]/.test(value)) {
        return "Value must contain at least one lowercase character (a-z).";
    }

    if (requireAnyNumeric !== null && requireAnyNumeric && !/[0-9]/.test(value)) {
        return "Value must contain at least one numeric character (0-9).";
    }

    if (requireAnySpecial !== null && requireAnySpecial && !/[!@#$%^&*()_+{}[\]:;<>,.?~\\/-]/.test(value)) {
        return "Value must contain at least one special character.";
    }

    if (minSpecialChars !== null && value.match(/[!@#$%^&*()_+{}[\]:;<>,.?~\\/-]/g)?.length < minSpecialChars) {
        return `Value must contain at least ${minSpecialChars} special characters.`;
    }

    if (maxSpecialChars !== null && value.match(/[!@#$%^&*()_+{}[\]:;<>,.?~\\/-]/g)?.length > maxSpecialChars) {
        return `Value must contain at most ${maxSpecialChars} special characters.`;
    }

    if (minNumericChars !== null && value.match(/[0-9]/g)?.length < minNumericChars) {
        return `Value must contain at least ${minNumericChars} numeric (0-9) characters.`;
    }

    if (maxNumericChars !== null && value.match(/[0-9]/g)?.length > maxNumericChars) {
        return `Value must contain at most ${maxNumericChars} numeric (0-9) characters.`;
    }

    if (minUppercaseChars !== null && value.match(/[A-Z]/g)?.length < minUppercaseChars) {
        return `Value must contain at least ${minUppercaseChars} uppercase (A-Z) characters.`;
    }

    if (maxUppercaseChars !== null && value.match(/[A-Z]/g)?.length > maxUppercaseChars) {
        return `Value must contain at most ${maxUppercaseChars} uppercase (A-Z) characters.`;
    }

    if (minLowercaseChars !== null && value.match(/[a-z]/g)?.length < minLowercaseChars) {
        return `Value must contain at least ${minLowercaseChars} lowercase (a-z) characters.`;
    }

    if (maxLowercaseChars !== null && value.match(/[a-z]/g)?.length > maxLowercaseChars) {
        return `Value must contain at most ${maxLowercaseChars} lowercase (a-z) characters.`;
    }

    if (regex !== null && !rules.regex.test(value)) {
        return "Value does not match the required pattern.";
    }

    // All checks passed
    return null;
}
