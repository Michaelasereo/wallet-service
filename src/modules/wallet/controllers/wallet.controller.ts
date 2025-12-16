import { Controller, Post, Body, Param, Get, ParseUUIDPipe, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiHeader } from '@nestjs/swagger';
import { WalletService } from '../service/wallet.service';
import { CreateWalletDto } from '../dto/create-wallet.dto';
import { FundWalletDto } from '../dto/fund-wallet.dto';
import { WalletEntity } from '../entities/wallet.entity';
import { IdempotencyKey } from '../../../common/decorators/idempotency.decorator';

@ApiTags('wallets')
@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new wallet' })
  @ApiResponse({ status: 201, description: 'Wallet created successfully', type: WalletEntity })
  createWallet(@Body() dto: CreateWalletDto) {
    return this.walletService.create(dto);
  }

  @Post(':id/fund')
  @ApiOperation({ summary: 'Add funds to a wallet' })
  @ApiParam({ name: 'id', description: 'Wallet ID' })
  @ApiHeader({ name: 'Idempotency-Key', required: false, description: 'Unique key for idempotent operations' })
  @ApiResponse({ status: 200, description: 'Wallet funded successfully', type: WalletEntity })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  fundWallet(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: FundWalletDto,
    @IdempotencyKey() idempotencyKey?: string,
  ) {
    return this.walletService.fundWallet(id, dto, idempotencyKey);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get wallet details with transaction history' })
  @ApiParam({ name: 'id', description: 'Wallet ID' })
  @ApiResponse({ status: 200, description: 'Wallet details', type: WalletEntity })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  getWallet(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.walletService.findOneWithTransactions(id);
  }
}

