import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1701606198365 implements MigrationInterface {
    name = "Migration1701606198365";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE \"user\" ALTER COLUMN \"mfaSecret\" DROP NOT NULL");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE \"user\" ALTER COLUMN \"mfaSecret\" SET NOT NULL");
    }

}
