<template>
<MkStickyContainer>
	<template #header>
		<MkPageHeader :actions="headerActions" :tabs="headerTabs"/>
	</template>
	<MkSpacer :contentMax="700" :marginMin="16" :marginMax="32">
		<FormSuspense :p="init">
			<div class="_gaps_m">
				<MkFolder>
					<template #icon><i class="ti ti-brand-patreon"></i></template>
					<template #label>Patreon</template>
					<template #suffix>{{ enablePatreonIntegration? i18n.ts.enabled : i18n.ts.disabled }}</template>
					<XPatreon/>
				</MkFolder>

				<MkFolder>
					<template #icon><i class="ti ti-square-rounded-letter-p"></i></template>
					<template #label>PixivFANBOX</template>
					<template #suffix>{{ enableFanboxIntegration ? i18n.ts.enabled : i18n.ts.disabled }}</template>
					<XFanbox/>
				</MkFolder>
			</div>
		</FormSuspense>
	</MkSpacer>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import XPatreon from './integrations.patreon.vue';
import XFanbox from './integrations.fanbox.vue';
import FormSuspense from '@/components/form/suspense.vue';
import MkFolder from '@/components/MkFolder.vue';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import { misskeyApi } from '@/utility/misskey-api.js';

const enablePatreonIntegration = ref(false);
const enableFanboxIntegration = ref(false);

async function init() {
	const meta = await misskeyApi('admin/meta');
	enablePatreonIntegration.value = meta.enablePatreonIntegration;
	enableFanboxIntegration.value = meta.enableFanboxIntegration;
}

const headerActions = computed(() => []);

const headerTabs = computed(() => []);

definePage({
	title: i18n.ts.integration,
	icon: 'ti ti-share',
});
</script>
