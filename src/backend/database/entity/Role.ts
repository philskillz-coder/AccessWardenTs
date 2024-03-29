import {Column, CreateDateColumn, Entity, ManyToMany, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn} from "typeorm";

import { RolePermission } from "./RolePermission";
import { User } from "./User";


@Entity()
export class Role {
    @PrimaryGeneratedColumn()
        id: number;

    @Column({ unique: true })
        name: string;

    @Column({ default: ""})
        description: string;

    @Column({ default: false })
        requiresMfa: boolean;

    @Column({ default: false})
        disabled: boolean;

    @Column({ default: false })
        isDefault: boolean;

    @Column({ default: 1 })
        power: number;

    @OneToMany(() => RolePermission, rolePermission => rolePermission.role, { cascade: true })
        rolePermissions: RolePermission[];

    @ManyToMany(() => User, user => user.roles)
        users: User[];

    @CreateDateColumn()
        createdAt: Date;

    @UpdateDateColumn()
        updatedAt: Date;
}
