import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1702919396118 implements MigrationInterface {
    name = "Migration1702919396118";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE \"user\" (\"id\" SERIAL NOT NULL, \"isAdmin\" boolean NOT NULL, \"username\" character varying NOT NULL, \"email\" character varying NOT NULL, \"isEmailVerified\" boolean NOT NULL DEFAULT false, \"avatar\" character varying NOT NULL DEFAULT 'default0.png', \"passwordHash\" character varying NOT NULL, \"passwordSalt\" character varying NOT NULL, \"mfaEnabled\" boolean NOT NULL, \"mfaSecret\" character varying, \"loginSession\" character varying NOT NULL DEFAULT '', \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"UQ_78a916df40e02a9deb1c4b75edb\" UNIQUE (\"username\"), CONSTRAINT \"UQ_e12875dfb3b1d92d7d7c5377e22\" UNIQUE (\"email\"), CONSTRAINT \"PK_cace4a159ff9f2512dd42373760\" PRIMARY KEY (\"id\"))");
        await queryRunner.query("CREATE TABLE \"role\" (\"id\" SERIAL NOT NULL, \"name\" character varying NOT NULL, \"description\" character varying, \"requiresMfa\" boolean NOT NULL, \"isDefault\" boolean NOT NULL, CONSTRAINT \"UQ_ae4578dcaed5adff96595e61660\" UNIQUE (\"name\"), CONSTRAINT \"PK_b36bcfe02fc8de3c57a8b2391c2\" PRIMARY KEY (\"id\"))");
        await queryRunner.query("CREATE TABLE \"permission\" (\"id\" SERIAL NOT NULL, \"name\" character varying NOT NULL, \"description\" character varying, CONSTRAINT \"UQ_240853a0c3353c25fb12434ad33\" UNIQUE (\"name\"), CONSTRAINT \"PK_3b8b97af9d9d8807e41e6f48362\" PRIMARY KEY (\"id\"))");
        await queryRunner.query("CREATE TABLE \"user_roles_role\" (\"userId\" integer NOT NULL, \"roleId\" integer NOT NULL, CONSTRAINT \"PK_b47cd6c84ee205ac5a713718292\" PRIMARY KEY (\"userId\", \"roleId\"))");
        await queryRunner.query("CREATE INDEX \"IDX_5f9286e6c25594c6b88c108db7\" ON \"user_roles_role\" (\"userId\") ");
        await queryRunner.query("CREATE INDEX \"IDX_4be2f7adf862634f5f803d246b\" ON \"user_roles_role\" (\"roleId\") ");
        await queryRunner.query("CREATE TABLE \"role_permissions_permission\" (\"roleId\" integer NOT NULL, \"permissionId\" integer NOT NULL, CONSTRAINT \"PK_b817d7eca3b85f22130861259dd\" PRIMARY KEY (\"roleId\", \"permissionId\"))");
        await queryRunner.query("CREATE INDEX \"IDX_b36cb2e04bc353ca4ede00d87b\" ON \"role_permissions_permission\" (\"roleId\") ");
        await queryRunner.query("CREATE INDEX \"IDX_bfbc9e263d4cea6d7a8c9eb3ad\" ON \"role_permissions_permission\" (\"permissionId\") ");
        await queryRunner.query("ALTER TABLE \"user_roles_role\" ADD CONSTRAINT \"FK_5f9286e6c25594c6b88c108db77\" FOREIGN KEY (\"userId\") REFERENCES \"user\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE");
        await queryRunner.query("ALTER TABLE \"user_roles_role\" ADD CONSTRAINT \"FK_4be2f7adf862634f5f803d246b8\" FOREIGN KEY (\"roleId\") REFERENCES \"role\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE");
        await queryRunner.query("ALTER TABLE \"role_permissions_permission\" ADD CONSTRAINT \"FK_b36cb2e04bc353ca4ede00d87b9\" FOREIGN KEY (\"roleId\") REFERENCES \"role\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE");
        await queryRunner.query("ALTER TABLE \"role_permissions_permission\" ADD CONSTRAINT \"FK_bfbc9e263d4cea6d7a8c9eb3ad2\" FOREIGN KEY (\"permissionId\") REFERENCES \"permission\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE \"role_permissions_permission\" DROP CONSTRAINT \"FK_bfbc9e263d4cea6d7a8c9eb3ad2\"");
        await queryRunner.query("ALTER TABLE \"role_permissions_permission\" DROP CONSTRAINT \"FK_b36cb2e04bc353ca4ede00d87b9\"");
        await queryRunner.query("ALTER TABLE \"user_roles_role\" DROP CONSTRAINT \"FK_4be2f7adf862634f5f803d246b8\"");
        await queryRunner.query("ALTER TABLE \"user_roles_role\" DROP CONSTRAINT \"FK_5f9286e6c25594c6b88c108db77\"");
        await queryRunner.query("DROP INDEX \"public\".\"IDX_bfbc9e263d4cea6d7a8c9eb3ad\"");
        await queryRunner.query("DROP INDEX \"public\".\"IDX_b36cb2e04bc353ca4ede00d87b\"");
        await queryRunner.query("DROP TABLE \"role_permissions_permission\"");
        await queryRunner.query("DROP INDEX \"public\".\"IDX_4be2f7adf862634f5f803d246b\"");
        await queryRunner.query("DROP INDEX \"public\".\"IDX_5f9286e6c25594c6b88c108db7\"");
        await queryRunner.query("DROP TABLE \"user_roles_role\"");
        await queryRunner.query("DROP TABLE \"permission\"");
        await queryRunner.query("DROP TABLE \"role\"");
        await queryRunner.query("DROP TABLE \"user\"");
    }

}
