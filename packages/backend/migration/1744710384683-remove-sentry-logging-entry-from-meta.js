export class RemoveSentryLoggingEntryFromMeta1744710384683 {
    name = 'RemoveSentryLoggingEntryFromMeta1744710384683'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "enableSentryLogging"`);
        await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "sentryDsn"`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" ADD "sentryDsn" character varying(1024)`);
        await queryRunner.query(`ALTER TABLE "meta" ADD "enableSentryLogging" boolean NOT NULL DEFAULT false`);
    }
}
