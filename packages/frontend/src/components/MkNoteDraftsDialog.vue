<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
	<MkModalWindow ref="dialogEl" :width="600" :height="650" :withOkButton="false" @click="cancel()" @close="cancel()"
		@closed="emit('closed')" @esc="cancel()">
		<template #header>
			{{ i18n.ts.drafts }}
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
		<div class="_spacer">
			<MkResult v-if="draftsList.length <= 0" type="empty" :text="i18n.ts._drafts.noDrafts" />
			<div v-else class="_gaps_s">
				<div v-for="draft in draftsList" :key="draft.localId" v-panel :class="[$style.draft]">
					<div :class="$style.draftBody" class="_gaps_s">
						<div :class="$style.draftInfo">
							<div v-if="draft.data.replyId" class="_nowrap">
								<i class="ti ti-arrow-back-up"></i>
								{{ i18n.ts.reply }}
							</div>
							<div v-else-if="draft.data.renoteId" class="_nowrap">
								<i class="ti ti-quote"></i>
								{{ i18n.ts.renote }}
							</div>
							<div v-if="draft.data.channelId" class="_nowrap">
								<i class="ti ti-device-tv"></i>
								{{ i18n.ts.channel }}
							</div>
						</div>
						<div v-if="draft.data.text" :class="$style.draftContent">
							<Mfm :text="draft.data.text" :plain="true" :author="$i!" />
						</div>
						<div :class="$style.draftFooter">
							<div :class="$style.draftVisibility">
								<span :title="i18n.ts._visibility[draft.data.visibility]">
									<i v-if="draft.data.visibility === 'public'" class="ti ti-world"></i>
									<i v-else-if="draft.data.visibility === 'home'" class="ti ti-home"></i>
									<i v-else-if="draft.data.visibility === 'followers'" class="ti ti-lock"></i>
									<i v-else-if="draft.data.visibility === 'specified'" class="ti ti-mail"></i>
								</span>
								<span v-if="draft.data.localOnly" :title="i18n.ts._visibility['disableFederation']"><i class="ti ti-rocket-off"></i></span>
							</div>
							<div v-if="draft.data.files?.length"><i class="ti ti-photo-plus" :class="$style.icon"></i> {{ draft.data.files.length }}</div>
							<MkTime :time="draft.updatedAt" mode="detail" colored />
						</div>
					</div>
					<div :class="$style.draftActions" class="_buttons">
						<MkButton v-tooltip="i18n.ts._drafts.delete" danger small :iconOnly="true" :class="$style.itemButton"
							@click="(ev) => draft.serverId == null ? deleteDraft(draft) : deleteMenu(ev, draft)">
							<i class="ti ti-trash"></i>
						</MkButton>
						<MkButton v-tooltip="getUploadTooltipText(draft)" small :iconOnly="true" :class="$style.itemButton"
							:disabled="draft.localId === 'default'" @click="() => syncSingleDraft(draft)">
							<i v-if="draft.localId === 'default'" class="ti ti-cloud-x"></i>
							<i v-else-if="draft.serverId == null" class="ti ti-cloud-up"></i>
							<i v-else-if="draft.uploadedAt == null || draft.uploadedAt < draft.updatedAt"
								class="ti ti-cloud-exclamation" :class="$style.outdated"></i>
							<i v-else class="ti ti-cloud-check" :class="$style.uploaded"></i>
						</MkButton>
						<div :class="$style.expand"></div>
						<MkButton :class="$style.itemButton" small @click="() => restoreDraft(draft)">
							<i class="ti ti-corner-up-left"></i>
							{{ i18n.ts._drafts.restore }}
						</MkButton>
					</div>
				</div>
			</div>
		</div>
	</MkModalWindow>
</template>

<script lang="ts" setup>
import { ref, shallowRef } from 'vue';
import * as Misskey from 'misskey-js';
import MkButton from '@/components/MkButton.vue';
import MkModalWindow from '@/components/MkModalWindow.vue';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { $i } from '@/i.js';
import * as drafts from '@/utility/note-drafts.js';
import { misskeyApi } from '@/utility/misskey-api';

const emit = defineEmits<{
	(ev: 'restore', draft: drafts.NoteDraftV2): void;
	(ev: 'cancel'): void;
	(ev: 'closed'): void;
}>();

const draftsList = ref<drafts.NoteDraftV2[]>([]);
const serverSideDraftsCount = ref(0);
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

async function deleteMenu(ev: MouseEvent, draft: drafts.NoteDraftV2) {
	os.popupMenu([{
		type: 'button',
		text: i18n.ts._drafts.delete,
		icon: 'ti ti-trash',
		action: async () => {
			await deleteDraft(draft);
		},
	}, {
		type: 'button',
		text: i18n.ts._drafts.removeFromDevice,
		icon: 'ti ti-device-mobile-x',
		action: () => {
			deleteDraftFromDevice(draft);
		},
	}, {
		type: 'button',
		text: i18n.ts._drafts.removeFromServer,
		icon: 'ti ti-cloud-x',
		action: () => {
			deleteDraftFromServer(draft);
		},
	}], (ev.currentTarget ?? ev.target ?? undefined) as HTMLElement | undefined);
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

function getUploadTooltipText(draft: drafts.NoteDraftV2): string {
	if (draft.localId === 'default') {
		return i18n.ts._drafts.cannotUploadThisDraft;
	}

	if (draft.serverId == null || draft.uploadedAt == null || draft.uploadedAt < draft.updatedAt) {
		return i18n.ts._drafts.uploadToServer;
	} else {
		return i18n.ts._drafts.uploaded;
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
</style>
