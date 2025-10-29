<template>
<div v-panel :class="[$style.draft]">
	<div :class="$style.draftBody" class="_gaps_s">
		<MkInfo v-if="scheduled && draft.data.scheduledAt">
			<I18n :src="i18n.ts.scheduledToPostOnX" tag="span">
				<template #x>
					<MkTime :time="draft.data.scheduledAt" :mode="'detail'" style="font-weight: bold;"/>
				</template>
			</I18n>
		</MkInfo>
		<div :class="$style.draftInfo">
			<div v-if="!scheduled && draft.data.scheduledAt">
				<i class="ti ti-calendar-clock"></i>
				{{ i18n.ts._drafts.schedule }}
			</div>
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
		<MkButton v-tooltip="i18n.ts._drafts.delete" danger small :iconOnly="true" :class="$style.itemButton" @click="(ev) => deleteDraft(ev, draft)">
			<i class="ti ti-trash"></i>
		</MkButton>
		<template v-if="scheduled">
			<div :class="$style.expand"></div>
			<MkButton :class="$style.itemButton" small @click="emit('cancelSchedule', draft)">
				<i class="ti ti-calendar-x"></i> {{ i18n.ts._drafts.cancelSchedule }}
			</MkButton>
		</template>
		<template v-else>
			<MkButton v-tooltip="getUploadTooltipText(draft)" small :iconOnly="true" :class="$style.itemButton"
				:disabled="draft.localId === 'default'" @click="() => emit('syncSingleDraft', draft)">
				<i v-if="draft.localId === 'default'" class="ti ti-cloud-x"></i>
				<i v-else-if="draft.serverId == null" class="ti ti-cloud-up"></i>
				<i v-else-if="draft.uploadedAt == null || draft.uploadedAt < draft.updatedAt"
					class="ti ti-cloud-exclamation" :class="$style.outdated"></i>
				<i v-else class="ti ti-cloud-check" :class="$style.uploaded"></i>
			</MkButton>
			<div :class="$style.expand"></div>
			<MkButton :class="$style.itemButton" small @click="() => emit('restoreDraft', draft)">
				<i class="ti ti-corner-up-left"></i>
				{{ i18n.ts._drafts.restore }}
			</MkButton>
		</template>
	</div>
</div>
</template>

<script lang="ts" setup>
import MkButton from '@/components/MkButton.vue';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { $i } from '@/i.js';
import * as drafts from '@/utility/note-drafts.js';
import MkInfo from '@/components/MkInfo.vue';

const props = defineProps<{
	draft: drafts.NoteDraftV2,
	scheduled?: boolean,
}>();

const emit = defineEmits<{
	(event: 'deleteDraft', draft: drafts.NoteDraftV2): void;
	(event: 'deleteDraftFromDevice', draft: drafts.NoteDraftV2): void;
	(event: 'deleteDraftFromServer', draft: drafts.NoteDraftV2): void;
	(event: 'deleteScheduledNote', draft: drafts.NoteDraftV2): void;
	(event: 'cancelSchedule', draft: drafts.NoteDraftV2): void;
	(event: 'restoreDraft', draft: drafts.NoteDraftV2): void;
	(event: 'syncSingleDraft', draft: drafts.NoteDraftV2): void;
}>();

function deleteDraft(ev: MouseEvent, draft: drafts.NoteDraftV2) {
	if (props.scheduled) return emit('deleteScheduledNote', draft);
	if (draft.serverId == null) return emit('deleteDraft', draft);
	deleteMenu(ev, draft);
}

async function deleteMenu(ev: MouseEvent, draft: drafts.NoteDraftV2) {
	os.popupMenu([{
		type: 'button',
		text: i18n.ts._drafts.delete,
		icon: 'ti ti-trash',
		action: async () => {
			// await deleteDraft(draft);
			emit('deleteDraft', draft);
		},
	}, {
		type: 'button',
		text: i18n.ts._drafts.removeFromDevice,
		icon: 'ti ti-device-mobile-x',
		action: () => {
			// deleteDraftFromDevice(draft);
			emit('deleteDraftFromDevice', draft);
		},
	}, {
		type: 'button',
		text: i18n.ts._drafts.removeFromServer,
		icon: 'ti ti-cloud-x',
		action: () => {
			// deleteDraftFromServer(draft);
			emit('deleteDraftFromServer', draft);
		},
	}], (ev.currentTarget ?? ev.target ?? undefined) as HTMLElement | undefined);
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

<style module lang="scss" scoped>
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
