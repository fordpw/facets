import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

let pool: Pool;

const dbConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'healthcare_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'healthcare123!',
  max: parseInt(process.env.DB_POOL_SIZE || '20'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

export async function connectDatabase(): Promise<void> {
  try {
    pool = new Pool(dbConfig);
    
    // Test connection
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    
    logger.info('Database connection established successfully');
    logger.info(`Connected to: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`);
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

export function getDatabase(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return pool;
}

export async function closeDatabaseConnection(): Promise<void> {
  if (pool) {
    await pool.end();
    logger.info('Database connection closed');
  }
}

// Helper function for transactions
export async function withTransaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Helper function for parameterized queries
export async function query(text: string, params?: any[]): Promise<any> {
  const start = Date.now();
  
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      logger.warn(`Slow query detected (${duration}ms): ${text.substring(0, 100)}...`);
    }
    
    return result;
  } catch (error) {
    logger.error('Database query error:', {
      query: text.substring(0, 100),
      params: params?.map(p => typeof p === 'string' && p.length > 100 ? p.substring(0, 100) + '...' : p),
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

// Health check function
export async function checkDatabaseHealth(): Promise<{
  status: string;
  connections: number;
  responseTime: number;
}> {
  const start = Date.now();
  
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as active_connections,
        NOW() as current_time
      FROM pg_stat_activity 
      WHERE state = 'active'
    `);
    
    const responseTime = Date.now() - start;
    
    return {
      status: 'healthy',
      connections: parseInt(result.rows[0].active_connections),
      responseTime
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      connections: 0,
      responseTime: Date.now() - start
    };
  }
}