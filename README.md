# Wallet Service by Opeyemi-Michael 

A NestJS-based wallet management system with transaction capabilities.

## Features
- Create wallets
- Fund wallets
- Transfer between wallets
- Transaction history
- Idempotent operations (bonus) - Added this as a bonus 
- Unit tests (bonus) - This as a bonus too 
- Comprehensive error handling
- Swagger API documentation

## Tech Stack
- NestJS
- TypeScript
- TypeORM
- SQLite (development) / PostgreSQL (production ready)
- Swagger API documentation
- class-validator for input validation

## Submission Information

### Key Design Decisions:

1. **Database Transactions**: Used TypeORM transactions with pessimistic locking to ensure balance integrity
2. **Idempotency**: Implemented via idempotency-key header to prevent duplicate operations
3. **Clean Architecture**: Separated concerns with modules, services, repositories, and DTOs
4. **Validation**: Comprehensive validation at DTO level with class-validator
5. **Error Handling**: Structured error responses with appropriate HTTP status codes
6. **Query Optimization**: Used query builder for efficient transaction history retrieval

### Assumptions Made:

1. Single currency (USD) as specified [important]
2. SQLite for simplicity (easy to switch to PostgreSQL)
3. No authentication required (would add JWT in production)
4. In-memory idempotency tracking (would use Redis in production)
5. Two decimal precision for monetary amounts
6. Pessimistic locking sufficient for concurrency (would consider optimistic locking for high-throughput scenarios)

## Setup Instructions

```bash
# 1. Clone repository
git clone <repository-url>
cd wallet-service

# 2. Install dependencies
npm install

# 3. Start the server
npm run start:dev

# 4. Access API documentation
# Open http://localhost:3000/api
```

## Running the app

```bash
# development
npm run start:dev

# production mode
npm run start:prod

# test
npm run test

# e2e tests
npm run test:e2e
```

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/wallets` | Create new wallet |
| POST | `/wallets/:id/fund` | Fund existing wallet |
| GET | `/wallets/:id` | Get wallet with transactions |
| POST | `/transfers` | Transfer between wallets |

## Idempotency

To ensure idempotent operations for funding and transfers, include an `Idempotency-Key` header:
```
Idempotency-Key: unique-key-per-operation
```

The system will return the same result for duplicate requests with the same idempotency key, preventing accidental double-charging or duplicate transfers.

## API Testing

### Using Postman
Import the `postman-collection.json` file included in the repository.

### Using cURL Examples

```bash
# 1. Create a wallet
curl -X POST http://localhost:3000/wallets \
  -H "Content-Type: application/json" \
  -d '{"ownerName": "Alice"}'

# 2. Fund the wallet
curl -X POST http://localhost:3000/wallets/{wallet-id}/fund \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: fund-123" \
  -d '{"amount": 100}'

# 3. Create another wallet
curl -X POST http://localhost:3000/wallets \
  -H "Content-Type: application/json" \
  -d '{"ownerName": "Bob"}'

# 4. Transfer funds
curl -X POST http://localhost:3000/transfers \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: transfer-456" \
  -d '{
    "fromWalletId": "alice-wallet-id",
    "toWalletId": "bob-wallet-id",
    "amount": 25
  }'

# 5. Check wallet balance
curl http://localhost:3000/wallets/{wallet-id}
```

## Database Schema - For Production readiness 

```sql
-- Wallets table
CREATE TABLE wallets (
  id VARCHAR(36) PRIMARY KEY,
  balance DECIMAL(18,2) DEFAULT 0,
  ownerName VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table  
CREATE TABLE transactions (
  id VARCHAR(36) PRIMARY KEY,
  amount DECIMAL(18,2),
  type ENUM('credit', 'debit'),
  status ENUM('pending', 'completed', 'failed'),
  walletId VARCHAR(36),
  description TEXT,
  idempotencyKey VARCHAR(255) UNIQUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (walletId) REFERENCES wallets(id) ON DELETE CASCADE
);
```

## Database
Uses SQLite for simplicity. Database file: `database.sqlite` (created automatically on first run).

For production, see [SCALING.md](SCALING.md) for PostgreSQL migration guide.

## API Documentation
Visit http://localhost:3000/api for interactive Swagger documentation.

## Code Quality

- ✅ TypeScript with strict mode
- ✅ ESLint for code quality
- ✅ Prettier for formatting  
- ✅ Swagger API documentation
- ✅ Unit tests included
- ✅ Error handling implemented
- ✅ Input validation
- ✅ Transaction integrity

## Production Considerations

See [SCALING.md](SCALING.md) for detailed production scaling strategy including:
- Database migration to PostgreSQL
- Caching with Redis
- Load balancing
- Horizontal scaling
- Event-driven architecture
- Monitoring and observability

## Project Structure

```
src/
├── modules/
│   ├── wallet/
│   │   ├── entities/
│   │   ├── dto/
│   │   ├── service/
│   │   ├── controllers/
│   │   └── wallet.module.ts
│   └── transaction/
│       ├── entities/
│       ├── dto/
│       ├── service/
│       ├── controllers/
│       └── transaction.module.ts
├── common/
│   └── decorators/
│       └── idempotency.decorator.ts
├── config/
└── main.ts
```


