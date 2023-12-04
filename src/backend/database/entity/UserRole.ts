import { Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from "typeorm";

import { Role } from "./Role";
import { User } from "./User";

@Entity()
export class UserRole {
    @PrimaryGeneratedColumn()
        id: number;

    @ManyToMany(() => User)
    @JoinTable()
        user: User;

    @ManyToMany(() => Role)
    @JoinTable()
        role: Role;
}
