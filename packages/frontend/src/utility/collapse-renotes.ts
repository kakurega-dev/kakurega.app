import { prefer } from '@/preferences.js';

const seenNotes: string[] = [];

export function checkCollapseRenote(appearNote: Record<string, any> | null, note: Record<string, any>, me: Record<string, any> | null | undefined): boolean {
	if (!prefer.s.collapseRenotes) return false;
	if (appearNote == null) return false;

	if (prefer.s.collapseSelfRenotes) {
		if (note.userId === appearNote.userId) return true;
	}

	switch (prefer.s.collapseRenotesTrigger) {
		case 'action': {
			return (me && (me.id === note.userId || me.id === appearNote.userId)) || (appearNote.myReaction != null);
		}

		case 'all': {
			return true;
		}

		case 'see': {
			const isSeen = seenNotes.includes(note.id);
			if (isSeen) return true;

			seenNotes.push(note.id);
			return false;
		}

		default: {
			return false;
		}
	}
}
