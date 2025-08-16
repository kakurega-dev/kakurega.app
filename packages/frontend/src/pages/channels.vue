<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader v-model:tab="tab" :actions="headerActions" :tabs="headerTabs" :swipable="true">
	<div class="_spacer" style="--MI_SPACER-w: 1200px;">
		<div v-if="tab === 'list'" class="_gaps_m">
			<MkFolder :expanded="false">
				<template #label>{{ i18n.ts.narrowDown }}</template>
				<div class="_gaps_m">
					<MkInput v-model="searchQuery" :large="true" type="search">
						<template #label>{{ i18n.ts.channelSearch }}</template>
						<template #prefix><i class="ti ti-search"></i></template>
					</MkInput>
					<MkSelect v-model="sortType">
						<template #label>{{ i18n.ts.sort }}</template>
						<option v-for="x in sortOptions" :key="x.value" :value="x.value">{{ x.displayName }}</option>
					</MkSelect>
					<MkSwitch v-model="includeDescription" :large="true">
						<template #label>{{ i18n.ts.includeDescription }}</template>
					</MkSwitch>
					<MkSwitch v-model="excludeNonActiveChannels" :large="true">
						<template #label>{{ i18n.ts.excludeNonActiveChannels }}</template>
					</MkSwitch>
				</div>
			</MkFolder>
			<MkPagination v-slot="{items}" :paginator="listPaginator">
				<div :class="$style.root">
					<MkChannelPreview v-for="channel in items" :key="channel.id" :channel="channel"/>
				</div>
			</MkPagination>
		</div>
		<div v-if="tab === 'featured'">
			<MkPagination v-slot="{items}" :paginator="featuredPaginator">
				<div :class="$style.root">
					<MkChannelPreview v-for="channel in items" :key="channel.id" :channel="channel"/>
				</div>
			</MkPagination>
		</div>
		<div v-else-if="tab === 'favorites'">
			<MkPagination v-slot="{items}" :paginator="favoritesPaginator">
				<div :class="$style.root">
					<MkChannelPreview v-for="channel in items" :key="channel.id" :channel="channel"/>
				</div>
			</MkPagination>
		</div>
		<div v-else-if="tab === 'following'">
			<MkPagination v-slot="{items}" :paginator="followingPaginator">
				<div :class="$style.root">
					<MkChannelPreview v-for="channel in items" :key="channel.id" :channel="channel"/>
				</div>
			</MkPagination>
		</div>
		<div v-else-if="tab === 'owned'">
			<MkButton class="new" @click="create()"><i class="ti ti-plus"></i></MkButton>
			<MkPagination v-slot="{items}" :paginator="ownedPaginator">
				<div :class="$style.root">
					<MkChannelPreview v-for="channel in items" :key="channel.id" :channel="channel"/>
				</div>
			</MkPagination>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, markRaw, onMounted, ref, shallowRef, type Raw } from 'vue';
import MkChannelPreview from '@/components/MkChannelPreview.vue';
import MkPagination from '@/components/MkPagination.vue';
import MkButton from '@/components/MkButton.vue';
import MkSelect from '@/components/MkSelect.vue';
import MkInput from '@/components/MkInput.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkFolder from '@/components/MkFolder.vue';
import { definePage } from '@/page.js';
import { i18n } from '@/i18n.js';
import { useRouter } from '@/router.js';
import { Paginator } from '@/utility/paginator.js';
import type { entities } from 'misskey-js';

const router = useRouter();

const props = defineProps<{
	query?: string;
	type?: string;
}>();

const tab = ref('featured');
const searchType = ref('')
const sortType = ref('+notesCount');
const searchQuery = ref('');
const excludeNonActiveChannels = ref(false);
const includeDescription = ref(false);

onMounted(() => {
	searchQuery.value = props.query ?? '';
});

const listPaginator = markRaw(new Paginator('channels/list', {
	limit: 10,
	offsetMode: true,
	computedParams: computed(() => ({
		sort: sortType.value as entities.ChannelsListRequest['sort'],
		search: searchQuery.value,
		excludeNonActiveChannels: excludeNonActiveChannels.value,
		includeDescription: includeDescription.value,
	})),
}));
const featuredPaginator = markRaw(new Paginator('channels/featured', {
	limit: 10,
	noPaging: true,
}));
const favoritesPaginator = markRaw(new Paginator('channels/my-favorites', {
	limit: 100,
	noPaging: true,
}));
const followingPaginator = markRaw(new Paginator('channels/followed', {
	limit: 10,
}));
const ownedPaginator = markRaw(new Paginator('channels/owned', {
	limit: 10,
}));

const sortOptions = [
	{ value: '+notesCount', displayName: i18n.ts._sortType.notesCountDesc },
	{ value: '-notesCount', displayName: i18n.ts._sortType.notesCountAsc },
	{ value: '+usersCount', displayName: i18n.ts._sortType.usersCountDesc },
	{ value: '-usersCount', displayName: i18n.ts._sortType.usersCountAsc },
	{ value: '+lastNotedAt', displayName: i18n.ts._sortType.lastNotedAtDesc },
	{ value: '-lastNotedAt', displayName: i18n.ts._sortType.lastNotedAtAsc },
	{ value: '+name', displayName: i18n.ts._sortType.nameDesc },
	{ value: '-name', displayName: i18n.ts._sortType.nameAsc },
];

function create() {
	router.push('/channels/new');
}

const headerActions = computed(() => [{
	icon: 'ti ti-plus',
	text: i18n.ts.create,
	handler: create,
}]);

const headerTabs = computed(() => [{
	key: 'list',
	title: i18n.ts._channel.listAndSearch,
	icon: 'ti ti-search',
}, {
	key: 'featured',
	title: i18n.ts._channel.featured,
	icon: 'ti ti-comet',
}, {
	key: 'favorites',
	title: i18n.ts.favorites,
	icon: 'ti ti-star',
}, {
	key: 'following',
	title: i18n.ts._channel.following,
	icon: 'ti ti-eye',
}, {
	key: 'owned',
	title: i18n.ts._channel.owned,
	icon: 'ti ti-edit',
}]);

definePage(() => ({
	title: i18n.ts.channel,
	icon: 'ti ti-device-tv',
}));
</script>

<style lang="scss" module>
.searchRoot {
	width: 100%;
	max-width: 700px;
	margin: 0 auto;
}

.root {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
	gap: var(--MI-margin);
}</style>
