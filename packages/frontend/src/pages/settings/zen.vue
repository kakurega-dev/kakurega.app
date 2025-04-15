<template>
<div class="_gaps_m">
	<SearchMarker :keywords="['zen']">
		<MkPreferenceContainer k="zenMode.showWidgets">
			<MkSwitch v-model="showWidgets">{{ i18n.ts.showWidgets }}</MkSwitch>
		</MkPreferenceContainer>
	</SearchMarker>
</div>
</template>

<script lang="ts" setup>
import MkSwitch from '@/components/MkSwitch.vue';
import MkPreferenceContainer from '@/components/MkPreferenceContainer.vue';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import { prefer } from '@/preferences.js';

const showWidgets = prefer.model('zenMode.showWidgets');

definePage({
	title: i18n.ts.zenMode,
	icon: 'ti ti-seeding',
});
</script>
