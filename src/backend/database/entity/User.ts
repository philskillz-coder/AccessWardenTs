import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

import { Role } from "./Role";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
        id: number;

    @Column({ default: false })
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

    @Column({ default: false })
        mfaEnabled: boolean;

    @Column({nullable: true})
        mfaSecret: string | null;

    @Column({default: ""})
        loginSession: string = "";

    // diffrent
    @Column({default: false})
        suspended: boolean = false;

    @ManyToMany(() => Role)
    @JoinTable()
        roles: Role[];

    @CreateDateColumn()
        createdAt: Date;

    @UpdateDateColumn()
        updatedAt: Date;
}
