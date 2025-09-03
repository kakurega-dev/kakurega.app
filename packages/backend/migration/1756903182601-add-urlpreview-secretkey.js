export class AddUrlpreviewSecretkey1756903182601 {
    name = 'AddUrlpreviewSecretkey1756903182601'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" ADD "urlPreviewSecretKey" character varying(1024)`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "urlPreviewSecretKey"`);
    }
}
