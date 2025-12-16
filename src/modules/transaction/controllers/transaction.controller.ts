import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { TransactionService } from '../service/transaction.service';
import { CreateTransferDto } from '../dto/create-transfer.dto';
import { IdempotencyKey } from '../../../common/decorators/idempotency.decorator';

@ApiTags('transactions')
@Controller('transfers')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @ApiOperation({ summary: 'Transfer funds between wallets' })
  @ApiHeader({ name: 'Idempotency-Key', required: false, description: 'Unique key for idempotent operations' })
  @ApiResponse({ 
    status: 201, 
    description: 'Transfer completed successfully',
    schema: {
      type: 'object',
      properties: {
        fromWallet: { type: 'object' },
        toWallet: { type: 'object' },
        debitTransactionId: { type: 'string', format: 'uuid' },
        creditTransactionId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request (insufficient funds, same wallet, etc.)' })
  @ApiResponse({ status: 404, description: 'One or both wallets not found' })
  transfer(
    @Body() dto: CreateTransferDto,
    @IdempotencyKey() idempotencyKey?: string,
  ) {
    return this.transactionService.transfer(dto, idempotencyKey);
  }
}

