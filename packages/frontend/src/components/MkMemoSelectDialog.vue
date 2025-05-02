<!--
SPDX-FileCopyrightText: syuilo and other misskey contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkModalWindow ref="dialog" :width="400" :height="450" :withOkButton="false" :okButtonDisabled="true" @close="dialog?.close()">
	<template #header>{{ i18n.ts.memo }}</template>
	<div class="_spacer" style="--MI_SPACER-min: 20px; --MI_SPACER-max: 28px;">
		<div class="_gaps">
			<MkFolder v-for="(value, key) of memoList" :key="key">
				<template #label>{{ value }}</template>
				<div :class="$style.text">{{ value }}</div>
				<div :class="$style.buttons">
					<MkButton danger small :class="$style.button" @click="deleteMemo(key)"><i class="ti ti-trash"></i></MkButton>
					<MkButton small :disabled="key === props.widgetId" :class="$style.button" @click="selectMemo(key)">{{ key === props.widgetId ? i18n.ts.selected : i18n.ts.select }}</MkButton>
				</div>
			</MkFolder>
		</div>
	</div>
</MkModalWindow>
</template>

<script lang="ts" setup>
import { ref, shallowRef } from 'vue';
import { v4 as uuid } from 'uuid';
import MkModalWindow from '@/components/MkModalWindow.vue';
import MkButton from '@/components/MkButton.vue';
import MkFolder from '@/components/MkFolder.vue';
import { i18n } from '@/i18n.js';
import { store } from '@/store.js';
import * as os from '@/os.js';

const memoList = ref<Record<string, string>>({});

const getMemoList = () => {
	const memo = store.s.memo;
	if (!memo) return {};
	if (typeof memo === 'string') return { 'default': memo };
	return memo;
};

memoList.value = getMemoList();

const props = defineProps<{
	widgetId: string;
}>();

const dialog = shallowRef<InstanceType<typeof MkModalWindow>>();

const selectMemo = (key: string) => {
	memoList.value[uuid()] = memoList.value[props.widgetId];
	memoList.value[props.widgetId] = memoList.value[key];
	delete memoList.value[key];
	store.set('memo', memoList.value);
	dialog.value?.close();
};

const deleteMemo = async (key: string) => {
	const confirm = await os.confirm({
		type: 'warning',
		text: i18n.ts.deleteConfirm,
	});
	if (confirm.canceled) return;

	delete memoList.value[key];
	store.set('memo', memoList.value);
};

</script>

<style lang="scss" module>
.buttons {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
}

.button {
	min-width: auto;
	flex-shrink: 0;
}

.text {
	word-break: break-all;
	margin-bottom: 8px;
	white-space: pre-line;
}
</style>
