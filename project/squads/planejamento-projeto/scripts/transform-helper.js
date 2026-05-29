/**
 * Transform Helper - Data Transformation Utilities
 * Part of planejamento-projeto squad
 */

/**
 * Transform data according to rules
 */
class TransformHelper {
  /**
   * Apply transformations to a dataset
   */
  async transformDataset(data, rules) {
    const transformed = [];
    const rejected = [];

    for (const record of data) {
      try {
        const transformedRecord = this.transformRecord(record, rules);
        const validation = this.validateRecord(transformedRecord, rules);

        if (validation.valid) {
          transformed.push(transformedRecord);
        } else {
          rejected.push({
            original: record,
            errors: validation.errors
          });
        }
      } catch (error) {
        rejected.push({
          original: record,
          errors: [error.message]
        });
      }
    }

    return { transformed, rejected };
  }

  /**
   * Transform a single record
   */
  transformRecord(record, rules) {
    const transformed = {};

    for (const rule of rules.transformations) {
      const { field, type, transform, default: defaultValue } = rule;
      let value = record[field];

      // Apply default if missing
      if (value === undefined || value === null) {
        value = defaultValue;
      }

      // Apply transformation
      if (transform && value !== undefined) {
        value = this.applyTransform(value, transform);
      }

      // Type conversion
      if (type && value !== undefined) {
        value = this.convertType(value, type);
      }

      transformed[field] = value;
    }

    return transformed;
  }

  /**
   * Apply transformation function
   */
  applyTransform(value, transform) {
    const transforms = {
      parseFloat: (v) => parseFloat(v),
      parseInt: (v) => parseInt(v, 10),
      toLowerCase: (v) => String(v).toLowerCase(),
      toUpperCase: (v) => String(v).toUpperCase(),
      trim: (v) => String(v).trim(),
      splitByComma: (v) => String(v).split(',').map(s => s.trim()),
      toISO8601: (v) => new Date(v).toISOString()
    };

    if (typeof transform === 'string' && transforms[transform]) {
      return transforms[transform](value);
    } else if (typeof transform === 'function') {
      return transform(value);
    }

    return value;
  }

  /**
   * Convert value to specified type
   */
  convertType(value, type) {
    switch (type) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      case 'timestamp':
        return new Date(value).toISOString();
      case 'array':
        return Array.isArray(value) ? value : [value];
      default:
        return value;
    }
  }

  /**
   * Validate transformed record
   */
  validateRecord(record, rules) {
    const errors = [];

    for (const rule of rules.transformations) {
      const { field, required, validate } = rule;
      const value = record[field];

      // Check required
      if (required && (value === undefined || value === null)) {
        errors.push(`Required field missing: ${field}`);
        continue;
      }

      // Apply validation rules
      if (validate && value !== undefined) {
        const fieldErrors = this.validateField(value, validate, field);
        errors.push(...fieldErrors);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate field value
   */
  validateField(value, rules, fieldName) {
    const errors = [];

    if (rules.min !== undefined && value < rules.min) {
      errors.push(`${fieldName}: value ${value} is less than minimum ${rules.min}`);
    }

    if (rules.max !== undefined && value > rules.max) {
      errors.push(`${fieldName}: value ${value} exceeds maximum ${rules.max}`);
    }

    if (rules.pattern) {
      const regex = new RegExp(rules.pattern);
      if (!regex.test(value)) {
        errors.push(`${fieldName}: value doesn't match pattern ${rules.pattern}`);
      }
    }

    return errors;
  }

  /**
   * Generate transformation report
   */
  generateReport(total, successful, rejected, startTime) {
    return {
      totalRecords: total,
      successful,
      rejected: rejected.length,
      transformationRate: ((successful / total) * 100).toFixed(2),
      duration: (Date.now() - startTime) / 1000,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { TransformHelper };
