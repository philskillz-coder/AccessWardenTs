import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1702923114301 implements MigrationInterface {
    name = 'Migration1702923114301'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "role_permission" ALTER COLUMN "hasPermission" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "role_permission" ALTER COLUMN "hasPermission" DROP NOT NULL`);
    }

}
