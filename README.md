# Transaction Pattern Analyzer

AI-powered financial transaction analyzer that detects patterns, normalizes merchants, and identifies subscriptions.

## Features

- 🤖 AI-powered transaction analysis
- 💳 Merchant name normalization
- 🔄 Subscription & recurring payment detection
- 📊 Pattern visualization
- 📈 Transaction analytics
- 📁 CSV file upload support
- 📝 Detailed API documentation with Swagger
- 🚀 High performance with Redis caching
- 🎯 Asynchronous processing with RabbitMQ

## Tech Stack

### Backend
- NestJS
- TypeScript
- PostgreSQL with Prisma ORM
- Redis for caching
- RabbitMQ for message queuing
- OpenAI API for AI analysis
- Swagger for API documentation

### Frontend
- Next.js 14
- TypeScript
- Tailwind CSS
- Shadcn UI
- React Query
- Framer Motion

## Prerequisites

Before you begin, ensure you have installed:
- Node.js (v18 or higher)
- npm (v9 or higher)
- PostgreSQL
- Redis
- RabbitMQ

## Installation & Setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/transaction-analyzer.git
cd transaction-analyzer
```

2. Install dependencies
```bash
npm install
```

3. Environment Setup

Create a `.env` file in the root directory using the template below:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/dbname"

# Server Configuration
PORT=3001
NODE_ENV=development

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# RabbitMQ Configuration
RABBIT_MQ_URI=amqp://username:password@localhost:5672
```

4. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev
```

5. Start the Development Server
```bash
npm run start:dev
```

The server will start on http://localhost:3001

## API Documentation

This project uses Swagger for API documentation. To access the Swagger UI:

1. Start the development server
2. Navigate to http://localhost:3001/api/docs in your browser

The documentation includes:
- All available endpoints
- Request/response schemas
- Example values
- Interactive testing interface

## Available Scripts

```bash
# Development
npm run start:dev

# Production build
npm run build

# Production start
npm run start:prod

# Run tests
npm run test

# Run e2e tests
npm run test:e2e

# Run linting
npm run lint
```

## Project Structure

```
src/
├── controllers/         # API Controllers
├── services/           # Business Logic
├── modules/           # Modules
├── events/           # Event handlers
├── queue/           # event consumers/publishers
├── tasks/           # cron job tasks
├── dto/                # Data Transfer Objects
├── infrastructure/     # External Services (Redis, RabbitMQ, OpenAI)
├── prisma/            # Database Schema and Migrations
└── types/             # TypeScript Type Definitions
```

## API Endpoints

### Transactions
- `POST /api/transactions/upload` - Upload CSV file
- `GET /api/transactions` - Get transactions list
- `POST /api/transactions/analyze` - Analyze transactions
- `GET /api/transactions/:transactionId` - Get single transaction
- 
### Merchants
- `POST /api/merchants/normalize` - Normalize merchant
- `GET /api/merchants` - Get merchants list

### Patterns
- `POST /api/patterns/analyze` - Analyze patterns
- `GET /api/patterns` - Get detected patterns


## CSV File Format

The system accepts CSV files with the following columns:
```csv
date,description,amount
2024-01-01,NETFLIX,-19.99
2024-01-15,AMZN MKTP,-89.97
```

## Error Handling

The API uses standard HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 404: Not Found
- 500: Internal Server Error

## Caching

Redis is used for caching:
- Merchant normalization results
- Pattern detection results
- Frequently accessed transactions

## Message Queue (just works as Proof of Concept)

RabbitMQ is used for:
- Asynchronous transaction processing
- Pattern detection events
- Merchant normalization events

## Development

### Code Style
This project uses ESLint and Prettier for code formatting:
```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```


## Deployment

### Prerequisites
- PostgreSQL database
- Redis instance
- RabbitMQ instance
- OpenAI API key

### Environment Variables
Ensure all required environment variables are set in your deployment environment.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


