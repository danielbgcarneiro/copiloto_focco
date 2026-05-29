# Source Tree - planejamento-projeto Squad

## Squad Directory Structure

```
squads/planejamento-projeto/
├── squad.yaml                    # Squad manifest
├── README.md                     # Squad documentation
│
├── config/                       # Configuration files
│   ├── coding-standards.md       # ETL-specific coding standards
│   ├── tech-stack.md            # Technology stack
│   └── source-tree.md           # This file
│
├── agents/                       # Agent definitions
│   ├── etl-coordinator.md       # Orchestrates ETL pipeline
│   └── data-processor.md        # Processes data transformations
│
├── tasks/                        # Task workflows
│   ├── extract-data-task.md     # Data extraction task
│   ├── transform-data-task.md   # Data transformation task
│   └── load-data-task.md        # Data loading task
│
├── workflows/                    # Multi-step workflows
│   └── (future workflows)
│
├── checklists/                   # Validation checklists
│   └── (future checklists)
│
├── templates/                    # Document templates
│   └── (future templates)
│
├── tools/                        # Custom tools
│   └── (future tools)
│
├── scripts/                      # Utility scripts
│   ├── extract-helper.js        # Extraction utilities
│   ├── transform-helper.js      # Transformation utilities
│   └── load-helper.js           # Loading utilities
│
└── data/                         # Static data/fixtures
    └── (test fixtures, sample data)
```

## Integration with Project

This squad integrates with the main AIOS project structure:

```
project-root/
├── .aios-core/                   # AIOS framework (never modify)
├── squads/
│   └── planejamento-projeto/    # This squad
├── docs/
│   ├── stories/                 # Development stories
│   └── prd/                     # Product requirements
└── (other project files)
```

## File Naming Conventions

- **Agents:** `{agent-name}.md` (kebab-case)
- **Tasks:** `{task-name}-task.md`
- **Scripts:** `{purpose}-helper.js`
- **Workflows:** `{workflow-name}.md`
- **Configs:** `{config-type}.md`

## Usage Patterns

### Activating Squad Agents
```bash
@etl-coordinator *help
@data-processor *help
```

### Running Tasks
```bash
@etl-coordinator *extract-data
@data-processor *transform-data
```

### Using Helper Scripts
```javascript
const { extractHelper } = require('./squads/planejamento-projeto/scripts/extract-helper.js');
```

---
*Part of planejamento-projeto squad*
