import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTransferDto {
  @ApiProperty({ description: 'Source wallet ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  fromWalletId: string;

  @ApiProperty({ description: 'Destination wallet ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsUUID()
  toWalletId: string;

  @ApiProperty({ example: 25.5, description: 'Amount to transfer' })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;
}

