---
task: Extract Data
responsavel: "@etl-coordinator"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - source_type: Type of data source (api | database | file | stream)
  - source_config: Connection/path configuration
  - extraction_mode: full | incremental
  - batch_size: Records per batch (default: 1000)
Saida: |
  - extracted_data: Raw data from source
  - metadata: Extraction metadata (timestamp, record count, etc.)
  - validation_report: Data quality report
Checklist:
  - "[ ] Validate source configuration"
  - "[ ] Test connection to data source"
  - "[ ] Extract data in batches"
  - "[ ] Validate extracted data quality"
  - "[ ] Log extraction metadata"
  - "[ ] Handle extraction errors gracefully"
---

# *extract-data

Extracts data from configured sources with validation and error handling.

## Usage

```
@etl-coordinator

*extract-data
# → Interactive mode, prompts for all options

*extract-data --source api --config config.json
# → Extract from API with config file

*extract-data --source database --mode incremental
# → Incremental extraction from database
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `--source` | string | - | Source type: api, database, file, stream |
| `--config` | string | - | Path to source configuration file |
| `--mode` | string | full | Extraction mode: full or incremental |
| `--batch-size` | number | 1000 | Records per batch |
| `--validate` | flag | true | Validate extracted data |

## Source Types

### API
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

### Database
```json
{
  "type": "database",
  "connection": "postgresql://user:pass@localhost:5432/db",
  "query": "SELECT * FROM table WHERE updated_at > $1",
  "incremental_field": "updated_at"
}
```

### File
```json
{
  "type": "file",
  "path": "./data/input.csv",
  "format": "csv",
  "delimiter": ",",
  "encoding": "utf-8"
}
```

## Flow

```
1. Validate source configuration
   ├── Check required fields
   ├── Test connection
   └── Verify credentials

2. Initialize extraction
   ├── Determine extraction mode (full/incremental)
   ├── Calculate batch size
   └── Set up progress tracking

3. Extract data
   ├── Fetch data in batches
   ├── Apply transformations (if any)
   ├── Validate data quality
   └── Log extraction progress

4. Generate metadata
   ├── Record timestamp
   ├── Count total records
   ├── Calculate data quality metrics
   └── Log any warnings/errors

5. Return extracted data
   └── Output data with metadata
```

## Output

```json
{
  "data": [...],
  "metadata": {
    "extractedAt": "2026-03-04T10:30:00Z",
    "recordCount": 5420,
    "source": "api",
    "mode": "incremental",
    "batchSize": 1000,
    "duration": 12.4
  },
  "validation": {
    "valid": true,
    "warnings": [],
    "errors": []
  }
}
```

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `CONNECTION_FAILED` | Can't connect to source | Check credentials and network |
| `INVALID_CONFIG` | Config missing required fields | Add missing configuration |
| `DATA_QUALITY_ISSUE` | Validation failed | Review validation report |
| `EXTRACTION_TIMEOUT` | Source too slow | Reduce batch size or increase timeout |

## Related

- **Agent:** @etl-coordinator
- **Script:** extract-helper.js
- **Next:** transform-data-task.md
