---
task: Load Data
responsavel: "@etl-coordinator"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - transformed_data: Validated data to load
  - target_config: Target destination configuration
  - load_mode: insert | upsert | replace
  - batch_size: Records per transaction (default: 1000)
Saida: |
  - load_result: Load operation result
  - loaded_records: Count of successfully loaded records
  - failed_records: Records that failed to load
  - load_report: Detailed load report
Checklist:
  - "[ ] Validate target configuration"
  - "[ ] Test connection to target"
  - "[ ] Begin transaction"
  - "[ ] Load data in batches"
  - "[ ] Commit transaction or rollback on error"
  - "[ ] Log load metadata"
  - "[ ] Generate load report"
---

# *load-data

Loads transformed data to target destination with transaction support.

## Usage

```
@etl-coordinator

*load-data
# → Interactive mode

*load-data --input data.json --target database --mode upsert
# → Load to database with upsert mode

*load-data --input data.json --target file --output results.csv
# → Load to CSV file
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `--input` | string | - | Transformed data file |
| `--target` | string | - | Target type: database, file, api |
| `--config` | string | - | Target configuration file |
| `--mode` | string | insert | Load mode: insert, upsert, replace |
| `--batch-size` | number | 1000 | Records per transaction |
| `--dry-run` | flag | false | Simulate load without writing |

## Target Types

### Database
```json
{
  "type": "database",
  "connection": "postgresql://user:pass@localhost:5432/db",
  "table": "processed_data",
  "primaryKey": "id",
  "onConflict": "update"
}
```

### File
```json
{
  "type": "file",
  "path": "./output/data.csv",
  "format": "csv",
  "delimiter": ",",
  "headers": true
}
```

### API
```json
{
  "type": "api",
  "endpoint": "https://api.example.com/data",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer TOKEN"
  },
  "batchEndpoint": "/batch"
}
```

## Load Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `insert` | Insert new records only | First-time load, append-only |
| `upsert` | Insert or update on conflict | Incremental updates |
| `replace` | Delete all and insert | Full refresh |

## Flow

```
1. Validate configuration
   ├── Check target config
   ├── Test connection
   └── Verify credentials

2. Prepare data
   ├── Validate input data
   ├── Check data schema
   └── Calculate batch count

3. Load data
   ├── Begin transaction
   ├── For each batch:
   │   ├── Transform for target format
   │   ├── Execute load operation
   │   ├── Track progress
   │   └── Handle errors
   ├── Commit transaction
   └── Or rollback on failure

4. Generate report
   ├── Count loaded records
   ├── List failed records
   ├── Calculate metrics
   └── Log summary

5. Return results
   └── Output load report
```

## Output

```json
{
  "success": true,
  "loaded": 5380,
  "failed": 0,
  "duration": 8.7,
  "report": {
    "target": "database",
    "table": "processed_data",
    "mode": "upsert",
    "batchSize": 1000,
    "batches": 6,
    "timestamp": "2026-03-04T10:40:00Z"
  },
  "failedRecords": []
}
```

## Transaction Handling

### Successful Load
```
BEGIN TRANSACTION
  INSERT/UPSERT batch 1 (1000 records)
  INSERT/UPSERT batch 2 (1000 records)
  ...
  INSERT/UPSERT batch N (380 records)
COMMIT
```

### Failed Load (Rollback)
```
BEGIN TRANSACTION
  INSERT/UPSERT batch 1 (1000 records) ✓
  INSERT/UPSERT batch 2 (1000 records) ✗ ERROR
ROLLBACK
→ No data persisted, maintain integrity
```

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `CONNECTION_FAILED` | Can't connect to target | Check credentials and network |
| `SCHEMA_MISMATCH` | Data doesn't match target schema | Verify transformation output |
| `CONSTRAINT_VIOLATION` | Unique/foreign key violation | Check data integrity |
| `TRANSACTION_FAILED` | Load operation failed | Review error logs, retry |
| `PERMISSION_DENIED` | Insufficient permissions | Verify user permissions |

## Performance Tips

- Use batch inserts for large datasets
- Adjust batch size based on target performance
- Disable indexes during bulk loads (re-enable after)
- Use connection pooling for databases
- Monitor transaction log size

## Related

- **Agent:** @etl-coordinator
- **Script:** load-helper.js
- **Previous:** transform-data-task.md
