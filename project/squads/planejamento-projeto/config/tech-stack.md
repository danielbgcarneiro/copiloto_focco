# Tech Stack - planejamento-projeto Squad

## Core Technologies

### Runtime
- **Node.js** >= 18.0.0
- **npm** or **yarn** for package management

### Data Processing
- **Papa Parse** - CSV parsing
- **JSONStream** - Streaming JSON processing
- **lodash** - Data transformation utilities

### Database
- **PostgreSQL** - Primary data warehouse
- **SQLite** - Local development/testing
- **Supabase** - Optional managed PostgreSQL

### Validation
- **Joi** or **Zod** - Schema validation
- **Ajv** - JSON Schema validation

### Testing
- **Jest** - Unit and integration tests
- **Supertest** - API testing
- **Faker.js** - Test data generation

### Monitoring
- **Winston** - Logging
- **Prometheus** - Metrics (optional)

## Optional Integrations

### Cloud Storage
- **AWS S3** - Data lake storage
- **Google Cloud Storage** - Alternative cloud storage

### Message Queues
- **RabbitMQ** - Job queuing
- **Redis** - Caching and pub/sub

### Data Sources
- **Axios** - HTTP client for REST APIs
- **node-postgres** - PostgreSQL client
- **mongodb** - MongoDB client (if needed)

## Development Tools

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **nodemon** - Development server

## Configuration

Environment variables required:
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Optional: Cloud storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=

# Optional: Message queue
RABBITMQ_URL=amqp://localhost
REDIS_URL=redis://localhost:6379
```

---
*Extends: .aios-core/TECH-STACK.md*
