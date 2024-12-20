import { IsNotEmpty, IsNumber, IsString, IsISO8601 } from 'class-validator';

export class CreateYouTubeCampaignDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  budgetAmountMicros: number;

  @IsNotEmpty()
  @IsString()
  videoId: string;

  @IsNotEmpty()
  @IsISO8601()
  startDate: string; // Keep it as string, validate format as ISO8601

  @IsNotEmpty()
  @IsISO8601()
  endDate: string;

  @IsNotEmpty()
  @IsString()
  biddingStrategy: string;
}
