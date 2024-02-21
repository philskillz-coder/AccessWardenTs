import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1708524891748 implements MigrationInterface {
    name = "Migration1708524891748";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE \"user\" ALTER COLUMN \"isAdmin\" SET DEFAULT false");
        await queryRunner.query("ALTER TABLE \"user\" ALTER COLUMN \"mfaEnabled\" SET DEFAULT false");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE \"user\" ALTER COLUMN \"mfaEnabled\" DROP DEFAULT");
        await queryRunner.query("ALTER TABLE \"user\" ALTER COLUMN \"isAdmin\" DROP DEFAULT");
    }

}
