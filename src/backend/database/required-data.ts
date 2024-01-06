/* eslint-disable no-unused-vars */
export enum PagePermissions {
    Test = "Test",
    User = "User",
    UserLogin = "User.Login",
    UserEditEmail = "User.Edit.Email",
    UserEditUsername = "User.Edit.Username",
    UserEditPassword = "User.Edit.Password",
    UserEditMfa = "User.Edit.Mfa",
    UserEditProfile = "User.Edit.Profile",

    Admin = "Admin",
    AdminViewUsers = "Admin.View.Users",
    AdminViewRoles = "Admin.View.Roles",
    AdminViewPermissions = "Admin.View.Permission",

    AdminCreateUser = "Admin.Create.User",
    AdminCreateRole = "Admin.Create.Role",
    AdminCreatePermission = "Admin.Create.Permission",
    AdminLoginAs = "Admin.LoginAs",

    AdminEditUserEmail = "Admin.Edit.User.Email",
    AdminEditUserUsername = "Admin.Edit.User.Username",
    AdminEditUserPassword = "Admin.Edit.User.Password",
    AdminEditUserMfa = "Admin.Edit.User.Mfa",
    AdminEditUserVerifyEmail = "Admin.Edit.User.VerifyEmail",
    AdminEditUserProfile = "Admin.Edit.User.Profile",
    AdminEditUserRoles = "Admin.Edit.User.Roles",
    AdminEditUserSuspend = "Admin.Edit.User.Suspend",
    AdminEditUserDelete = "Admin.Edit.User.Delete",

    AdminEditRoleName = "Admin.Edit.Role.Name",
    AdminEditRoleDescription = "Admin.Edit.Role.Description",
    AdminEditRolePermissions = "Admin.Edit.Role.Permissions",
    AdminEditRoleDelete = "Admin.Edit.Role.Delete",

    AdminEditPermissionName = "Admin.Edit.Permission.Name",
    AdminEditPermissionDescription = "Admin.Edit.Permission.Description",
    AdminEditPermissionDelete = "Admin.Edit.Permission.Delete"
}

export enum PageRoles {
}
