import { Column, CreateDateColumn, Entity, JoinTable, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

import {UserRole} from "./UserRole";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
        id: number;

    @Column()
        isAdmin: boolean;

    @Column({ unique: true })
        username: string;

    @Column({ unique: true })
        email: string; // add

    @Column({ default: false })
        isEmailVerified: boolean = false;

    @Column({ default: "default0.png"})
        avatar: string;

    @Column()
        passwordHash: string;

    @Column()
        passwordSalt: string;

    @Column()
        mfaEnabled: boolean;

    @Column({nullable: true})
        mfaSecret: string | null;

    @Column({default: ""})
        loginSession: string = "";

    @CreateDateColumn()
        createdAt: Date; // Creation date

    @UpdateDateColumn()
        updatedAt: Date; // Last updated date

    @OneToMany(() => UserRole, userRole => userRole.user)
    @JoinTable()
        roles: UserRole[];
}
