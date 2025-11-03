import { Injectable } from '@nestjs/common';
import type Logger from '@/logger.js';
import { bindThis } from '@/decorators.js';
import { MetaService } from '@/core/MetaService.js';
import { PatreonManagementService } from '@/core/integrations/PatreonManagementService.js';
import { FanboxManagementService } from '@/core/integrations/FanboxManagementService.js';
import { QueueLoggerService } from '../QueueLoggerService.js';
import type * as Bull from 'bullmq';

@Injectable()
export class IntegrationDaemonProcessorService {
	private logger: Logger;

	constructor(
		private queueLoggerService: QueueLoggerService,
		private metaService: MetaService,
		private patreonManagementService: PatreonManagementService,
		private fanboxManagementService: FanboxManagementService,
	) {
		this.logger = this.queueLoggerService.logger.createSubLogger('integration-daemon');
	}

	@bindThis
	public async process(job: Bull.Job): Promise<void> {
		const meta = await this.metaService.fetch();

		if (meta.enableFanboxIntegration) {
			const result = this.fanboxManagementService.update();
			if (result != null) {
				job.log(`Found ${result} Fanbox supporters.`);
			} else {
				job.log('Failed to fetch Fanbox supporters.');
			}
		}

		if (meta.enablePatreonIntegration) {
			const result = this.patreonManagementService.update();
			if (result != null) {
				job.log(`Found ${result} Patreon supporters.`);
			} else {
				job.log('Failed to fetch Patreon supporters.');
			}
		}
	}
}
