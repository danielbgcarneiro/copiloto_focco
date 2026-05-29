# Coding Standards - planejamento-projeto Squad

## Extends Core AIOS Standards

This squad extends the core AIOS coding standards with specific rules for data processing and ETL workflows.

## Additional Standards

### ETL-Specific Patterns

#### Data Extraction
```javascript
// Always validate data sources before extraction
async function extractData(source) {
  if (!isValidSource(source)) {
    throw new Error('Invalid data source');
  }

  const data = await fetchFromSource(source);
  return validateExtractedData(data);
}
```

#### Data Transformation
```javascript
// Use pure functions for transformations
function transformRecord(record) {
  return {
    id: record.id,
    processedAt: new Date().toISOString(),
    data: normalizeData(record.data)
  };
}
```

#### Data Loading
```javascript
// Always use transactions for data loading
async function loadData(records, target) {
  const transaction = await beginTransaction(target);
  try {
    await transaction.insertMany(records);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

### Error Handling

- Log all extraction failures with source metadata
- Retry transformations up to 3 times with exponential backoff
- Never partially load data - always use transactions
- Maintain audit trail for all ETL operations

### Performance

- Batch operations in chunks of 1000 records
- Use streaming for large datasets (> 10MB)
- Implement circuit breakers for external data sources
- Cache frequently accessed reference data

### Testing

- Unit test each transformation function
- Integration test full ETL pipeline
- Use test fixtures for reproducible data
- Mock external data sources in tests

## File Organization

```
scripts/
├── extract-helper.js    # Extraction utilities
├── transform-helper.js  # Transformation utilities
└── load-helper.js       # Loading utilities

tasks/
├── extract-data-task.md
├── transform-data-task.md
└── load-data-task.md
```

---
*Extends: .aios-core/CODING-STANDARDS.md*
