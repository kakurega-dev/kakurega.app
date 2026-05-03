<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_panel _shadow" :class="$style.root">
	<div :class="$style.main">
		<div :class="$style.title">✨ {{ i18n.ts.misskeyUpdated }}</div>
		<div v-if="isBeta" :class="$style.beta">{{ i18n.ts.thankYouForTestingBeta }}</div>
		<div :class="$style.text">
			Misskey: {{ misskeyVersion }}
			<br>
			隠れ家: {{ kakuregaVersion }}
		</div>
		<div class="_buttons">
			<MkButton full @click="whatIsNew">{{ i18n.ts.whatIsNew }}</MkButton>
			<MkButton full @click="whatIsNewKakurega">{{ i18n.ts.whatIsNewKakurega }}</MkButton>
			<MkButton full primary @click="closePanel">{{ i18n.ts.gotIt }}</MkButton>
		</div>
	</div>
	<button class="_button" :class="$style.close" @click="closePanel"><i class="ti ti-x"></i></button>
</div>
</template>

<script lang="ts" setup>
import { version } from '@@/js/config.js';
import MkButton from '@/components/MkButton.vue';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';

const emit = defineEmits<{
	(ev: 'closed'): void;
}>();

const isBeta = version.includes('-beta') || version.includes('-alpha') || version.includes('-rc');
const zIndex = os.claimZIndex('low');

const misskeyVersion = version.split('-')[0];
const kakuregaVersion = version.split('-')[1].replace('kakurega.', '');

function closePanel() {
	emit('closed');
}

function whatIsNew() {
		if (isBeta) {
		window.open(`https://github.com/misskey-dev/misskey/releases/tag/${misskeyVersion}`, '_blank');
	} else {
		window.open(`https://misskey-hub.net/docs/releases/#_${misskeyVersion.replaceAll('.', '')}`, '_blank');
	}
}

function whatIsNewKakurega() {
	window.open(`https://docs.kakurega.app/references/changelog#${kakuregaVersion.replaceAll('.', '-')}`, '_blank');
}
</script>

<style lang="scss" module>
.root {
	position: fixed;
	z-index: v-bind(zIndex);
	bottom: var(--MI-margin);
	left: 0;
	right: 0;
	margin: auto;
	box-sizing: border-box;
	width: calc(100% - (var(--MI-margin) * 2));
	max-width: 500px;
	display: flex;
}

.main {
	padding: 25px;
	flex: 1;
}

.close {
	position: absolute;
	top: 8px;
	right: 8px;
	padding: 8px;
}

.title {
	font-weight: bold;
}

.text {
	margin: 0.7em 0 1em 0;
}

.beta {
	margin: 1em 0;
}
</style>
