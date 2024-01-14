import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

import { RolePermission } from "./RolePermission";


@Entity()
export class Permission {
    @PrimaryGeneratedColumn()
        id: number;

    @Column({ unique: true })
        name: string;

    @Column({ nullable: true, default: "" })
        description: string;

    @OneToMany(() => RolePermission, rolePermission => rolePermission.permission)
        rolePermissions: RolePermission[];

    @CreateDateColumn()
        createdAt: Date;

    @UpdateDateColumn()
        updatedAt: Date;
}
