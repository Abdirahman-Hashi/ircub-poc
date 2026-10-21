import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { type Paginated, PERMISSIONS } from '@ircub/shared';

import { SWAGGER } from '../../app.constants';
import { RequirePermission } from '../../common/auth/require-permission.decorator';

import { NotificationFilterDto } from './dto/notification-filter.dto';
import { NotificationResponseDto } from './dto/notification.response.dto';
import { NOTIFICATIONS_API } from './notifications.constants';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(NOTIFICATIONS_API.PATH)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.BILLS_VIEW)
  @ApiOperation({ summary: 'Outbound notifications with delivery status' })
  @ApiResponse({ status: HttpStatus.OK, type: [NotificationResponseDto] })
  list(@Query() filter: NotificationFilterDto): Promise<Paginated<NotificationResponseDto>> {
    return this.notifications.list(filter);
  }
}
