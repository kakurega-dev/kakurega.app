export class DraftScheduledDeleteSupport1754743446962 {
    name = 'DraftScheduledDeleteSupport1754743446962'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "note_draft" ADD "deleteAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "note_draft" ADD "deleteAfter" bigint`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "note_draft" DROP COLUMN "deleteAfter"`);
        await queryRunner.query(`ALTER TABLE "note_draft" DROP COLUMN "deleteAt"`);
    }
}
