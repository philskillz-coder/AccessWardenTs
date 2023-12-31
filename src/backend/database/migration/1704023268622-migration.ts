import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1704023268622 implements MigrationInterface {
    name = "Migration1704023268622";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE \"role\" ADD \"createdAt\" TIMESTAMP NOT NULL DEFAULT now()");
        await queryRunner.query("ALTER TABLE \"role\" ADD \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now()");
        await queryRunner.query("ALTER TABLE \"role_permission\" ADD \"createdAt\" TIMESTAMP NOT NULL DEFAULT now()");
        await queryRunner.query("ALTER TABLE \"permission\" ADD \"createdAt\" TIMESTAMP NOT NULL DEFAULT now()");
        await queryRunner.query("ALTER TABLE \"permission\" ADD \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now()");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE \"permission\" DROP COLUMN \"updatedAt\"");
        await queryRunner.query("ALTER TABLE \"permission\" DROP COLUMN \"createdAt\"");
        await queryRunner.query("ALTER TABLE \"role_permission\" DROP COLUMN \"createdAt\"");
        await queryRunner.query("ALTER TABLE \"role\" DROP COLUMN \"updatedAt\"");
        await queryRunner.query("ALTER TABLE \"role\" DROP COLUMN \"createdAt\"");
    }

}
