# planejamento-projeto Squad

Squad para planejamento de projetos - ETL data processing automation

## Overview

This squad provides a complete ETL (Extract, Transform, Load) pipeline for data processing workflows. It includes coordinated agents, tasks, and helper scripts to extract data from various sources, transform it according to rules, and load it to target destinations.

## Components

### Agents

- **@etl-coordinator** - Orchestrates ETL pipelines and coordinates data processing tasks
- **@data-processor** - Handles data transformation, validation, and enrichment

### Tasks

- **extract-data-task.md** - Extract data from API, database, or file sources
- **transform-data-task.md** - Transform data with validation and error handling
- **load-data-task.md** - Load data to targets with transaction support

### Helper Scripts

- **extract-helper.js** - Utilities for data extraction
- **transform-helper.js** - Utilities for data transformation
- **load-helper.js** - Utilities for data loading

## Quick Start

### 1. Activate ETL Coordinator

```bash
@etl-coordinator
```

### 2. Run Full ETL Pipeline

```bash
*run-pipeline
```

Or run individual steps:

```bash
*extract-data --source api --config config.json
*transform-data --input data.json --rules transform-rules.yaml
*load-data --input transformed.json --target database --mode upsert
```

## Configuration

### Source Configuration (Extract)

```json
{
  "type": "api",
  "endpoint": "https://api.example.com/data",
  "headers": {
    "Authorization": "Bearer TOKEN"
  },
  "pagination": {
    "type": "offset",
    "limit": 1000
  }
}
```

### Transformation Rules

```yaml
transformations:
  - field: id
    type: string
    required: true

  - field: amount
    type: number
    transform: parseFloat
    validate:
      min: 0
      max: 1000000
```

### Target Configuration (Load)

```json
{
  "type": "database",
  "connection": "postgresql://user:pass@localhost:5432/db",
  "table": "processed_data",
  "primaryKey": "id",
  "onConflict": "update"
}
```

## Dependencies

### Required

- Node.js >= 18.0.0
- PostgreSQL (for database targets)

### NPM Packages

```bash
npm install pg papaparse axios lodash joi
```

See `config/tech-stack.md` for complete list.

## Usage Examples

### Example 1: Extract from API

```javascript
const { ExtractHelper } = require('./scripts/extract-helper.js');

const helper = new ExtractHelper();
const data = await helper.extractFromAPI({
  endpoint: 'https://api.example.com/users',
  headers: { 'Authorization': 'Bearer TOKEN' },
  pagination: { limit: 1000 }
});
```

### Example 2: Transform Data

```javascript
const { TransformHelper } = require('./scripts/transform-helper.js');

const helper = new TransformHelper();
const { transformed, rejected } = await helper.transformDataset(data, rules);
```

### Example 3: Load to Database

```javascript
const { LoadHelper } = require('./scripts/load-helper.js');

const helper = new LoadHelper();
const result = await helper.loadToDatabase(transformed, {
  connection: process.env.DATABASE_URL,
  table: 'users',
  primaryKey: 'id',
  mode: 'upsert'
});
```

## Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- extract-helper.test.js
```

## Coding Standards

See `config/coding-standards.md` for ETL-specific coding patterns and best practices.

## Error Handling

All ETL operations include comprehensive error handling:

- **Extract errors** - Logged with source metadata
- **Transform errors** - Rejected records tracked separately
- **Load errors** - Transaction rollback on failure

## Performance

- Batched operations (default: 1000 records per batch)
- Streaming support for large datasets
- Transaction support for data integrity
- Circuit breakers for external sources

## Monitoring

All operations generate detailed reports:

```json
{
  "success": true,
  "loaded": 5380,
  "failed": 0,
  "duration": 8.7,
  "report": {
    "target": "database",
    "mode": "upsert",
    "batchSize": 1000,
    "timestamp": "2026-03-04T10:40:00Z"
  }
}
```

## Contributing

This squad extends core AIOS standards. See:

- `config/coding-standards.md` - Coding guidelines
- `config/tech-stack.md` - Technology choices
- `config/source-tree.md` - File organization

## License

MIT

## Author

danielbgcarneiro

---
*Part of Synkra AIOS Squad System*
