import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1701606037689 implements MigrationInterface {
    name = "Migration1701606037689";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE \"permission\" (\"id\" SERIAL NOT NULL, \"name\" character varying NOT NULL, \"description\" character varying, CONSTRAINT \"UQ_240853a0c3353c25fb12434ad33\" UNIQUE (\"name\"), CONSTRAINT \"PK_3b8b97af9d9d8807e41e6f48362\" PRIMARY KEY (\"id\"))");
        await queryRunner.query("CREATE TABLE \"user_role\" (\"id\" SERIAL NOT NULL, CONSTRAINT \"PK_fb2e442d14add3cefbdf33c4561\" PRIMARY KEY (\"id\"))");
        await queryRunner.query("CREATE TABLE \"user\" (\"id\" SERIAL NOT NULL, \"isAdmin\" boolean NOT NULL, \"username\" character varying NOT NULL, \"email\" character varying NOT NULL, \"passwordHash\" character varying NOT NULL, \"passwordSalt\" character varying NOT NULL, \"mfaEnabled\" boolean NOT NULL, \"mfaSecret\" character varying NOT NULL, CONSTRAINT \"UQ_78a916df40e02a9deb1c4b75edb\" UNIQUE (\"username\"), CONSTRAINT \"UQ_e12875dfb3b1d92d7d7c5377e22\" UNIQUE (\"email\"), CONSTRAINT \"PK_cace4a159ff9f2512dd42373760\" PRIMARY KEY (\"id\"))");
        await queryRunner.query("CREATE TABLE \"role\" (\"id\" SERIAL NOT NULL, \"name\" character varying NOT NULL, \"description\" character varying, \"requiresMfa\" boolean NOT NULL, \"isDefault\" boolean NOT NULL, CONSTRAINT \"UQ_ae4578dcaed5adff96595e61660\" UNIQUE (\"name\"), CONSTRAINT \"PK_b36bcfe02fc8de3c57a8b2391c2\" PRIMARY KEY (\"id\"))");
        await queryRunner.query("CREATE TABLE \"role_permission\" (\"id\" SERIAL NOT NULL, CONSTRAINT \"PK_96c8f1fd25538d3692024115b47\" PRIMARY KEY (\"id\"))");
        await queryRunner.query("CREATE TABLE \"user_role_user_user\" (\"userRoleId\" integer NOT NULL, \"userId\" integer NOT NULL, CONSTRAINT \"PK_2dfb7aae7923b918acb57bc69f5\" PRIMARY KEY (\"userRoleId\", \"userId\"))");
        await queryRunner.query("CREATE INDEX \"IDX_3a7c60cc0d1c3de93d0297a8b4\" ON \"user_role_user_user\" (\"userRoleId\") ");
        await queryRunner.query("CREATE INDEX \"IDX_9ab8ad1e13dd39b3a7230d47f1\" ON \"user_role_user_user\" (\"userId\") ");
        await queryRunner.query("CREATE TABLE \"user_role_role_role\" (\"userRoleId\" integer NOT NULL, \"roleId\" integer NOT NULL, CONSTRAINT \"PK_ea874057d90fb1846c46e576def\" PRIMARY KEY (\"userRoleId\", \"roleId\"))");
        await queryRunner.query("CREATE INDEX \"IDX_8db4c540421add895a829c00ed\" ON \"user_role_role_role\" (\"userRoleId\") ");
        await queryRunner.query("CREATE INDEX \"IDX_e7d9c820296d1d7cc21d5fbf45\" ON \"user_role_role_role\" (\"roleId\") ");
        await queryRunner.query("CREATE TABLE \"role_permission_role_role\" (\"rolePermissionId\" integer NOT NULL, \"roleId\" integer NOT NULL, CONSTRAINT \"PK_3604404d5aa240a7c8239d032ee\" PRIMARY KEY (\"rolePermissionId\", \"roleId\"))");
        await queryRunner.query("CREATE INDEX \"IDX_37e4ce9b61a73d26820fc24ebe\" ON \"role_permission_role_role\" (\"rolePermissionId\") ");
        await queryRunner.query("CREATE INDEX \"IDX_fd3d616e848250b41ab1310989\" ON \"role_permission_role_role\" (\"roleId\") ");
        await queryRunner.query("CREATE TABLE \"role_permission_permission_permission\" (\"rolePermissionId\" integer NOT NULL, \"permissionId\" integer NOT NULL, CONSTRAINT \"PK_d9fb0b92cb6a98d9c7804c8b0ce\" PRIMARY KEY (\"rolePermissionId\", \"permissionId\"))");
        await queryRunner.query("CREATE INDEX \"IDX_cb82cd5f4885169217caad7942\" ON \"role_permission_permission_permission\" (\"rolePermissionId\") ");
        await queryRunner.query("CREATE INDEX \"IDX_8ea67e3e15feded6cd6a5d55fc\" ON \"role_permission_permission_permission\" (\"permissionId\") ");
        await queryRunner.query("ALTER TABLE \"user_role_user_user\" ADD CONSTRAINT \"FK_3a7c60cc0d1c3de93d0297a8b4f\" FOREIGN KEY (\"userRoleId\") REFERENCES \"user_role\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE");
        await queryRunner.query("ALTER TABLE \"user_role_user_user\" ADD CONSTRAINT \"FK_9ab8ad1e13dd39b3a7230d47f15\" FOREIGN KEY (\"userId\") REFERENCES \"user\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE");
        await queryRunner.query("ALTER TABLE \"user_role_role_role\" ADD CONSTRAINT \"FK_8db4c540421add895a829c00ed7\" FOREIGN KEY (\"userRoleId\") REFERENCES \"user_role\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE");
        await queryRunner.query("ALTER TABLE \"user_role_role_role\" ADD CONSTRAINT \"FK_e7d9c820296d1d7cc21d5fbf456\" FOREIGN KEY (\"roleId\") REFERENCES \"role\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE");
        await queryRunner.query("ALTER TABLE \"role_permission_role_role\" ADD CONSTRAINT \"FK_37e4ce9b61a73d26820fc24ebea\" FOREIGN KEY (\"rolePermissionId\") REFERENCES \"role_permission\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE");
        await queryRunner.query("ALTER TABLE \"role_permission_role_role\" ADD CONSTRAINT \"FK_fd3d616e848250b41ab13109893\" FOREIGN KEY (\"roleId\") REFERENCES \"role\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE");
        await queryRunner.query("ALTER TABLE \"role_permission_permission_permission\" ADD CONSTRAINT \"FK_cb82cd5f4885169217caad7942a\" FOREIGN KEY (\"rolePermissionId\") REFERENCES \"role_permission\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE");
        await queryRunner.query("ALTER TABLE \"role_permission_permission_permission\" ADD CONSTRAINT \"FK_8ea67e3e15feded6cd6a5d55fc5\" FOREIGN KEY (\"permissionId\") REFERENCES \"permission\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE \"role_permission_permission_permission\" DROP CONSTRAINT \"FK_8ea67e3e15feded6cd6a5d55fc5\"");
        await queryRunner.query("ALTER TABLE \"role_permission_permission_permission\" DROP CONSTRAINT \"FK_cb82cd5f4885169217caad7942a\"");
        await queryRunner.query("ALTER TABLE \"role_permission_role_role\" DROP CONSTRAINT \"FK_fd3d616e848250b41ab13109893\"");
        await queryRunner.query("ALTER TABLE \"role_permission_role_role\" DROP CONSTRAINT \"FK_37e4ce9b61a73d26820fc24ebea\"");
        await queryRunner.query("ALTER TABLE \"user_role_role_role\" DROP CONSTRAINT \"FK_e7d9c820296d1d7cc21d5fbf456\"");
        await queryRunner.query("ALTER TABLE \"user_role_role_role\" DROP CONSTRAINT \"FK_8db4c540421add895a829c00ed7\"");
        await queryRunner.query("ALTER TABLE \"user_role_user_user\" DROP CONSTRAINT \"FK_9ab8ad1e13dd39b3a7230d47f15\"");
        await queryRunner.query("ALTER TABLE \"user_role_user_user\" DROP CONSTRAINT \"FK_3a7c60cc0d1c3de93d0297a8b4f\"");
        await queryRunner.query("DROP INDEX \"public\".\"IDX_8ea67e3e15feded6cd6a5d55fc\"");
        await queryRunner.query("DROP INDEX \"public\".\"IDX_cb82cd5f4885169217caad7942\"");
        await queryRunner.query("DROP TABLE \"role_permission_permission_permission\"");
        await queryRunner.query("DROP INDEX \"public\".\"IDX_fd3d616e848250b41ab1310989\"");
        await queryRunner.query("DROP INDEX \"public\".\"IDX_37e4ce9b61a73d26820fc24ebe\"");
        await queryRunner.query("DROP TABLE \"role_permission_role_role\"");
        await queryRunner.query("DROP INDEX \"public\".\"IDX_e7d9c820296d1d7cc21d5fbf45\"");
        await queryRunner.query("DROP INDEX \"public\".\"IDX_8db4c540421add895a829c00ed\"");
        await queryRunner.query("DROP TABLE \"user_role_role_role\"");
        await queryRunner.query("DROP INDEX \"public\".\"IDX_9ab8ad1e13dd39b3a7230d47f1\"");
        await queryRunner.query("DROP INDEX \"public\".\"IDX_3a7c60cc0d1c3de93d0297a8b4\"");
        await queryRunner.query("DROP TABLE \"user_role_user_user\"");
        await queryRunner.query("DROP TABLE \"role_permission\"");
        await queryRunner.query("DROP TABLE \"role\"");
        await queryRunner.query("DROP TABLE \"user\"");
        await queryRunner.query("DROP TABLE \"user_role\"");
        await queryRunner.query("DROP TABLE \"permission\"");
    }

}
