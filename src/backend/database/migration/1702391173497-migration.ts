import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1702391173497 implements MigrationInterface {
    name = 'Migration1702391173497'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "avatar" character varying NOT NULL DEFAULT 'default0.png'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "avatar"`);
    }

}
