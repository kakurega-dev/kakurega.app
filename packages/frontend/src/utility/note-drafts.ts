import { isReactive, toRaw } from 'vue';
import * as Misskey from 'misskey-js';
import type { PollEditorModelValue } from '@/components/MkPollEditor.vue';
import type { DeleteScheduleEditorModelValue } from '@/components/MkDeleteScheduleEditor.vue';
import * as os from '@/os.js';
import { miLocalStorage } from '@/local-storage.js';
import { get as idbGet, set as idbSet, del as idbDel } from '@/utility/idb-proxy.js';
import { genId } from '@/utility/id.js';

/**
 * Deprecated. Please use `NoteDraftV2` instead.
 * @deprecated
 */
export type NoteDraftV1 = {
	updatedAt: Date;
	type: keyof NoteKeys;
	uniqueId: string;
	auxId: string | null;
	data: {
		text: string;
		useCw: boolean;
		cw: string | null;
		visibility: (typeof Misskey.noteVisibilities)[number];
		localOnly: boolean;
		files: Misskey.entities.DriveFile[];
		poll: PollEditorModelValue | null;
		scheduledNoteDelete: DeleteScheduleEditorModelValue | null;
		visibleUserIds?: string[];
	};
};

export type NoteDraftV2 = {
	updatedAt: Date;
	uploadedAt?: Date;
	localId: string;
	serverId: string | null;
	data: {
		text?: string | null;
		cw?: string | null;
		visibility: (typeof Misskey.noteVisibilities)[number];
		visibleUserIds?: string[];
		hashtag?: string | null;
		localOnly?: boolean;
		reactionAcceptance?: Misskey.entities.Note['reactionAcceptance'] | null;
		replyId?: string | null;
		renoteId?: string | null;
		channelId?: string | null;
		scheduledDelete?: Omit<DeleteScheduleEditorModelValue, 'isValid'> | null;
		files?: Misskey.entities.DriveFile[];
		poll?: PollEditorModelValue | null;
		scheduledAt?: number | null;
	};
}

/**
 * @deprecated
*/
type NoteKeys = {
	note: () => unknown,
	reply: (replyId: string) => unknown,
	quote: (renoteId: string) => unknown,
	channel: (channelId: string) => unknown,
};

export async function migrate(userId: string) {
	await migrateV1(userId);
	await migrateV2(userId);
}

async function migrateV1(userId: string) {
	const raw = miLocalStorage.getItem('drafts');
	if (!raw) return;

	const drafts = JSON.parse(raw) as Record<string, NoteDraftV1>;
	const keys = Object.keys(drafts);
	const newDrafts: Record<string, NoteDraftV1> = {};

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		const [type, id] = key.split(':');
		if (type === 'note' && id !== userId) continue;
		const keyType = type === 'renote' ? 'quote' : type as keyof NoteKeys;
		const keyId = type === 'note' ? null : id;
		const uniqueId = Date.now().toString() + i.toString();
		const newKey = getKey(keyType, uniqueId, keyId as string);
		newDrafts[newKey] = {
			...drafts[key],
			uniqueId,
			type: keyType,
			auxId: keyId,
		};
		delete drafts[key];
	}

	if (Object.keys(newDrafts).length === 0) return;
	await idbSet(`drafts::${userId}`, newDrafts);
	miLocalStorage.setItem('drafts', JSON.stringify(drafts));
}

async function migrateV2(userId: string) {
	const oldDrafts = await idbGet(`drafts::${userId}`) as Record<string, NoteDraftV1>;
	if (!oldDrafts) return;

	const newDrafts: Array<NoteDraftV2> = [];
	for (const key in oldDrafts) {
		const draft = oldDrafts[key];
		const newDraft = {
			updatedAt: draft.updatedAt,
			localId: draft.uniqueId,
			serverId: null,
			data: {
				text: draft.data.text,
				cw: draft.data.useCw ? draft.data.cw : undefined,
				visibility: draft.data.visibility,
				visibleUserIds: draft.data.visibleUserIds,
				hashtag: undefined,
				localOnly: draft.data.localOnly,
				reactionAcceptance: undefined,
				replyId: draft.type === 'reply' ? draft.auxId : undefined,
				renoteId: draft.type === 'quote' ? draft.auxId : undefined,
				channelId: draft.type === 'channel' ? draft.auxId : undefined,
				scheduledDelete: draft.data.scheduledNoteDelete ? {
					deleteAt: draft.data.scheduledNoteDelete.deleteAt,
					deleteAfter: draft.data.scheduledNoteDelete.deleteAfter,
				} : undefined,
				files: draft.data.files.length > 0 ? draft.data.files : undefined,
				poll: draft.data.poll,
			},
		} satisfies NoteDraftV2;

		newDrafts.push(newDraft);
	}

	await idbSet(`draftsV2::${userId}`, newDrafts);
	await idbDel(`drafts::${userId}`);
}

/**
 * @deprecated
 */
function getKey<T extends keyof NoteKeys>(type: T, uniqueId: string, ...args: Parameters<NoteKeys[T]>) {
	let key = `${type}:${uniqueId}`;
	for (const arg of args) {
		if (arg != null) key += `:${arg}`;
	}
	return key;
}

export async function getAll(userId: string) {
	const drafts = await idbGet(`draftsV2::${userId}`);
	return (drafts ?? []) as NoteDraftV2[];
}

export async function get(userId: string, localDraftId: string, query?: {
	replyId?: string,
	renoteId?: string,
	channelId?: string
}) {
	const drafts = await getAll(userId);
	return drafts.find(draft => {
		if (draft.localId !== localDraftId) return false;
		if (draft.data.replyId !== query?.replyId) return false;
		if (draft.data.renoteId !== query?.renoteId) return false;
		if (draft.data.channelId !== query?.channelId) return false;
		return true;
	}) ?? null;
}

export async function set(userId: string, draft: NoteDraftV2) {
	const drafts = await getAll(userId);
	const existingDraft = drafts.find(d => {
		return d.localId === draft.localId &&
			d.data.replyId === draft.data.replyId &&
			d.data.renoteId === draft.data.renoteId &&
			d.data.channelId === draft.data.channelId;
	});

	if (existingDraft) {
		Object.assign(existingDraft, draft, {
			localId: existingDraft.localId,
			serverId: draft.serverId || existingDraft.serverId,
		});
	} else {
		drafts.push(draft);
	}

	await idbSet(`draftsV2::${userId}`, toDeepRaw(drafts));
	return draft;
}

export async function remove(
	userId: string,
	draft: NoteDraftV2 | {
		localId: string,
		replyId?: string,
		renoteId?: string,
		channelId?: string,
	},
	deleteFrom: 'server' | 'local' | 'scheduled' | 'both' = 'both'
) {
	if (deleteFrom === 'scheduled') {
		if ('serverId' in draft && draft.serverId) {
			await os.apiWithDialog('notes/drafts/delete', {
				draftId: draft.serverId,
			});
		} else {
			throw new Error('Cannot delete scheduled draft that is not uploaded to server.');
		}

		return;
	}

	let drafts = await getAll(userId);

	if (deleteFrom === 'server') {
		const target = drafts.find(d => d.localId === draft.localId);
		if (target && target.serverId) {
			await os.apiWithDialog('notes/drafts/delete', {
				draftId: target.serverId,
			});
			target.serverId = null;
			target.uploadedAt = undefined;
		}
	} else {
		let replyId = 'replyId' in draft ? draft.replyId : 'data' in draft ? draft.data.replyId : undefined;
		let renoteId = 'renoteId' in draft ? draft.renoteId : 'data' in draft ? draft.data.renoteId : undefined;
		let channelId = 'channelId' in draft ? draft.channelId : 'data' in draft ? draft.data.channelId : undefined;

		const newDrafts: NoteDraftV2[] = [];
		for (const x of drafts) {
				if (
					x.localId !== draft.localId ||
					x.data.replyId !== replyId ||
					x.data.renoteId !== renoteId ||
					x.data.channelId !== channelId
				) {
					newDrafts.push(x);
					continue;
				};

				if (x.serverId && deleteFrom !== 'local') {
					// remove from server
					await os.apiWithDialog('notes/drafts/delete', {
						draftId: x.serverId,
					});
				}
		}

		drafts = newDrafts;
	}

	await idbSet(`draftsV2::${userId}`, drafts);
}

export async function sync(userId: string) {
	// Step 1: Get all drafts from server
	const serverDrafts: Misskey.entities.NoteDraft[] = [];
	while (true) {
		const response = await os.apiWithDialog('notes/drafts/list', {
			detail: false,
			untilId: serverDrafts.at(-1)?.id ?? undefined,
			scheduled: false,
		})

		if (response.length === 0) break;
		serverDrafts.push(...response);

		await new Promise(resolve => setTimeout(resolve, 250));
	}

	// Step 2: Remove drafts that are not in the server (only if the draft has a serverSideId)
	const localDrafts = await getAll(userId);
	for (const localDraft of localDrafts) {
		if (localDraft.serverId) {
			const existsOnServer = serverDrafts.some(serverDraft => serverDraft.id === localDraft.serverId);
			if (!existsOnServer) {
				await remove(userId, localDraft, 'local');
			}
		}
	}

	// Step 3: Add or overwrite local drafts from server
	// Step 4: Update server drafts if local draft is newer
	for (const serverDraft of serverDrafts) {
		// skip scheduled drafts
		if (serverDraft.isActuallyScheduled) continue;

		const localDraft = localDrafts.find(d => d.serverId === serverDraft.id);
		if (localDraft && localDraft.updatedAt > new Date(serverDraft.updatedAt)) {
			// update server-side draft
			await updateServerDraft(userId, localDraft);
			await new Promise(resolve => setTimeout(resolve, 250));
			continue;
		}

		const newDraft = serverDraftToLocalDraft(serverDraft, localDraft?.localId);
		await set(userId, newDraft);
	}
}

export async function createScheduledNote(userId: string, draft: NoteDraftV2) {
	if (!draft.data.scheduledAt) return;

	const result = await os.apiWithDialog('notes/drafts/create', {
		...draft.data,
		fileIds: draft.data.files && draft.data.files.length > 0 ? draft.data.files.map(file => file.id) : undefined,
		isActuallyScheduled: true,
	}).then(x => x.createdDraft).catch(() => null);

	if (!result) return false;

	remove(userId, draft);
	return true;
}

export async function uploadAllDrafts(userId: string, noteDraftLimit: number) {
	const drafts = await getAll(userId);
	const draftsToUpload = drafts.filter(draft => draft.serverId == null && draft.localId !== 'default');
	let uploadableDraftsCount = noteDraftLimit - await os.apiWithDialog('notes/drafts/count', {});

	draftsToUpload.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

	for (const draft of draftsToUpload) {
		if (uploadableDraftsCount <= 0) break;
		const result = await uploadToServer(userId, draft);
		if (result) uploadableDraftsCount--;
	}
}

export async function uploadToServer(userId: string, draft: NoteDraftV2) {
	if (draft.serverId || draft.localId === "default") return false;

	const { createdDraft } = await os.apiWithDialog('notes/drafts/create', {
		...draft.data,
		fileIds: draft.data.files && draft.data.files.length > 0 ? draft.data.files.map(file => file.id) : undefined,
	})

	draft.serverId = createdDraft.id;
	draft.updatedAt = new Date(createdDraft.updatedAt);
	draft.uploadedAt = new Date(createdDraft.updatedAt);
	await set(userId, draft);

	return true;
}

export async function updateServerDraft(userId: string, draft: NoteDraftV2) {
	if (!draft.serverId) return;

	const { updatedDraft } = await os.apiWithDialog('notes/drafts/update', {
		draftId: draft.serverId!,
		...draft.data,
		fileIds: draft.data.files && draft.data.files.length > 0 ? draft.data.files.map(file => file.id) : undefined,
	});

	draft.updatedAt = new Date(updatedDraft.updatedAt);
	draft.uploadedAt = new Date(updatedDraft.updatedAt);
	await set(userId, draft);
}

export function serverDraftToLocalDraft(draft: Misskey.entities.NoteDraft, localDraftId?: string): NoteDraftV2 {
	return {
		updatedAt: new Date(draft.updatedAt),
		uploadedAt: new Date(draft.updatedAt),
		localId: localDraftId ?? genId(),
		serverId: draft.id,
		data: {
			visibility: draft.visibility,
			visibleUserIds: draft.visibleUserIds,
			cw: draft.cw ?? undefined,
			hashtag: draft.hashtag ?? undefined,
			localOnly: draft.localOnly ?? undefined,
			reactionAcceptance: draft.reactionAcceptance ?? null,
			replyId: draft.replyId ?? undefined,
			renoteId: draft.renoteId ?? undefined,
			channelId: draft.channelId ?? undefined,
			scheduledDelete: draft.scheduledDelete ? {
				deleteAt: draft.scheduledDelete.deleteAt ? new Date(draft.scheduledDelete.deleteAt).getTime() : null,
				deleteAfter: draft.scheduledDelete.deleteAfter ?? null,
			} : null,
			text: draft.text ?? undefined,
			files: draft.files,
			poll: draft.poll ? {
				expiresAt: draft.poll.expiresAt ? new Date(draft.poll.expiresAt).getTime() : null,
				expiredAfter: draft.poll.expiredAfter ?? null,
				choices: draft.poll.choices,
				multiple: draft.poll.multiple ?? false,
			} : null,
			scheduledAt: draft.scheduledAt ?? null,
		},
	};
}

function isObject(value: unknown): boolean {
	return value !== null && !Array.isArray(value) && typeof value === 'object'
}

function getRawData<T>(data: T): T {
	return isReactive(data) ? toRaw(data) : data
}

function toDeepRaw<T>(data: T): T {
	const rawData = getRawData<T>(data)

	for (const key in rawData) {
		const value = rawData[key]

		if (!isObject(value) && !Array.isArray(value)) {
			continue
		}

		rawData[key] = toDeepRaw<typeof value>(value)
	}

	return rawData
}
