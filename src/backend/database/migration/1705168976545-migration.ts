import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1705168976545 implements MigrationInterface {
    name = "Migration1705168976545";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE \"user\" DROP COLUMN \"suspended\"");
        await queryRunner.query("ALTER TABLE \"role\" DROP COLUMN \"disabled\"");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE \"role\" ADD \"disabled\" boolean NOT NULL DEFAULT false");
        await queryRunner.query("ALTER TABLE \"user\" ADD \"suspended\" boolean NOT NULL DEFAULT false");
    }

}
