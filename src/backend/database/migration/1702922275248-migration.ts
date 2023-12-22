import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1702922275248 implements MigrationInterface {
    name = "Migration1702922275248";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE \"role_permission\" RENAME COLUMN \"perRole\" TO \"hasPermission\"");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE \"role_permission\" RENAME COLUMN \"hasPermission\" TO \"perRole\"");
    }

}
