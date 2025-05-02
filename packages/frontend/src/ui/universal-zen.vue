<template>
<div :class="$style.root">
	<XSidebar v-if="!isMobile" :class="$style.sidebar" :showWidgetButton="!isDesktop" @widgetButtonClick="widgetsShowing = true"/>

	<div :class="$style.contents" @contextmenu.stop="onContextmenu">
		<div>
			<XPreferenceRestore v-if="shouldSuggestRestoreBackup"/>
			<XAnnouncements v-if="$i"/>
			<XStatusBars :class="$style.statusbars"/>
		</div>

		<PageWithHeader v-if="isRoot" :class="$style.content" :actions="headerActions" :overridePageMetadata="defaultPageMetadata">
			<div class="_spacer" style="--MI_SPACER-w: 800px;" :class="$style.zencontents">
				<MkPostForm :class="$style.postForm" class="post-form _panel" fixed style="margin-bottom: var(--margin);"/>
				<XWidgets v-if="showWidgets" :class="$style.widgets" :place="null"/>
				<div :class="$style.spacer"></div>
			</div>
		</PageWithHeader>
		<StackingRouterView v-else-if="prefer.s['experimental.stackingRouterView']" :class="$style.content"/>
		<RouterView v-else :class="$style.content"/>

		<XMobileFooterMenu v-if="isMobile" ref="navFooter" v-model:drawerMenuShowing="drawerMenuShowing" v-model:widgetsShowing="widgetsShowing" :isZenMode="true"/>
	</div>

	<XCommon v-model:drawerMenuShowing="drawerMenuShowing" v-model:widgetsShowing="widgetsShowing"/>
</div>
</template>

<script lang="ts" setup>
import { defineAsyncComponent, provide, onMounted, computed, ref, watch } from 'vue';
import { instanceName } from '@@/js/config.js';
import { isLink } from '@@/js/is-link.js';
import XCommon from './_common_/common.vue';
import type { PageMetadata } from '@/page.js';
import XMobileFooterMenu from '@/ui/_common_/mobile-footer-menu.vue';
import XPreferenceRestore from '@/ui/_common_/PreferenceRestore.vue';
import MkPostForm from '@/components/MkPostForm.vue';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { $i } from '@/i.js';
import { definePage, provideMetadataReceiver, provideReactiveMetadata } from '@/page.js';
import { deviceKind } from '@/utility/device-kind.js';
import { miLocalStorage } from '@/local-storage.js';
import { mainRouter } from '@/router.js';
import { prefer } from '@/preferences.js';
import { shouldSuggestRestoreBackup } from '@/preferences/utility.js';
import { DI } from '@/di.js';

const XWidgets = defineAsyncComponent(() => import('./_common_/widgets.vue'));
const XSidebar = defineAsyncComponent(() => import('@/ui/_common_/navbar.vue'));
const XStatusBars = defineAsyncComponent(() => import('@/ui/_common_/statusbars.vue'));
const XAnnouncements = defineAsyncComponent(() => import('@/ui/_common_/announcements.vue'));

const isRoot = computed(() => mainRouter.currentRoute.value.name === 'index');

const DESKTOP_THRESHOLD = 1100;
const MOBILE_THRESHOLD = 500;

// デスクトップでウィンドウを狭くしたときモバイルUIが表示されて欲しいことはあるので deviceKind === 'desktop' の判定は行わない
const isDesktop = ref(window.innerWidth >= DESKTOP_THRESHOLD);
const isMobile = ref(deviceKind === 'smartphone' || window.innerWidth <= MOBILE_THRESHOLD);
window.addEventListener('resize', () => {
	isMobile.value = deviceKind === 'smartphone' || window.innerWidth <= MOBILE_THRESHOLD;
});

const defaultPageMetadata: PageMetadata = {
	title: i18n.ts.zenMode,
	icon: 'ti ti-seeding',
};

const pageMetadata = ref<null | PageMetadata>(null);
const widgetsShowing = ref(false);

const showWidgets = ref(prefer.s['zenMode.showWidgets']);
watch(prefer.r['zenMode.showWidgets'], (value) => {
	showWidgets.value = value;
});

provide(DI.router, mainRouter);
provideMetadataReceiver((metadataGetter) => {
	const info = metadataGetter();
	pageMetadata.value = info;
});
provideReactiveMetadata(pageMetadata);

watch(isRoot, (v) => {
	if (v) {
		pageMetadata.value = defaultPageMetadata;
	}
});

watch(pageMetadata, updateTitle);

function updateTitle() {
	if (isRoot.value) {
		window.document.title = instanceName;
	} else if (pageMetadata.value) {
		window.document.title = `${pageMetadata.value.title} | ${instanceName}`;
	}
}

updateTitle();

const drawerMenuShowing = ref(false);

mainRouter.on('change', () => {
	drawerMenuShowing.value = false;
});

if (window.innerWidth > 1024) {
	const tempUI = miLocalStorage.getItem('ui_temp');
	if (tempUI) {
		miLocalStorage.setItem('ui', tempUI);
		miLocalStorage.removeItem('ui_temp');
		window.location.reload();
	}
}

onMounted(() => {
	if (!isDesktop.value) {
		window.addEventListener('resize', () => {
			if (window.innerWidth >= DESKTOP_THRESHOLD) isDesktop.value = true;
		}, { passive: true });
	}
});

const onContextmenu = (ev) => {
	if (isLink(ev.target)) return;
	if (['INPUT', 'TEXTAREA', 'IMG', 'VIDEO', 'CANVAS'].includes(ev.target.tagName) || ev.target.attributes['contenteditable']) return;
	if (window.getSelection()?.toString() !== '') return;
	const path = mainRouter.getCurrentFullPath();
	os.contextMenu([{
		type: 'label',
		text: path,
	}, {
		icon: 'ti ti-window-maximize',
		text: i18n.ts.openInWindow,
		action: () => {
			os.pageWindow(path);
		},
	}], ev);
};

const headerActions = computed(() => [{
	icon: 'ti ti-settings',
	text: i18n.ts.settings,
	handler: () => {
		mainRouter.push('/settings/zen');
	},
}]);

definePage(defaultPageMetadata);
</script>

<style lang="scss" module>
$ui-font-size: 1em; // TODO: どこかに集約したい
$widgets-hide-threshold: 1090px;

.root {
	height: 100dvh;
	overflow: clip;
	contain: strict;
	box-sizing: border-box;
	display: flex;
}

.sidebar {
	border-right: solid 0.5px var(--MI_THEME-divider);
}

.contents {
	display: flex;
	flex-direction: column;
	flex: 1;
	height: 100%;
	min-width: 0;
	overflow: auto;
	overscroll-behavior: contain;
	background: var(--MI_THEME-bg);
}

.zencontents {
	padding: 24px;
}

.content {
	flex: 1;
	min-height: 0;
}

.statusbars {
	position: sticky;
	top: 0;
	left: 0;
}

.spacer {
	height: calc(var(--MI-minBottomSpacing));
}

.widgets {
	margin-top: var(--MI-margin);
}
</style>
