/**
 * Extract Helper - Data Extraction Utilities
 * Part of planejamento-projeto squad
 */

const axios = require('axios');
const { Pool } = require('pg');
const fs = require('fs').promises;
const Papa = require('papaparse');

/**
 * Extract data from various sources
 */
class ExtractHelper {
  /**
   * Extract from REST API with pagination
   */
  async extractFromAPI(config) {
    const { endpoint, headers = {}, pagination = {} } = config;
    const allData = [];
    let hasMore = true;
    let offset = 0;

    while (hasMore) {
      const params = {
        limit: pagination.limit || 1000,
        offset: offset
      };

      const response = await axios.get(endpoint, {
        headers,
        params
      });

      allData.push(...response.data.results || response.data);

      hasMore = response.data.hasMore || (response.data.results && response.data.results.length === pagination.limit);
      offset += pagination.limit || 1000;
    }

    return allData;
  }

  /**
   * Extract from database with batching
   */
  async extractFromDatabase(config) {
    const { connection, query, incremental_field, last_value, batch_size = 1000 } = config;
    const pool = new Pool({ connectionString: connection });

    try {
      let allData = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const params = incremental_field && last_value ? [last_value, batch_size, offset] : [batch_size, offset];
        const batchQuery = incremental_field
          ? `${query} LIMIT $2 OFFSET $3`
          : `${query} LIMIT $1 OFFSET $2`;

        const result = await pool.query(batchQuery, params);
        allData.push(...result.rows);

        hasMore = result.rows.length === batch_size;
        offset += batch_size;
      }

      return allData;
    } finally {
      await pool.end();
    }
  }

  /**
   * Extract from CSV file
   */
  async extractFromFile(config) {
    const { path, format, delimiter = ',', encoding = 'utf-8' } = config;

    if (format === 'csv') {
      const fileContent = await fs.readFile(path, encoding);

      return new Promise((resolve, reject) => {
        Papa.parse(fileContent, {
          header: true,
          delimiter,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: (error) => reject(error)
        });
      });
    } else if (format === 'json') {
      const fileContent = await fs.readFile(path, encoding);
      return JSON.parse(fileContent);
    } else {
      throw new Error(`Unsupported file format: ${format}`);
    }
  }

  /**
   * Validate extracted data
   */
  validateData(data, schema = {}) {
    const warnings = [];
    const errors = [];

    if (!Array.isArray(data)) {
      errors.push('Data must be an array');
      return { valid: false, warnings, errors };
    }

    if (data.length === 0) {
      warnings.push('Extracted data is empty');
    }

    // Basic schema validation
    if (schema.required_fields) {
      const sample = data[0] || {};
      schema.required_fields.forEach(field => {
        if (!(field in sample)) {
          errors.push(`Required field missing: ${field}`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Generate extraction metadata
   */
  generateMetadata(data, source, mode, startTime) {
    return {
      extractedAt: new Date().toISOString(),
      recordCount: data.length,
      source,
      mode,
      duration: (Date.now() - startTime) / 1000
    };
  }
}

module.exports = { ExtractHelper };
