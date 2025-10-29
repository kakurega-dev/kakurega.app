<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
	<MkModalWindow ref="dialogEl" :width="600" :height="650" :withOkButton="false" @click="cancel()" @close="cancel()"
		@closed="emit('closed')" @esc="cancel()">
		<template #header>
			{{ i18n.ts.draftsAndScheduledNotes }}
		</template>
		<template #footer>
			<div>
				{{ i18n.ts._drafts.uploadRemainingCount }}: {{ serverSideDraftsCount }}/{{ $i?.policies.noteDraftLimit }}
			</div>
			<div :class="$style.controller">
				<MkButton :class="$style.noShrink" @click="syncDrafts" primary>
					<i class="ti ti-refresh"></i>
					{{ i18n.ts._drafts.sync }}
				</MkButton>
				<MkButton :class="$style.noShrink" @click="uploadAllDrafts" :disabled="draftsList.filter(d => d.serverId == null && d.localId !== 'default').length <= 0">
					<i class="ti ti-cloud-upload"></i>
					{{ i18n.ts._drafts.uploadAllDrafts }}
				</MkButton>
			</div>
		</template>

		<MkStickyContainer>
			<template #header>
				<MkTabs
					v-model:tab="tab"
					centered
					:class="$style.tabs"
					:tabs="[
						{
							key: 'drafts',
							title: i18n.ts.drafts,
							icon: 'ti ti-list',
						},
						{
							key: 'scheduled',
							title: i18n.ts.scheduled,
							icon: 'ti ti-calendar-clock',
						},
					]"
				/>
			</template>

			<div class="_spacer">
				<div v-if="tab === 'drafts'">
					<MkResult v-if="draftsList.length <= 0" type="empty" :text="i18n.ts._drafts.noDrafts" />
					<div v-else class="_gaps_s">
						<template v-for="draft in draftsList" :key="draft.localId">
							<XDraft
								v-if="draft.localId !== 'default' || draft.data.text || draft.data.files?.length"
								:draft="draft"
								@deleteDraft="deleteDraft"
								@deleteDraftFromDevice="deleteDraftFromDevice"
								@deleteDraftFromServer="deleteDraftFromServer"
								@restoreDraft="restoreDraft"
								@syncSingleDraft="syncSingleDraft"
							/>
						</template>
					</div>
				</div>

				<!-- Scheduled -->
				<MkPagination v-else-if="tab === 'scheduled'" :key="tab" :paginator="scheduledPaginator" withControl>
					<template #empty>
						<MkResult type="empty" :text="i18n.ts._drafts.noDrafts"/>
					</template>

					<template #default="{ items }">
						<div class="_gaps_s">
							<XDraft
								v-for="draft in (items as unknown as Misskey.entities.NoteDraft[])"
								:key="draft.id"
								:draft="drafts.serverDraftToLocalDraft(draft)"
								scheduled
								@deleteScheduledNote="deleteScheduledNote"
								@cancelSchedule="cancelSchedule"
							/>
						</div>
					</template>
				</MkPagination>
			</div>
		</MkStickyContainer>
	</MkModalWindow>
</template>

<script lang="ts" setup>
import { markRaw, ref, shallowRef } from 'vue';
import * as Misskey from 'misskey-js';
import MkButton from '@/components/MkButton.vue';
import MkModalWindow from '@/components/MkModalWindow.vue';
import MkPagination from '@/components/MkPagination.vue';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { $i } from '@/i.js';
import * as drafts from '@/utility/note-drafts.js';
import { misskeyApi } from '@/utility/misskey-api';
import { Paginator } from '@/utility/paginator.js';
import MkTabs from '@/components/MkTabs.vue';
import XDraft from '@/components/MkNoteDraftsDialog.Draft.vue';

const props = defineProps<{
	scheduled?: boolean;
}>();

const emit = defineEmits<{
	(ev: 'restore', draft: drafts.NoteDraftV2): void;
	(ev: 'cancel'): void;
	(ev: 'closed'): void;
}>();

const draftsList = ref<drafts.NoteDraftV2[]>([]);
const serverSideDraftsCount = ref(0);

const tab = ref<'drafts' | 'scheduled'>(props.scheduled ? 'scheduled' : 'drafts');

const scheduledPaginator = markRaw(new Paginator('notes/drafts/list', {
	limit: 10,
	params: {
		scheduled: true,
	},
}));

const currentDraftsCount = ref(0);
misskeyApi('notes/drafts/count').then((count) => {
	currentDraftsCount.value = count;
});

const dialogEl = shallowRef<InstanceType<typeof MkModalWindow>>();

function cancel() {
	emit('cancel');
	dialogEl.value?.close();
}

function refreshDrafts() {
	drafts.getAll($i!.id).then(x => {
		draftsList.value = x;
	});

	misskeyApi('notes/drafts/count').then((count) => {
		serverSideDraftsCount.value = count;
	});
}

refreshDrafts();

function restoreDraft(draft: drafts.NoteDraftV2) {
	emit('restore', draft);
	dialogEl.value?.close();
}

async function deleteDraft(draft: drafts.NoteDraftV2) {
	const { canceled } = await os.confirm({
		type: 'warning',
		text: i18n.ts._drafts.deleteAreYouSure,
	});

	if (canceled) return;
	await drafts.remove($i!.id, draft);
	refreshDrafts();
}

async function deleteDraftFromDevice(draft: drafts.NoteDraftV2) {
	const { canceled } = await os.confirm({
		type: 'warning',
		text: i18n.ts._drafts.removeFromDeviceQuestion,
	});

	if (canceled) return;
	await drafts.remove($i!.id, draft, 'local');
	refreshDrafts();
}

async function deleteDraftFromServer(draft: drafts.NoteDraftV2) {
	const { canceled } = await os.confirm({
		type: 'warning',
		text: i18n.ts._drafts.removeFromServerQuestion,
	});

	if (canceled) return;
	await drafts.remove($i!.id, draft, 'server');
	refreshDrafts();
}

async function deleteScheduledNote(draft: drafts.NoteDraftV2) {
	const { canceled } = await os.confirm({
		type: 'warning',
		text: i18n.ts._drafts.deleteScheduledNoteAreYouSure,
	});

	if (canceled) return;
	await drafts.remove($i!.id, draft, 'scheduled');
	scheduledPaginator.reload();
	refreshDrafts();
}

async function cancelSchedule(draft: drafts.NoteDraftV2) {
	if (draft.serverId == null) {
		throw new Error('Cannot cancel schedule for draft that is not uploaded to server.');
	}

	const result = await os.apiWithDialog('notes/drafts/update', {
		draftId: draft.serverId,
		isActuallyScheduled: false,
		scheduledAt: null,
	}).then(x => x.updatedDraft).catch(() => null);
	if (result == null) return;

	scheduledPaginator.reload();

	const newDraft = drafts.serverDraftToLocalDraft(result);
	await drafts.set($i!.id, newDraft);
	refreshDrafts();
}

async function syncDrafts() {
	const { canceled } = await os.confirm({
		type: 'question',
		title: i18n.ts._drafts.syncQuestion,
		text: i18n.ts._drafts.syncQuestionDescription,
	});

	if (canceled) return;
	await drafts.sync($i!.id);
	refreshDrafts();
}

async function uploadAllDrafts() {
	const { canceled } = await os.confirm({
		type: 'question',
		title: i18n.ts._drafts.uploadAllDraftsQuestion,
		text: i18n.tsx._drafts.uploadAllDraftsDescription({ count: draftsList.value.filter(d => d.serverId == null && d.localId !== 'default').length.toString() }),
	});

	if (canceled) return;

	await drafts.uploadAllDrafts($i!.id, $i!.policies.noteDraftLimit);
	refreshDrafts();
}

async function syncSingleDraft(draft: drafts.NoteDraftV2) {
	if (draft.localId === 'default') {
		os.alert({
			type: 'error',
			text: i18n.ts._drafts.cannotUploadThisDraft,
		});
		return;
	}

	if (draft.serverId == null) {
		await drafts.uploadToServer($i!.id, draft);
	} else if (draft.uploadedAt == null || draft.uploadedAt < draft.updatedAt) {
		await drafts.updateServerDraft($i!.id, draft);
	} else {
		os.alert({
			type: 'info',
			text: i18n.ts._drafts.latestDraftUploaded,
		});
	}
}
</script>

<style lang="scss" module>
.draft {
	padding: 16px;
	gap: 16px;
	border-radius: 10px;
}

.draftBody {
	width: 100%;
	min-width: 0;
}

.draftInfo {
	display: flex;
	width: 100%;
	font-size: 0.85em;
	opacity: 0.7;
}

.draftContent {
	display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
	line-clamp: 2;
  overflow: hidden;
	font-size: 0.9em;
}

.draftFooter {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 85%;
	opacity: 0.7;
}

.draftVisibility {
	flex-shrink: 0;
}

.draftActions {
	display: flex;
	flex-direction: row;
	gap: 8px;
	margin-top: 16px;
}

.expand {
	flex-grow: 1;
}

.controller {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	gap: 16px;
	margin-top: var(--MI-marginHalf);
}

.noShrink {
	flex-shrink: 0;
}

.uploaded {
	color: var(--MI_THEME-success);
}

.outdated {
	color: var(--MI_THEME-warn);
}

.tabs {
	background: color(from var(--MI_THEME-bg) srgb r g b / 0.75);
	-webkit-backdrop-filter: var(--MI-blur, blur(15px));
	backdrop-filter: var(--MI-blur, blur(15px));
	border-bottom: solid 0.5px var(--MI_THEME-divider);
}
</style>
