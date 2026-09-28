using System;
using System.IO;
using Microsoft.Data.Sqlite;

namespace DemoApp.Graph.Planner;

/// <summary>
/// One SQLite file under the host's data directory, created with its schema the first time the planner opens.
/// </summary>
/// <remarks>
/// The store calls the driver synchronously on purpose: Microsoft.Data.Sqlite's async methods run synchronously anyway, and every
/// query here is a few rows out of a local file.
/// </remarks>
public sealed class PlannerDatabase
{
    private readonly string _connectionString;

    public PlannerDatabase(string dataDirectory)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(dataDirectory);

        _ = Directory.CreateDirectory(dataDirectory);

        Path = System.IO.Path.Combine(dataDirectory, "planner.db");
        _connectionString = new SqliteConnectionStringBuilder { DataSource = Path }.ToString();
    }

    /// <summary>Where the file is.</summary>
    public string Path { get; }

    public SqliteConnection Open()
    {
        SqliteConnection connection = new(_connectionString);
        connection.Open();

        return connection;
    }

    /// <summary>Creates every table that is missing; an existing file is left as it is.</summary>
    public void EnsureCreated()
    {
        using SqliteConnection connection = Open();
        using SqliteCommand command = connection.CreateCommand();

        // A row of a recipe or of a build may name no resource yet: it was added, and nothing was picked in it.
        command.CommandText = """
            PRAGMA journal_mode = WAL;

            CREATE TABLE IF NOT EXISTS resources (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                icon TEXT NOT NULL,
                color TEXT NULL,
                output INTEGER NOT NULL,
                seconds REAL NOT NULL,
                created_utc TEXT NOT NULL,
                image BLOB NULL,
                image_type TEXT NULL,
                image_hash TEXT NULL
            );

            CREATE TABLE IF NOT EXISTS ingredients (
                id TEXT PRIMARY KEY,
                resource_id TEXT NOT NULL,
                position INTEGER NOT NULL,
                ingredient_id TEXT NULL,
                amount INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS ingredients_by_resource ON ingredients (resource_id, position);

            CREATE TABLE IF NOT EXISTS builds (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                position INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS goals (
                id TEXT PRIMARY KEY,
                build_id TEXT NOT NULL,
                position INTEGER NOT NULL,
                resource_id TEXT NULL,
                amount REAL NOT NULL
            );

            CREATE INDEX IF NOT EXISTS goals_by_build ON goals (build_id, position);
            """;

        _ = command.ExecuteNonQuery();

        AddColumnIfMissing(connection, "resources", "image BLOB NULL");
        AddColumnIfMissing(connection, "resources", "image_type TEXT NULL");
        AddColumnIfMissing(connection, "resources", "image_hash TEXT NULL");
        AddColumnIfMissing(connection, "builds", "period TEXT NULL");
        AddColumnIfMissing(connection, "builds", "objective TEXT NULL");
        AddColumnIfMissing(connection, "builds", "bought TEXT NULL");
        AddColumnIfMissing(connection, "builds", "pinned INTEGER NOT NULL DEFAULT 0");
    }

    /// <summary>A column added after the table first shipped; a file created before it is brought along.</summary>
    [System.Diagnostics.CodeAnalysis.SuppressMessage("Security", "CA2100:Review SQL queries for security vulnerabilities", Justification = "Both parts are literals from the schema above.")]
    private static void AddColumnIfMissing(SqliteConnection connection, string table, string definition)
    {
        using SqliteCommand command = connection.CreateCommand();
        command.CommandText = $"ALTER TABLE {table} ADD COLUMN {definition}";

        try
        {
            _ = command.ExecuteNonQuery();
        }
        catch (SqliteException error) when (error.Message.Contains("duplicate column", StringComparison.OrdinalIgnoreCase))
        {
            // Already there: the table was created with it.
        }
    }

    /// <summary>A fresh key: one shape for every table.</summary>
    public static string NewId()
        => Guid.NewGuid().ToString("N");
}
