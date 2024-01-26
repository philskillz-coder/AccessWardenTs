import { BaseRules } from "@shared/Validation";

export const EMAIL_RULES: BaseRules = {
    maxLength: 255,
    // regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    regex: /^([a-z0-9_.-]+)@([\da-z.-]+)\.([a-z.]{2,6})$/
};

export const USERNAME_RULES: BaseRules = {
    minLength: 4,
    maxLength: 20
};

export const PASSWORD_RULES: BaseRules = {
    minLength: 8,
    maxLength: 64,
    requireAnyUppercase: true,
    requireAnyLowercase: true,
    requireAnyNumeric: true,
    requireAnySpecial: true
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

