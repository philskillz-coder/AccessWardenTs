export interface IdBase {
    id: string;
}

export interface UserNormal extends IdBase {
    username: string;
}
export interface PermissionNormal extends IdBase {
    name: string;
}
export interface RoleNormal extends IdBase {
    name: string;
}
export interface RolePermissionNormal extends PermissionNormal {
    hasPermission: boolean | null;
}

export interface UserVariantDef extends UserNormal {
    email: string;
    avatar: string;
    isEmailVerified: boolean;
    mfaEnabled: boolean;
    createdAt: number;
    updatedAt: number;
    suspended: boolean;
}
export interface PermissionVariantDef extends PermissionNormal {
    description: string;
    createdAt: number;
    updatedAt: number;
}
export interface RoleVariantDef extends RoleNormal {
    description: string;
    requiresMfa: boolean;
    isDefault: boolean;
    power: number;
    disabled: boolean;
    createdAt: number;
    updatedAt: number;
}

export interface UserVariantP extends UserVariantDef {
    permissions: PermissionNormal[];
}
export interface UserVariantR extends UserVariantDef {
    roles: RoleNormal[];
}
export interface UserVariantAuth extends UserVariantP {
    mfaSuggested: boolean;
}
