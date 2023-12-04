import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from "typeorm";

import {User} from "./User";

@Entity()
export class Role {
    @PrimaryGeneratedColumn()
        id: number;

    @Column({ unique: true})
        name: string;

    @Column({ nullable: true })
        description: string;

    @Column()
        requiresMfa: boolean;

    @Column()
        isDefault: boolean;

    @ManyToMany(() => User, user => user.roles)
        users: User[];
}
