export declare const CreateDatabaseMigrationsTableQuerySqlite = "CREATE TABLE IF NOT EXISTS _hub_migrations (\n  id         INTEGER PRIMARY KEY AUTOINCREMENT,\n  name       TEXT UNIQUE,\n  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL\n);";
export declare const CreateDatabaseMigrationsTableQueryPostgresql = "CREATE TABLE IF NOT EXISTS _hub_migrations (\n  id         SERIAL PRIMARY KEY,\n  name       TEXT UNIQUE,\n  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL\n);";
export declare const CreateDatabaseMigrationsTableQueryMysql = "CREATE TABLE IF NOT EXISTS _hub_migrations (\n  id         INT AUTO_INCREMENT PRIMARY KEY,\n  name       VARCHAR(255) UNIQUE,\n  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL\n);";
export declare const CreateDatabaseMigrationsTableQueryLibsql = "CREATE TABLE IF NOT EXISTS _hub_migrations (\n  id         INTEGER PRIMARY KEY AUTOINCREMENT,\n  name       TEXT UNIQUE,\n  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL\n);";
export declare const AppliedDatabaseMigrationsQuery = "select id, name, applied_at from _hub_migrations order by id";
/**
 * Get the metadata for a database schema file
 * @param path - The path to the database file
 * @returns The name, dialect and path of the database file
 */
export declare function getDatabaseSchemaPathMetadata(path: string): {
    name: string;
    dialect: string | undefined;
    path: string;
};
/**
 * Extract the base migration name and dialtect from a filename
 * e.g., '0001_create-todos.postgresql.sql' -> '0001_create-todos'
 * e.g., '0001_create-todos.sql' -> '0001_create-todos'
 */
export declare function getMigrationMetadata(filename: string): {
    filename: string;
    name: string;
    dialect: string | undefined;
};
/**
 * Get the appropriate create table query for the migrations table based on the database dialect
 */
export declare function getCreateMigrationsTableQuery(db: {
    dialect: string;
}): string;
/**
 * Split a string containing SQL queries into an array of individual queries after removing comments
 */
export declare function splitSqlQueries(sqlFileContent: string): string[];
