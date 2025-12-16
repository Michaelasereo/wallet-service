import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class FundWalletDto {
  @ApiProperty({ example: 100.5 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;
}

