export class AddUpdatedAtColumnToDraft1754964756615 {
    name = 'AddUpdatedAtColumnToDraft1754964756615'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "note_draft" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "note_draft" DROP COLUMN "updatedAt"`);
    }
}
