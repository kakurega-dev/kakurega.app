<template>
	<MkSuspense :p="init">
		<div class="_gaps_m">
			<MkSwitch v-model="enableFanboxIntegration">
				<template #label>{{ i18n.ts.enable }}</template>
			</MkSwitch>

			<template v-if="enableFanboxIntegration">
				<MkInput v-model="fanboxApiBackendUrl">
					<template #prefix><i class="ti ti-link"></i></template>
					<template #label>FANBOX API Backend Host</template>
				</MkInput>
			</template>

			<MkButton primary @click="save"><i class="ti ti-device-floppy"></i> {{ i18n.ts.save }}</MkButton>
		</div>
	</MkSuspense>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkInput from '@/components/MkInput.vue';
import MkButton from '@/components/MkButton.vue';
import * as os from '@/os.js';
import { fetchInstance } from '@/instance.js';
import { i18n } from '@/i18n.js';
import { misskeyApi } from '@/utility/misskey-api.js';

const uri = ref('');
const enableFanboxIntegration = ref(false);
const fanboxApiBackendUrl = ref('');

async function init() {
	const meta = await misskeyApi('admin/meta');
	uri.value = meta.uri;
	enableFanboxIntegration.value = meta.enableFanboxIntegration;
	fanboxApiBackendUrl.value = meta.fanboxApiBackendUrl ?? '';
}

function save() {
	os.apiWithDialog('admin/update-meta', {
		enableFanboxIntegration: enableFanboxIntegration.value,
		fanboxApiBackendUrl: fanboxApiBackendUrl.value,
	}).then(() => {
		fetchInstance();
	});
}
</script>
