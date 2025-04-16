import { markRaw } from 'vue';
import { Pizzax } from '@/lib/pizzax.js';

export const zenStore = markRaw(new Pizzax('zenMode', {
	showWidgets: {
		where: 'deviceAccount',
		default: true,
	},
}));
