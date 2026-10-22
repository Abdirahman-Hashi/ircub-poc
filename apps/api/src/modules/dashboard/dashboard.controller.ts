import { Body, Controller, Get, Header, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { DASHBOARD, PERMISSIONS } from '@ircub/shared';

import { SWAGGER } from '../../app.constants';
import { RequirePermission } from '../../common/auth/require-permission.decorator';

import { DASHBOARD_API } from './dashboard.constants';
import { DashboardService } from './dashboard.service';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import { EfficiencyRowResponseDto } from './dto/efficiency-row.response.dto';
import { ForecastQueryDto } from './dto/forecast-query.dto';
import { ForecastResponseDto } from './dto/forecast.response.dto';
import { OverviewResponseDto } from './dto/overview.response.dto';
import { PeriodRangeQueryDto } from './dto/period-range-query.dto';
import { RebuildDto } from './dto/rebuild.dto';
import { TargetAttainmentRowResponseDto } from './dto/target-attainment-row.response.dto';
import { TrendsQueryDto } from './dto/trends-query.dto';
import { TrendsResponseDto } from './dto/trends.response.dto';
import { ForecastService } from './forecast.service';
import { SummaryService } from './summary.service';

@ApiTags('dashboard')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(DASHBOARD_API.PATH)
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly forecasts: ForecastService,
    private readonly summaries: SummaryService,
  ) {}

  @Get(DASHBOARD_API.OVERVIEW)
  @RequirePermission(PERMISSIONS.DASHBOARD_VIEW)
  @Header('Cache-Control', DASHBOARD_API.CACHE_CONTROL)
  @ApiOperation({ summary: 'KPI cards for a date range (from pre-aggregated summaries)' })
  @ApiResponse({ status: HttpStatus.OK, type: OverviewResponseDto })
  overview(@Query() query: DateRangeQueryDto): Promise<OverviewResponseDto> {
    return this.dashboard.overview(query.from, query.to);
  }

  @Get(DASHBOARD_API.TRENDS)
  @RequirePermission(PERMISSIONS.DASHBOARD_VIEW)
  @Header('Cache-Control', DASHBOARD_API.CACHE_CONTROL)
  @ApiOperation({ summary: 'Collection series by revenue type or channel, per day/week/month' })
  @ApiResponse({ status: HttpStatus.OK, type: TrendsResponseDto })
  trends(@Query() query: TrendsQueryDto): Promise<TrendsResponseDto> {
    return this.dashboard.trends(query);
  }

  @Get(DASHBOARD_API.TARGETS)
  @RequirePermission(PERMISSIONS.DASHBOARD_VIEW)
  @Header('Cache-Control', DASHBOARD_API.CACHE_CONTROL)
  @ApiOperation({ summary: 'Collected vs target per revenue type and month' })
  @ApiResponse({ status: HttpStatus.OK, type: [TargetAttainmentRowResponseDto] })
  targets(@Query() query: PeriodRangeQueryDto): Promise<TargetAttainmentRowResponseDto[]> {
    return this.dashboard.targetAttainment(query.from, query.to);
  }

  @Get(DASHBOARD_API.EFFICIENCY)
  @RequirePermission(PERMISSIONS.DASHBOARD_VIEW)
  @Header('Cache-Control', DASHBOARD_API.CACHE_CONTROL)
  @ApiOperation({ summary: 'Water billed vs collected per month' })
  @ApiResponse({ status: HttpStatus.OK, type: [EfficiencyRowResponseDto] })
  efficiency(@Query() query: DateRangeQueryDto): Promise<EfficiencyRowResponseDto[]> {
    return this.dashboard.efficiency(query.from, query.to);
  }

  @Get(DASHBOARD_API.FORECAST)
  @RequirePermission(PERMISSIONS.DASHBOARD_VIEW)
  @Header('Cache-Control', DASHBOARD_API.CACHE_CONTROL)
  @ApiOperation({
    summary: 'Monthly forecast: OLS regression (default) or Holt smoothing, with R² and caveat',
  })
  @ApiResponse({ status: HttpStatus.OK, type: ForecastResponseDto })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'INSUFFICIENT_HISTORY' })
  forecast(@Query() query: ForecastQueryDto): Promise<ForecastResponseDto> {
    return this.forecasts.forecast(
      query.model,
      query.months,
      query.by === DASHBOARD.BY.REVENUE_TYPE,
    );
  }

  @Post(DASHBOARD_API.REBUILD)
  @RequirePermission(PERMISSIONS.CONFIG_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recompute the daily summaries for a date range' })
  async rebuild(@Body() dto: RebuildDto): Promise<{ rows: number }> {
    return { rows: await this.summaries.rebuild(dto.from, dto.to) };
  }
}
