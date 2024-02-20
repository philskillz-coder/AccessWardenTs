import { BaseRules } from "@shared/Validation";

// default rules are for a generic string
export const DEFAULT_RULES: BaseRules = {
    nullable: false,
    minLength: null,
    maxLength: null,

    allowEmpty: true,
    allowWhitespace: true,
    allowNewlines: true,
    allowSpecialChars: true,
    allowNonLatinChars: true,
    allowEmoji: true,

    requireOnlyAlphaNumeric: false,

    requireAnyUppercase: false,
    requireAnyLowercase: false,
    requireAnyNumeric: false,
    requireAnySpecial: false,

    minSpecialChars: null,
    maxSpecialChars: null,

    minNumericChars: null,
    maxNumericChars: null,

    minLowercaseChars: null,
    maxLowercaseChars: null,
    minUppercaseChars: null,
    maxUppercaseChars: null,

    regex: null
};

export const EMAIL_RULES: BaseRules = {
    allowEmpty: false,
    allowWhitespace: false,
    allowNewlines: false,
    allowSpecialChars: true,
    allowNonLatinChars: false,
    allowEmoji: false,
    maxLength: 255,
    regex: /^([a-z0-9_.-]+)@([\da-z.-]+)\.([a-z.]{2,6})$/
};

export const USERNAME_RULES: BaseRules = {
    minLength: 4,
    maxLength: 20,
    allowEmpty: false,
    allowWhitespace: false,
    allowNewlines: false,
    allowSpecialChars: false,
    allowEmoji: false
};

export const PASSWORD_RULES: BaseRules = {
    minLength: 8,
    maxLength: 64,
    allowEmpty: false,
    allowNewlines: false,
    requireAnyUppercase: true,
    requireAnyLowercase: true,
    requireAnyNumeric: true,
    requireAnySpecial: true,

    minSpecialChars: 1,
    minNumericChars: 1,
    minLowercaseChars: 1,
    minUppercaseChars: 1,
};

export const PERMISSION_NAME_RULES: BaseRules = {
    minLength: 1,
    maxLength: 32
};

export const PERMISSION_DESCRIPTION_RULES: BaseRules = {
    nullable: true,
    allowEmpty: true,
    minLength: 0,
    maxLength: 255,
    allowWhitespace: true,
    allowNewlines: true
};

export const ROLE_NAME_RULES: BaseRules = {
    minLength: 1,
    maxLength: 32
};

export const ROLE_DESCRIPTION_RULES: BaseRules = {
    nullable: true,
    allowEmpty: true,
    minLength: 0,
    maxLength: 255,
    allowWhitespace: true,
    allowNewlines: true
};

