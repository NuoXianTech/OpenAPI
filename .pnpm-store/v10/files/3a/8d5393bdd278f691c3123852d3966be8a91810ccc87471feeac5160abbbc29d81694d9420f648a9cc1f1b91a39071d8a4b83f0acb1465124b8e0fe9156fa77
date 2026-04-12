export const CreateDatabaseMigrationsTableQuerySqlite = `CREATE TABLE IF NOT EXISTS _hub_migrations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);`;
export const CreateDatabaseMigrationsTableQueryPostgresql = `CREATE TABLE IF NOT EXISTS _hub_migrations (
  id         SERIAL PRIMARY KEY,
  name       TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);`;
export const CreateDatabaseMigrationsTableQueryMysql = `CREATE TABLE IF NOT EXISTS _hub_migrations (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);`;
export const CreateDatabaseMigrationsTableQueryLibsql = CreateDatabaseMigrationsTableQuerySqlite;
export const AppliedDatabaseMigrationsQuery = "select id, name, applied_at from _hub_migrations order by id";
export function getDatabaseSchemaPathMetadata(path) {
  let name = path.replace(/\.(ts|js|mjs)$/, "");
  const dialect = name.match(/\.(postgresql|sqlite|mysql)$/)?.[1];
  if (dialect) {
    name = name.replace(`.${dialect}`, "");
  }
  return { name, dialect, path };
}
export function getMigrationMetadata(filename) {
  let name = filename.replace(/\.sql$/, "");
  let dialect = name.match(/\.(postgresql|sqlite|mysql)$/)?.[1];
  if (dialect) {
    name = name.replace(`.${dialect}`, "");
  } else if (/^(?:postgresql|sqlite|mysql):/.test(filename)) {
    dialect = filename.split(":")[0];
    name = name.split(":")[1];
    filename = filename.replace(/:/g, "/");
  }
  return {
    filename,
    name,
    dialect
  };
}
export function getCreateMigrationsTableQuery(db) {
  const dialect = db.dialect;
  switch (dialect) {
    case "postgresql":
      return CreateDatabaseMigrationsTableQueryPostgresql;
    case "mysql":
      return CreateDatabaseMigrationsTableQueryMysql;
    case "sqlite":
      return CreateDatabaseMigrationsTableQuerySqlite;
    case "libsql":
      return CreateDatabaseMigrationsTableQueryLibsql;
    default:
      throw new Error("Invalid database dialect");
  }
}
export function splitSqlQueries(sqlFileContent) {
  const queries = [];
  let inString = false;
  let stringFence = "";
  let result = "";
  let currentGeneralWord = "";
  let previousGeneralWord = "";
  let inTrigger = false;
  let currentTriggerWord = "";
  let triggerBlockNestingLevel = 0;
  for (let i = 0; i < sqlFileContent.length; i += 1) {
    const char = sqlFileContent[i];
    const nextChar = sqlFileContent[i + 1];
    if (!char) continue;
    if ((char === "'" || char === '"') && (i === 0 || sqlFileContent[i - 1] !== "\\")) {
      if (!inString) {
        inString = true;
        stringFence = char;
      } else if (char === stringFence) {
        inString = false;
      }
    }
    if (!inString) {
      if (char === "-" && nextChar === "-") {
        while (i < sqlFileContent.length && sqlFileContent[i] !== "\n") {
          i += 1;
        }
        continue;
      }
      if (char === "/" && nextChar === "*") {
        i += 2;
        while (i < sqlFileContent.length && !(sqlFileContent[i] === "*" && sqlFileContent[i + 1] === "/")) {
          i += 1;
        }
        i += 2;
        continue;
      }
      if (/\w/.test(char)) {
        currentGeneralWord += char.toLowerCase();
      } else {
        if (previousGeneralWord === "create" && currentGeneralWord === "trigger") {
          inTrigger = true;
        }
        previousGeneralWord = currentGeneralWord;
        currentGeneralWord = "";
      }
      if (inTrigger) {
        if (/\w/.test(char)) {
          currentTriggerWord += char.toLowerCase();
        } else {
          if (currentTriggerWord === "begin") {
            triggerBlockNestingLevel++;
          } else if (currentTriggerWord === "end") {
            triggerBlockNestingLevel = Math.max(triggerBlockNestingLevel - 1, 0);
          }
          currentTriggerWord = "";
        }
      }
      if (char === ";" && sqlFileContent[i - 1] !== "\\") {
        if (inTrigger) {
          if (triggerBlockNestingLevel === 0) {
            result += char;
            const trimmedResult = result.trim();
            if (trimmedResult !== "") {
              queries.push(trimmedResult);
            }
            result = "";
            inTrigger = false;
            triggerBlockNestingLevel = 0;
            continue;
          } else {
            result += char;
          }
        } else {
          result += char;
          const trimmedResult = result.trim();
          if (trimmedResult !== "") {
            queries.push(trimmedResult);
          }
          result = "";
          continue;
        }
      }
    }
    result += char;
  }
  const finalTrimmed = result.trim();
  if (finalTrimmed !== "") {
    queries.push(finalTrimmed);
  }
  return queries.map((query) => {
    if (query.includes("TRIGGER") && query.includes("BEGIN")) {
      query = query.replace(/;+(?=\s+(?:END|\S|$))/g, ";");
    }
    return query.replace(/;+$/, ";");
  }).filter((query) => query !== ";" && query.trim() !== "");
}
