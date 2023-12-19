import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import { RolePermission } from "./RolePermission";


@Entity()
export class Permission {
    @PrimaryGeneratedColumn()
        id: number;

    @Column({ unique: true })
        name: string;

    @Column({ nullable: true })
        description: string;

    @OneToMany(() => RolePermission, rolePermission => rolePermission.permission)
        rolePermissions: RolePermission[];
}
