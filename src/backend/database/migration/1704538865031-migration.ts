import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1704538865031 implements MigrationInterface {
    name = "Migration1704538865031";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE \"user\" ADD \"suspended\" boolean NOT NULL DEFAULT false");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE \"user\" DROP COLUMN \"suspended\"");
    }

}
