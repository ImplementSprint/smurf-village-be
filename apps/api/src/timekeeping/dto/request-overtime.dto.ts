import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsNumber,
  Min,
  Max,
  IsDateString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum OvertimeType {
  NORMAL    = 'NORMAL',
  REST_DAY  = 'REST_DAY',
  HOLIDAY   = 'HOLIDAY',
}

export class RequestOvertimeDto {
  @ApiProperty({ enum: OvertimeType, description: 'Type of overtime being requested' })
  @IsEnum(OvertimeType)
  ot_type: OvertimeType;

  @ApiProperty({
    description: 'Date for which OT is requested (YYYY-MM-DD). Must be a future date.',
    example: '2026-05-20',
  })
  @IsDateString()
  ot_date: string;

  @ApiProperty({
    description: 'Planned overtime start time (HH:MM, 24-hour)',
    example: '18:00',
  })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'start_time must be in HH:MM format (24-hour)',
  })
  start_time: string;

  @ApiProperty({
    description: 'Planned overtime end time (HH:MM, 24-hour). Must be after start_time (no overnight).',
    example: '20:00',
  })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'end_time must be in HH:MM format (24-hour)',
  })
  end_time: string;

  @ApiProperty({
    description: 'GPS latitude coordinate (required)',
    example: 14.5995,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    description: 'GPS longitude coordinate (required)',
    example: 120.9842,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({
    description: 'Reason / justification for the overtime request',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
