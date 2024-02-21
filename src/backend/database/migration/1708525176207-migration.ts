import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1708525176207 implements MigrationInterface {
    name = 'Migration1708525176207'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "role" ALTER COLUMN "requiresMfa" SET DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "role" ALTER COLUMN "isDefault" SET DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "role" ALTER COLUMN "isDefault" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "role" ALTER COLUMN "requiresMfa" DROP DEFAULT`);
    }

}
