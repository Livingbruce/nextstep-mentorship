import pool from '../db/pool.js';

class PerformanceMonitor {
  constructor() {
    this.queryStats = new Map();
    this.slowQueryThreshold = 1000; // 1 second
  }

  // Monitor query performance
  async monitorQuery(queryName, queryFunction) {
    const startTime = Date.now();
    
    try {
      const result = await queryFunction();
      const executionTime = Date.now() - startTime;
      
      // Log slow queries
      if (executionTime > this.slowQueryThreshold) {
        console.warn(`🐌 Slow query detected: ${queryName} took ${executionTime}ms`);
      }
      
      // Update statistics
      this.updateQueryStats(queryName, executionTime, true);
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.updateQueryStats(queryName, executionTime, false);
      throw error;
    }
  }

  // Update query statistics
  updateQueryStats(queryName, executionTime, success) {
    if (!this.queryStats.has(queryName)) {
      this.queryStats.set(queryName, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        maxTime: 0,
        minTime: Infinity,
        successCount: 0,
        errorCount: 0
      });
    }

    const stats = this.queryStats.get(queryName);
    stats.count++;
    stats.totalTime += executionTime;
    stats.avgTime = stats.totalTime / stats.count;
    stats.maxTime = Math.max(stats.maxTime, executionTime);
    stats.minTime = Math.min(stats.minTime, executionTime);
    
    if (success) {
      stats.successCount++;
    } else {
      stats.errorCount++;
    }
  }

  // Get performance report
  getPerformanceReport() {
    const report = {
      totalQueries: 0,
      averageExecutionTime: 0,
      slowQueries: [],
      topQueries: [],
      errorRate: 0
    };

    let totalTime = 0;
    let totalErrors = 0;

    for (const [queryName, stats] of this.queryStats) {
      report.totalQueries += stats.count;
      totalTime += stats.totalTime;
      totalErrors += stats.errorCount;

      if (stats.avgTime > this.slowQueryThreshold) {
        report.slowQueries.push({
          query: queryName,
          avgTime: stats.avgTime,
          count: stats.count
        });
      }

      report.topQueries.push({
        query: queryName,
        count: stats.count,
        avgTime: stats.avgTime,
        maxTime: stats.maxTime,
        errorRate: (stats.errorCount / stats.count) * 100
      });
    }

    report.averageExecutionTime = totalTime / report.totalQueries;
    report.errorRate = (totalErrors / report.totalQueries) * 100;
    report.topQueries.sort((a, b) => b.count - a.count);

    return report;
  }

  // Check database health
  async checkDatabaseHealth() {
    try {
      const startTime = Date.now();
      
      // Test basic connectivity
      await pool.query('SELECT 1');
      const connectionTime = Date.now() - startTime;
      
      // Get database size
      const sizeResult = await pool.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);
      
      // Get table statistics
      const tableStats = await pool.query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
        LIMIT 10
      `);
      
      // Get index usage
      const indexStats = await pool.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan as scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_fetched
        FROM pg_stat_user_indexes
        WHERE idx_scan > 0
        ORDER BY idx_scan DESC
        LIMIT 10
      `);

      return {
        status: 'healthy',
        connectionTime,
        databaseSize: sizeResult.rows[0].size,
        tableStats: tableStats.rows,
        indexStats: indexStats.rows,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get connection pool status
  getConnectionPoolStatus() {
    return {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    };
  }

  // Log performance report
  logPerformanceReport() {
    const report = this.getPerformanceReport();
    
    console.log('\n📊 Performance Report:');
    console.log(`Total Queries: ${report.totalQueries}`);
    console.log(`Average Execution Time: ${report.averageExecutionTime.toFixed(2)}ms`);
    console.log(`Error Rate: ${report.errorRate.toFixed(2)}%`);
    
    if (report.slowQueries.length > 0) {
      console.log('\n🐌 Slow Queries:');
      report.slowQueries.forEach(query => {
        console.log(`  ${query.query}: ${query.avgTime.toFixed(2)}ms (${query.count} times)`);
      });
    }
    
    console.log('\n📈 Top Queries:');
    report.topQueries.slice(0, 5).forEach(query => {
      console.log(`  ${query.query}: ${query.count} times, avg: ${query.avgTime.toFixed(2)}ms`);
    });
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;
