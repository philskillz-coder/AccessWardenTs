// rolePermission.ts
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

import { Permission } from "./Permission";
import { Role } from "./Role";

@Entity()
export class RolePermission {
    @PrimaryGeneratedColumn()
        id: number;

    @ManyToOne(() => Role, role => role.rolePermissions)
        role: Role;

    @ManyToOne(() => Permission, permission => permission.rolePermissions)
        permission: Permission;

    @Column()
        hasPermission: boolean;

    @CreateDateColumn()
        createdAt: Date;
}
