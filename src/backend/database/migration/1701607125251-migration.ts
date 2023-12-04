import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1701607125251 implements MigrationInterface {
    name = "Migration1701607125251";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE \"user\" ADD \"isEmailVerified\" boolean NOT NULL DEFAULT false");
        await queryRunner.query("ALTER TABLE \"user\" ADD \"loginSession\" character varying NOT NULL DEFAULT ''");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE \"user\" DROP COLUMN \"loginSession\"");
        await queryRunner.query("ALTER TABLE \"user\" DROP COLUMN \"isEmailVerified\"");
    }

}
