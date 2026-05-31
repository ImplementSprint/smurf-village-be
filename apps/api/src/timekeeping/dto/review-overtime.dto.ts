import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export enum OvertimeReviewAction {
  APPROVE = 'approve',
  DENY    = 'deny',
}

export class ReviewOvertimeDto {
  @ApiProperty({
    enum: OvertimeReviewAction,
    description: 'Review action to apply to the overtime request.',
  })
  @IsEnum(OvertimeReviewAction)
  action: OvertimeReviewAction;

  @ApiProperty({
    description: 'Required reason for the approval/denial decision.',
    maxLength: 500,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  review_reason: string;
}
