import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWalletDto {
  @ApiPropertyOptional({ description: 'Optional owner name or label' })
  ownerName?: string;
}

