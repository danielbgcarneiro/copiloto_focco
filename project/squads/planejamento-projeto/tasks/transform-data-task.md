---
task: Transform Data
responsavel: "@data-processor"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - raw_data: Extracted data to transform
  - transformation_rules: Rules/schema for transformation
  - validation_schema: Schema for output validation
Saida: |
  - transformed_data: Processed and validated data
  - transformation_report: Transformation statistics
  - rejected_records: Records that failed transformation
Checklist:
  - "[ ] Load transformation rules"
  - "[ ] Validate input data schema"
  - "[ ] Apply transformations to each record"
  - "[ ] Validate transformed data"
  - "[ ] Log rejected records with reasons"
  - "[ ] Generate transformation report"
---

# *transform-data

Transforms raw data according to specified rules with validation.

## Usage

```
@data-processor

*transform-data
# → Interactive mode

*transform-data --input data.json --rules transform-rules.yaml
# → Transform with specific rules

*transform-data --input data.json --validate-only
# → Validate without transforming
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `--input` | string | - | Input data file path |
| `--rules` | string | - | Transformation rules file |
| `--schema` | string | - | Validation schema file |
| `--validate-only` | flag | false | Only validate, don't transform |
| `--reject-file` | string | rejected.json | Path for rejected records |

## Transformation Rules

```yaml
transformations:
  - field: id
    type: string
    required: true

  - field: created_at
    type: timestamp
    format: ISO8601
    required: true

  - field: amount
    type: number
    transform: parseFloat
    validate:
      min: 0
      max: 1000000

  - field: email
    type: string
    transform: toLowerCase
    validate:
      pattern: "^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$"

  - field: tags
    type: array
    transform: splitByComma
    default: []
```

## Flow

```
1. Load configuration
   ├── Load transformation rules
   ├── Load validation schema
   └── Initialize output structure

2. Validate input
   ├── Check input data format
   ├── Verify required fields
   └── Log validation errors

3. Transform records
   ├── For each record:
   │   ├── Apply field transformations
   │   ├── Validate transformed record
   │   ├── Add to output or rejected list
   │   └── Log transformation errors
   └── Track progress

4. Generate report
   ├── Count successful transformations
   ├── Count rejected records
   ├── Calculate transformation metrics
   └── Log summary

5. Return results
   └── Output transformed data + report
```

## Output

```json
{
  "transformed": [...],
  "rejected": [...],
  "report": {
    "totalRecords": 5420,
    "successful": 5380,
    "rejected": 40,
    "transformationRate": 99.26,
    "duration": 3.2,
    "timestamp": "2026-03-04T10:35:00Z"
  }
}
```

## Built-in Transforms

| Transform | Description | Example |
|-----------|-------------|---------|
| `parseFloat` | Convert to float | "12.34" → 12.34 |
| `parseInt` | Convert to integer | "42" → 42 |
| `toLowerCase` | Lowercase string | "HELLO" → "hello" |
| `toUpperCase` | Uppercase string | "hello" → "HELLO" |
| `trim` | Remove whitespace | " text " → "text" |
| `splitByComma` | Split CSV string | "a,b,c" → ["a","b","c"] |
| `toISO8601` | Convert to ISO date | Date object → "2026-03-04T10:30:00Z" |

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `INVALID_RULE` | Malformed transformation rule | Check rules syntax |
| `VALIDATION_FAILED` | Record doesn't match schema | Review validation rules |
| `TRANSFORM_ERROR` | Transformation function failed | Check input data format |
| `SCHEMA_MISMATCH` | Input doesn't match expected schema | Verify input structure |

## Related

- **Agent:** @data-processor
- **Script:** transform-helper.js
- **Previous:** extract-data-task.md
- **Next:** load-data-task.md
