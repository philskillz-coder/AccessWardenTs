import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1702921481908 implements MigrationInterface {
    name = "Migration1702921481908";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE \"role_permission\" (\"id\" SERIAL NOT NULL, \"perRole\" boolean, \"roleId\" integer, \"permissionId\" integer, CONSTRAINT \"PK_96c8f1fd25538d3692024115b47\" PRIMARY KEY (\"id\"))");
        await queryRunner.query("ALTER TABLE \"role\" ADD \"power\" integer NOT NULL DEFAULT '1'");
        await queryRunner.query("ALTER TABLE \"role_permission\" ADD CONSTRAINT \"FK_e3130a39c1e4a740d044e685730\" FOREIGN KEY (\"roleId\") REFERENCES \"role\"(\"id\") ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE \"role_permission\" ADD CONSTRAINT \"FK_72e80be86cab0e93e67ed1a7a9a\" FOREIGN KEY (\"permissionId\") REFERENCES \"permission\"(\"id\") ON DELETE NO ACTION ON UPDATE NO ACTION");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE \"role_permission\" DROP CONSTRAINT \"FK_72e80be86cab0e93e67ed1a7a9a\"");
        await queryRunner.query("ALTER TABLE \"role_permission\" DROP CONSTRAINT \"FK_e3130a39c1e4a740d044e685730\"");
        await queryRunner.query("ALTER TABLE \"role\" DROP COLUMN \"power\"");
        await queryRunner.query("DROP TABLE \"role_permission\"");
    }

}
