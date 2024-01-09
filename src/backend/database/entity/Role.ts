import {Column, CreateDateColumn, Entity, ManyToMany, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn} from "typeorm";

import { RolePermission } from "./RolePermission";
import { User } from "./User";


@Entity()
export class Role {
    @PrimaryGeneratedColumn()
        id: number;

    @Column({ unique: true })
        name: string;

    @Column({ nullable: true })
        description: string;

    @Column()
        requiresMfa: boolean;

    @Column({ default: false}) // TODO: only has role when not disabled
        disabled: boolean;

    @Column()
        isDefault: boolean;

    @Column({ default: 1 })
        power: number;

    @OneToMany(() => RolePermission, rolePermission => rolePermission.role)
        rolePermissions: RolePermission[];

    @ManyToMany(() => User, user => user.roles)
        users: User[];

    @CreateDateColumn()
        createdAt: Date;

    @UpdateDateColumn()
        updatedAt: Date;
}
