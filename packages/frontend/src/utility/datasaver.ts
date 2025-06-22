import { prefer } from '@/preferences.js';

function isEnableDataSaver(type: string): boolean {
	return ['cellular', 'unknown'].includes(type);
}

export function isSupportNavigatorConnection(): boolean {
	const connection = (navigator as any).connection;
	return connection && connection.type && ('onchange' in connection);
}

export function isMobileData(): boolean {
	const connection = (navigator as any).connection;
	if (!isSupportNavigatorConnection()) return false;
	return isEnableDataSaver(connection.type);
}

export function initializeDetectNetworkChange(): void {
	const connection = (navigator as any).connection;
	if (!isSupportNavigatorConnection()) return;

	connection.addEventListener('change', () => {
		if (!connection || !connection.type) return;
		prefer.commit('enableDataSaverMode', isEnableDataSaver(connection.type));
	});
}

export function getDataSaverState(type: 'media' | 'avatar' | 'urlPreviewThumbnail' | 'disableUrlPreview' | 'code'): boolean {
	return prefer.s.enableDataSaverMode && prefer.s.dataSaver[type];
}
