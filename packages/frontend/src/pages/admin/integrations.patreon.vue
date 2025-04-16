<template>
	<FormSuspense :p="init">
		<div class="_gaps_m">
			<MkSwitch v-model="enablePatreonIntegration">
				<template #label>{{ i18n.ts.enable }}</template>
			</MkSwitch>

			<template v-if="enablePatreonIntegration">
				<FormInfo>Callback URL: {{ `${uri}/api/pr/cb` }}</FormInfo>

				<MkInput v-model="patreonClientId">
					<template #prefix><i class="ti ti-key"></i></template>
					<template #label>Client ID</template>
				</MkInput>

				<MkInput v-model="patreonClientSecret">
					<template #prefix><i class="ti ti-key"></i></template>
					<template #label>Client Secret</template>
				</MkInput>

				<MkInput v-model="patreonAccessToken">
					<template #prefix><i class="ti ti-key"></i></template>
					<template #label>Creator's access token</template>
				</MkInput>

				<MkInput v-model="patreonRefreshToken">
					<template #prefix><i class="ti ti-key"></i></template>
					<template #label>Creator's refresh token</template>
				</MkInput>
			</template>

			<MkButton primary @click="save"><i class="ti ti-device-floppy"></i> {{ i18n.ts.save }}</MkButton>
		</div>
	</FormSuspense>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkInput from '@/components/MkInput.vue';
import MkButton from '@/components/MkButton.vue';
import FormInfo from '@/components/MkInfo.vue';
import FormSuspense from '@/components/form/suspense.vue';
import * as os from '@/os.js';
import { fetchInstance } from '@/instance.js';
import { i18n } from '@/i18n.js';
import { misskeyApi } from '@/utility/misskey-api.js';

const uri = ref('');
const enablePatreonIntegration = ref(false);
const patreonClientId = ref<string | null>(null);
const patreonClientSecret = ref<string | null>(null);
const patreonAccessToken = ref<string | null>(null);
const patreonRefreshToken = ref<string | null>(null);

async function init() {
	const meta = await misskeyApi('admin/meta');
	uri.value = meta.uri;
	enablePatreonIntegration.value = meta.enablePatreonIntegration;
	patreonClientId.value = meta.patreonClientId ?? '';
	patreonClientSecret.value = meta.patreonClientSecret ?? '';
	patreonAccessToken.value = meta.patreonAccessToken ?? '';
	patreonRefreshToken.value = meta.patreonRefreshToken ?? '';
}

function save() {
	os.apiWithDialog('admin/update-meta', {
		enablePatreonIntegration: enablePatreonIntegration.value,
		patreonClientId: patreonClientId.value,
		patreonClientSecret: patreonClientSecret.value,
		patreonAccessToken: patreonAccessToken.value,
		patreonRefreshToken: patreonRefreshToken.value,
	}).then(() => {
		fetchInstance();
	});
}
</script>
