import { Module } from '@nestjs/common';

import { PaymentsModule } from '../payments/payments.module';

import { BulkUploadsController } from './bulk-uploads.controller';
import { BulkUploadsService } from './bulk-uploads.service';

@Module({
  imports: [PaymentsModule],
  controllers: [BulkUploadsController],
  providers: [BulkUploadsService],
  exports: [BulkUploadsService],
})
export class BulkUploadsModule {}
