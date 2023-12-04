import { Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from "typeorm";

import {Permission} from "./Permission";
import {Role} from "./Role";

@Entity()
export class RolePermission {
    @PrimaryGeneratedColumn()
        id: number;

    @ManyToMany(() => Role)
    @JoinTable()
        role: Role;

    @ManyToMany(() => Permission)
    @JoinTable()
        permission: Permission;
}
