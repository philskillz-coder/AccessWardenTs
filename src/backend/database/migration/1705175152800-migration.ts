import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1705175152800 implements MigrationInterface {
    name = 'Migration1705175152800'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "permission" ALTER COLUMN "description" SET DEFAULT ''`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "permission" ALTER COLUMN "description" DROP DEFAULT`);
    }

}
