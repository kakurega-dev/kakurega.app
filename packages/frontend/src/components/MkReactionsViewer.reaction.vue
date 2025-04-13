<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<button
	ref="buttonEl"
	v-ripple="canToggle"
	class="_button"
	:class="[$style.root, { [$style.reacted]: note.myReaction == reaction, [$style.canToggle]: (isLocal && canToggle), [$style.canToggleFallback]: (!isLocal && isAvailable), [$style.small]: prefer.s.reactionsDisplaySize === 'small', [$style.large]: prefer.s.reactionsDisplaySize === 'large' }]"
	@click="toggleReaction()"
	@contextmenu.prevent.stop="menu"
>
	<MkReactionIcon style="pointer-events: none;" :class="prefer.s.limitWidthOfReaction ? $style.limitWidth : ''" :reaction="reaction" :emojiUrl="note.reactionEmojis[reaction.substring(1, reaction.length - 1)]"/>
	<span v-if="!hideReactionCount" :class="$style.count">{{ count }}</span>
</button>
</template>

<script lang="ts" setup>
import { computed, inject, onMounted, useTemplateRef, watch } from 'vue';
import * as Misskey from 'misskey-js';
import { getUnicodeEmoji } from '@@/js/emojilist.js';
import MkCustomEmojiDetailedDialog from './MkCustomEmojiDetailedDialog.vue';
import XDetails from '@/components/MkReactionsViewer.details.vue';
import MkReactionIcon from '@/components/MkReactionIcon.vue';
import * as os from '@/os.js';
import { misskeyApi, misskeyApiGet } from '@/utility/misskey-api.js';
import { useTooltip } from '@/use/use-tooltip.js';
import { $i } from '@/i.js';
import MkReactionEffect from '@/components/MkReactionEffect.vue';
import { claimAchievement } from '@/utility/achievements.js';
import { i18n } from '@/i18n.js';
import * as sound from '@/utility/sound.js';
import { checkReactionPermissions } from '@/utility/check-reaction-permissions.js';
import { customEmojisMap } from '@/custom-emojis.js';
import { prefer } from '@/preferences.js';
import { DI } from '@/di.js';

const props = defineProps<{
	reaction: string;
	count: number;
	isInitial: boolean;
	note: Misskey.entities.Note;
}>();

const mock = inject(DI.mock, false);

const emit = defineEmits<{
	(ev: 'reactionToggled', emoji: string, newCount: number): void;
}>();

const buttonEl = useTemplateRef('buttonEl');

const emojiName = computed(() => props.reaction.replace(/:/g, '').replace(/@\./, ''));
const emoji = computed(() => customEmojisMap.get(emojiName.value) ?? getUnicodeEmoji(props.reaction));

function getReactionName(reaction: string, formated = false) {
	const r = reaction.replaceAll(':', '').replace(/@.*/, '');
	return formated ? `:${r}:` : r;
}

const isLocal = computed(() => !props.reaction.match(/@\w/));
const isAvailable = computed(() => isLocal.value ? true : customEmojisMap.has(getReactionName(props.reaction)));

const canToggle = computed(() => {
	return isAvailable.value && $i && emoji.value && checkReactionPermissions($i, props.note, emoji.value);
});
const canGetInfo = computed(() => !props.reaction.match(/@\w/) && props.reaction.includes(':'));

const plainReaction = computed(() => customEmojisMap.has(emojiName.value) ? getReactionName(props.reaction, true) : props.reaction);

const hideReactionCount = computed(() => {
	switch (prefer.s.hideReactionCount) {
		case 'none': return false;
		case 'all': return true;
		case 'self': return props.note.userId === $i?.id;
		case 'others': return props.note.userId !== $i?.id;
		default: return false;
	}
});

async function toggleReaction() {
	if (!canToggle.value) return;

	const reaction = getReactionName(props.reaction, true);
	const oldReaction = props.note.myReaction ? getReactionName(props.note.myReaction, true) : null;
	if (oldReaction) {
		const confirm = await os.confirm({
			type: 'warning',
			text: oldReaction !== reaction ? i18n.ts.changeReactionConfirm : i18n.ts.cancelReactionConfirm,
		});
		if (confirm.canceled) return;

		if (oldReaction !== reaction) {
			sound.playMisskeySfx('reaction');
		}

		if (mock) {
			emit('reactionToggled', reaction, (props.count - 1));
			return;
		}

		misskeyApi('notes/reactions/delete', {
			noteId: props.note.id,
		}).then(() => {
			if (oldReaction !== reaction) {
				misskeyApi('notes/reactions/create', {
					noteId: props.note.id,
					reaction: reaction,
				});
			}
		});
	} else {
		if (prefer.s.confirmOnReact) {
			const confirm = await os.confirm({
				type: 'question',
				text: i18n.tsx.reactAreYouSure({ emoji: props.reaction.replace('@.', '') }),
			});

			if (confirm.canceled) return;
		}

		sound.playMisskeySfx('reaction');

		if (mock) {
			emit('reactionToggled', reaction, (props.count + 1));
			return;
		}

		misskeyApi('notes/reactions/create', {
			noteId: props.note.id,
			reaction: reaction,
		});

		if (props.note.text && props.note.text.length > 100 && (Date.now() - new Date(props.note.createdAt).getTime() < 1000 * 3)) {
			claimAchievement('reactWithoutRead');
		}
	}
}

async function menu(ev) {
	const reactionEmojiPalette = prefer.s.emojiPaletteForReaction == null ? prefer.s.emojiPalettes[0] : prefer.s.emojiPalettes.find(palette => palette.id === prefer.s.emojiPaletteForReaction);
	os.popupMenu([...(canGetInfo.value ? [{
		text: i18n.ts.info,
		icon: 'ti ti-info-circle',
		action: async () => {
			const { dispose } = os.popup(MkCustomEmojiDetailedDialog, {
				emoji: await misskeyApiGet('emoji', {
					name: props.reaction.replace(/:/g, '').replace(/@\./, ''),
				}),
			}, {
				closed: () => dispose(),
			});
		},
	}] : []), ...(isAvailable.value && reactionEmojiPalette != null && !reactionEmojiPalette.emojis.includes(plainReaction.value) ? [{
		text: i18n.ts.addToEmojiPicker,
		icon: 'ti ti-plus',
		action: async () => {
			prefer.commit('emojiPalettes', prefer.s.emojiPalettes.map(palette => {
				if (palette.id !== reactionEmojiPalette.id) return palette;
				return {
					...palette,
					emojis: [...palette.emojis, plainReaction.value],
				};
			}));
		},
	}] : [])], ev.currentTarget ?? ev.target);
}

function anime() {
	if (window.document.hidden || !prefer.s.animation || buttonEl.value == null) return;

	const rect = buttonEl.value.getBoundingClientRect();
	const x = rect.left + 16;
	const y = rect.top + (buttonEl.value.offsetHeight / 2);
	const { dispose } = os.popup(MkReactionEffect, { reaction: props.reaction, x, y }, {
		end: () => dispose(),
	});
}

watch(() => props.count, (newCount, oldCount) => {
	if (oldCount < newCount) anime();
});

onMounted(() => {
	if (!props.isInitial) anime();
});

if (!mock) {
	useTooltip(buttonEl, async (showing) => {
		const reactions = !prefer.s.hideReactionUsers ? await misskeyApiGet('notes/reactions', {
			noteId: props.note.id,
			type: props.reaction,
			limit: 10,
			_cacheKey_: props.count,
		}) : [];

		const users = reactions.map(x => x.user);

		const { dispose } = os.popup(XDetails, {
			showing,
			reaction: props.reaction,
			users,
			count: props.count,
			targetElement: buttonEl.value,
		}, {
			closed: () => dispose(),
		});
	}, 100);
}
</script>

<style lang="scss" module>
.root {
	display: inline-flex;
	height: 42px;
	margin: 2px;
	padding: 0 6px;
	font-size: 1.5em;
	border-radius: 6px;
	align-items: center;
	justify-content: center;

	&.canToggle {
		background: var(--MI_THEME-buttonBg);

		&:hover {
			background: rgba(0, 0, 0, 0.1);
		}
	}

	&.canToggleFallback:not(.canToggle):not(.reacted) {
		box-sizing: border-box;
		border: 2px dashed var(--MI_THEME-switchBg);

		&.small {
			border-width: 1px;
			border-color: var(--MI_THEME-buttonBgSub);
		}

		&:hover {
			background: rgba(0, 0, 0, 0.1);
		}
	}

	&:not(.canToggle):not(.canToggleFallback) {
		cursor: default;
	}

	&.small {
		height: 32px;
		font-size: 1em;
		border-radius: 4px;

		> .count {
			font-size: 0.9em;
			line-height: 32px;
		}
	}

	&.large {
		height: 52px;
		font-size: 2em;
		border-radius: 8px;

		> .count {
			font-size: 0.6em;
			line-height: 52px;
		}
	}

	&.reacted, &.reacted:hover {
		background: var(--MI_THEME-accentedBg);
		color: var(--MI_THEME-accent);
		box-shadow: 0 0 0 1px var(--MI_THEME-accent) inset;

		> .count {
			color: var(--MI_THEME-accent);
		}

		> .icon {
			filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
		}
	}
}

.limitWidth {
	max-width: 70px;
	object-fit: contain;
}

.count {
	font-size: 0.7em;
	line-height: 42px;
	margin: 0 0 0 4px;
}
</style>
