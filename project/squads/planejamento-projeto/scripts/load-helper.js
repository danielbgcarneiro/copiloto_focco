/**
 * Load Helper - Data Loading Utilities
 * Part of planejamento-projeto squad
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const Papa = require('papaparse');
const axios = require('axios');

/**
 * Load data to various targets
 */
class LoadHelper {
  /**
   * Load to database with transaction support
   */
  async loadToDatabase(data, config) {
    const { connection, table, primaryKey, mode = 'insert', batchSize = 1000 } = config;
    const pool = new Pool({ connectionString: connection });
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      let loaded = 0;
      const failed = [];

      // Process in batches
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);

        try {
          if (mode === 'replace' && i === 0) {
            await client.query(`TRUNCATE TABLE ${table}`);
          }

          for (const record of batch) {
            try {
              if (mode === 'upsert') {
                await this.upsertRecord(client, table, record, primaryKey);
              } else {
                await this.insertRecord(client, table, record);
              }
              loaded++;
            } catch (error) {
              failed.push({ record, error: error.message });
            }
          }
        } catch (error) {
          failed.push({ batch, error: error.message });
        }
      }

      await client.query('COMMIT');

      return {
        success: true,
        loaded,
        failed: failed.length,
        failedRecords: failed
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
  }

  /**
   * Insert a single record
   */
  async insertRecord(client, table, record) {
    const keys = Object.keys(record);
    const values = Object.values(record);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
      INSERT INTO ${table} (${keys.join(', ')})
      VALUES (${placeholders})
    `;

    await client.query(query, values);
  }

  /**
   * Upsert a single record
   */
  async upsertRecord(client, table, record, primaryKey) {
    const keys = Object.keys(record);
    const values = Object.values(record);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const updates = keys
      .filter(k => k !== primaryKey)
      .map(k => `${k} = EXCLUDED.${k}`)
      .join(', ');

    const query = `
      INSERT INTO ${table} (${keys.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT (${primaryKey}) DO UPDATE SET ${updates}
    `;

    await client.query(query, values);
  }

  /**
   * Load to CSV file
   */
  async loadToFile(data, config) {
    const { path, format = 'csv', delimiter = ',', headers = true } = config;

    if (format === 'csv') {
      const csv = Papa.unparse(data, {
        delimiter,
        header: headers
      });

      await fs.writeFile(path, csv, 'utf-8');

      return {
        success: true,
        loaded: data.length,
        path
      };
    } else if (format === 'json') {
      await fs.writeFile(path, JSON.stringify(data, null, 2), 'utf-8');

      return {
        success: true,
        loaded: data.length,
        path
      };
    } else {
      throw new Error(`Unsupported file format: ${format}`);
    }
  }

  /**
   * Load to REST API
   */
  async loadToAPI(data, config) {
    const { endpoint, method = 'POST', headers = {}, batchEndpoint, batchSize = 100 } = config;

    let loaded = 0;
    const failed = [];

    // Use batch endpoint if available
    if (batchEndpoint) {
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);

        try {
          await axios({
            method,
            url: batchEndpoint,
            headers,
            data: { records: batch }
          });
          loaded += batch.length;
        } catch (error) {
          failed.push({ batch, error: error.message });
        }
      }
    } else {
      // Send one by one
      for (const record of data) {
        try {
          await axios({
            method,
            url: endpoint,
            headers,
            data: record
          });
          loaded++;
        } catch (error) {
          failed.push({ record, error: error.message });
        }
      }
    }

    return {
      success: failed.length === 0,
      loaded,
      failed: failed.length,
      failedRecords: failed
    };
  }

  /**
   * Generate load report
   */
  generateReport(result, target, mode, batchSize, startTime) {
    return {
      success: result.success,
      loaded: result.loaded,
      failed: result.failed || 0,
      duration: (Date.now() - startTime) / 1000,
      report: {
        target,
        mode,
        batchSize,
        batches: Math.ceil(result.loaded / batchSize),
        timestamp: new Date().toISOString()
      },
      failedRecords: result.failedRecords || []
    };
  }
}

module.exports = { LoadHelper };
