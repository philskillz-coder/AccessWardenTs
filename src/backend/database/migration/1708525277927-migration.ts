import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1708525277927 implements MigrationInterface {
    name = "Migration1708525277927";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE \"role\" ALTER COLUMN \"description\" SET NOT NULL");
        await queryRunner.query("ALTER TABLE \"role\" ALTER COLUMN \"description\" SET DEFAULT ''");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE \"role\" ALTER COLUMN \"description\" DROP DEFAULT");
        await queryRunner.query("ALTER TABLE \"role\" ALTER COLUMN \"description\" DROP NOT NULL");
    }

}
