using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text.Json;
using Microsoft.Data.Sqlite;

namespace DemoApp.Graph.Planner;

/// <summary>One row of a recipe or of a build: which resource, and how many. A row just added names none yet.</summary>
public sealed record AmountRecord(string Id, string? ResourceId, double Amount);

/// <summary>
/// A resource and the one recipe that makes it: a run gives <see cref="Output"/> of it in <see cref="Seconds"/>. No ingredients, no
/// recipe — it is brought in. <see cref="ImageHash"/> names the picture it wears over its glyph, when it has one.
/// </summary>
public sealed record ResourceRecord(string Id, string Name, string Icon, string? Color, int Output, double Seconds, IReadOnlyList<AmountRecord> Ingredients, string? ImageHash = null);

/// <summary>A resource's picture: its bytes and what they are.</summary>
public sealed record PictureRecord(byte[] Bytes, string ContentType);

/// <summary>
/// A named set of goals and how the plan over them is counted: the period the goals are amounts in, what the plan makes least of,
/// and the made resources it brings in rather than makes; a pinned build stands at the head of the strip.
/// </summary>
public sealed record BuildRecord(string Id, string Name, IReadOnlyList<AmountRecord> Goals, UIProductionPeriod Period = UIProductionPeriod.Minute, UIProductionObjective Objective = UIProductionObjective.LeastRaw, IReadOnlyList<string>? Bought = null, bool Pinned = false);

/// <summary>
/// The planner's resources, their recipes and the builds planned over them, in the database the host keeps beside it.
/// </summary>
public sealed class PlannerStore(PlannerDatabase database)
{
    public const int DefaultOutput = 1;
    public const double DefaultSeconds = 2;

    /// <summary>Every resource with its recipe, by name.</summary>
    public IReadOnlyList<ResourceRecord> ListResources()
    {
        using SqliteConnection connection = database.Open();
        Dictionary<string, List<AmountRecord>> ingredients = ReadAmounts(connection, "SELECT resource_id, id, ingredient_id, amount FROM ingredients ORDER BY resource_id, position");

        using SqliteCommand command = connection.CreateCommand();
        command.CommandText = "SELECT id, name, icon, color, output, seconds, image_hash FROM resources ORDER BY name COLLATE NOCASE, created_utc";

        List<ResourceRecord> result = [];

        using SqliteDataReader reader = command.ExecuteReader();

        while (reader.Read())
        {
            var id = reader.GetString(0);
            result.Add(new ResourceRecord(id, reader.GetString(1), reader.GetString(2), reader.IsDBNull(3) ? null : reader.GetString(3), reader.GetInt32(4), reader.GetDouble(5), ingredients.TryGetValue(id, out List<AmountRecord>? rows) ? rows : [], reader.IsDBNull(6) ? null : reader.GetString(6)));
        }

        return result;
    }

    /// <summary>The rows of every owner a query lists, grouped by it: the query's columns are the owner, the row, the resource and the amount.</summary>
    [System.Diagnostics.CodeAnalysis.SuppressMessage("Security", "CA2100:Review SQL queries for security vulnerabilities", Justification = "Both callers pass a literal.")]
    private static Dictionary<string, List<AmountRecord>> ReadAmounts(SqliteConnection connection, string query)
    {
        using SqliteCommand command = connection.CreateCommand();
        command.CommandText = query;

        Dictionary<string, List<AmountRecord>> result = new(StringComparer.Ordinal);

        using SqliteDataReader reader = command.ExecuteReader();

        while (reader.Read())
        {
            var owner = reader.GetString(0);

            if (!result.TryGetValue(owner, out List<AmountRecord>? rows))
                result[owner] = rows = [];

            rows.Add(new AmountRecord(reader.GetString(1), reader.IsDBNull(2) ? null : reader.GetString(2), reader.GetDouble(3)));
        }

        return result;
    }

    /// <summary>Every build with its goals: the pinned ones first, each part in the strip's order.</summary>
    public IReadOnlyList<BuildRecord> ListBuilds()
    {
        using SqliteConnection connection = database.Open();
        Dictionary<string, List<AmountRecord>> goals = ReadAmounts(connection, "SELECT build_id, id, resource_id, amount FROM goals ORDER BY build_id, position");

        using SqliteCommand command = connection.CreateCommand();
        command.CommandText = "SELECT id, name, period, objective, bought, pinned FROM builds ORDER BY pinned DESC, position";

        List<BuildRecord> result = [];

        using SqliteDataReader reader = command.ExecuteReader();

        while (reader.Read())
        {
            var id = reader.GetString(0);
            // A build written before the plan's settings were kept counts a minute and makes least of what is brought in, as the page did.
            UIProductionPeriod period = !reader.IsDBNull(2) && Enum.TryParse(reader.GetString(2), out UIProductionPeriod read) ? read : UIProductionPeriod.Minute;
            UIProductionObjective objective = !reader.IsDBNull(3) && Enum.TryParse(reader.GetString(3), out UIProductionObjective chosen) ? chosen : UIProductionObjective.LeastRaw;
            var bought = reader.IsDBNull(4) ? [] : JsonSerializer.Deserialize<string[]>(reader.GetString(4)) ?? [];

            result.Add(new BuildRecord(id, reader.GetString(1), goals.TryGetValue(id, out List<AmountRecord>? rows) ? rows : [], period, objective, bought, reader.GetInt64(5) != 0));
        }

        return result;
    }

    public string CreateResource(string name, string icon)
    {
        var id = PlannerDatabase.NewId();

        using SqliteConnection connection = database.Open();
        using SqliteCommand command = connection.CreateCommand();
        command.CommandText = "INSERT INTO resources (id, name, icon, color, output, seconds, created_utc) VALUES ($id, $name, $icon, NULL, $output, $seconds, $created)";
        _ = command.Parameters.AddWithValue("$id", id);
        _ = command.Parameters.AddWithValue("$name", name);
        _ = command.Parameters.AddWithValue("$icon", icon);
        _ = command.Parameters.AddWithValue("$output", DefaultOutput);
        _ = command.Parameters.AddWithValue("$seconds", DefaultSeconds);
        _ = command.Parameters.AddWithValue("$created", DateTime.UtcNow.ToString("O", CultureInfo.InvariantCulture));
        _ = command.ExecuteNonQuery();

        return id;
    }

    public void UpdateResource(string id, string name, string icon, string? color, int output, double seconds)
    {
        using SqliteConnection connection = database.Open();
        using SqliteCommand command = connection.CreateCommand();
        command.CommandText = "UPDATE resources SET name = $name, icon = $icon, color = $color, output = $output, seconds = $seconds WHERE id = $id";
        _ = command.Parameters.AddWithValue("$id", id);
        _ = command.Parameters.AddWithValue("$name", name);
        _ = command.Parameters.AddWithValue("$icon", icon);
        _ = command.Parameters.AddWithValue("$color", (object?)color ?? DBNull.Value);
        _ = command.Parameters.AddWithValue("$output", output);
        _ = command.Parameters.AddWithValue("$seconds", seconds);
        _ = command.ExecuteNonQuery();
    }

    /// <summary>The picture a resource wears, or none; the hash is what its address is keyed by, so a new picture is a new address.</summary>
    public void SetPicture(string id, PictureRecord? picture)
    {
        using SqliteConnection connection = database.Open();
        Execute(connection, "UPDATE resources SET image = $image, image_type = $type, image_hash = $hash WHERE id = $id", ("$id", id), ("$image", picture?.Bytes), ("$type", picture?.ContentType), ("$hash", picture is null ? null : PlannerPictures.Hash(picture.Bytes)));
    }

    /// <summary>A resource's picture, while its hash is still the one asked for: an old address answers nothing.</summary>
    public PictureRecord? ReadPicture(string id, string hash)
    {
        using SqliteConnection connection = database.Open();
        using SqliteCommand command = connection.CreateCommand();
        command.CommandText = "SELECT image, image_type FROM resources WHERE id = $id AND image_hash = $hash AND image IS NOT NULL";
        _ = command.Parameters.AddWithValue("$id", id);
        _ = command.Parameters.AddWithValue("$hash", hash);

        using SqliteDataReader reader = command.ExecuteReader();

        return reader.Read() ? new PictureRecord((byte[])reader[0], reader.GetString(1)) : null;
    }

    /// <summary>Every picture of the catalogue by resource, for a file that carries them.</summary>
    public Dictionary<string, PictureRecord> ReadPictures()
    {
        using SqliteConnection connection = database.Open();
        using SqliteCommand command = connection.CreateCommand();
        command.CommandText = "SELECT id, image, image_type FROM resources WHERE image IS NOT NULL";

        Dictionary<string, PictureRecord> pictures = new(StringComparer.Ordinal);

        using SqliteDataReader reader = command.ExecuteReader();

        while (reader.Read())
            pictures[reader.GetString(0)] = new PictureRecord((byte[])reader[1], reader.GetString(2));

        return pictures;
    }

    /// <summary>The recipe's ingredients replaced whole, in the order given.</summary>
    public void SetIngredients(string resourceId, IReadOnlyList<AmountRecord> ingredients)
    {
        ArgumentNullException.ThrowIfNull(ingredients);

        using SqliteConnection connection = database.Open();
        using SqliteTransaction transaction = connection.BeginTransaction();

        Execute(connection, "DELETE FROM ingredients WHERE resource_id = $owner", ("$owner", resourceId));

        for (var i = 0; i < ingredients.Count; i++)
        {
            AmountRecord row = ingredients[i];
            Execute(connection, "INSERT INTO ingredients (id, resource_id, position, ingredient_id, amount) VALUES ($id, $owner, $position, $resource, $amount)", ("$id", row.Id), ("$owner", resourceId), ("$position", i), ("$resource", row.ResourceId), ("$amount", (int)row.Amount));
        }

        transaction.Commit();
    }

    /// <summary>A resource gone, and with it its recipe, every recipe row that took it and every goal that asked for it.</summary>
    public void DeleteResource(string id)
    {
        using SqliteConnection connection = database.Open();
        using SqliteTransaction transaction = connection.BeginTransaction();

        Execute(connection, "DELETE FROM ingredients WHERE resource_id = $id OR ingredient_id = $id", ("$id", id));
        Execute(connection, "DELETE FROM goals WHERE resource_id = $id", ("$id", id));
        Execute(connection, "DELETE FROM resources WHERE id = $id", ("$id", id));

        transaction.Commit();
    }

    public string CreateBuild(string name)
    {
        var id = PlannerDatabase.NewId();

        using SqliteConnection connection = database.Open();
        Execute(connection, "INSERT INTO builds (id, name, position) VALUES ($id, $name, (SELECT COALESCE(MAX(position), -1) + 1 FROM builds))", ("$id", id), ("$name", name));

        return id;
    }

    public void RenameBuild(string id, string name)
    {
        using SqliteConnection connection = database.Open();
        Execute(connection, "UPDATE builds SET name = $name WHERE id = $id", ("$id", id), ("$name", name));
    }

    public void PinBuild(string id, bool pinned)
    {
        using SqliteConnection connection = database.Open();
        Execute(connection, "UPDATE builds SET pinned = $pinned WHERE id = $id", ("$id", id), ("$pinned", pinned ? 1 : 0));
    }

    /// <summary>The builds' positions rewritten in the order given; a build the list leaves out keeps its own.</summary>
    public void OrderBuilds(IReadOnlyList<string> ids)
    {
        ArgumentNullException.ThrowIfNull(ids);

        using SqliteConnection connection = database.Open();
        using SqliteTransaction transaction = connection.BeginTransaction();

        for (var i = 0; i < ids.Count; i++)
            Execute(connection, "UPDATE builds SET position = $position WHERE id = $id", ("$id", ids[i]), ("$position", i));

        transaction.Commit();
    }

    public void DeleteBuild(string id)
    {
        using SqliteConnection connection = database.Open();
        using SqliteTransaction transaction = connection.BeginTransaction();

        Execute(connection, "DELETE FROM goals WHERE build_id = $id", ("$id", id));
        Execute(connection, "DELETE FROM builds WHERE id = $id", ("$id", id));

        transaction.Commit();
    }

    /// <summary>The build's plan replaced whole: its goals in the order given, its period, what it makes least of and what it brings in.</summary>
    public void SetPlan(string buildId, IReadOnlyList<AmountRecord> goals, UIProductionPeriod period, UIProductionObjective objective, IReadOnlyList<string> bought)
    {
        ArgumentNullException.ThrowIfNull(goals);
        ArgumentNullException.ThrowIfNull(bought);

        using SqliteConnection connection = database.Open();
        using SqliteTransaction transaction = connection.BeginTransaction();

        Execute(connection, "UPDATE builds SET period = $period, objective = $objective, bought = $bought WHERE id = $id", ("$id", buildId), ("$period", period.ToString()), ("$objective", objective.ToString()), ("$bought", JsonSerializer.Serialize(bought)));
        Execute(connection, "DELETE FROM goals WHERE build_id = $owner", ("$owner", buildId));

        // Only while the build is there: one another tab deleted meanwhile would keep goals nothing lists.
        for (var i = 0; i < goals.Count; i++)
        {
            AmountRecord row = goals[i];
            Execute(connection, "INSERT INTO goals (id, build_id, position, resource_id, amount) SELECT $id, $owner, $position, $resource, $amount WHERE EXISTS (SELECT 1 FROM builds WHERE id = $owner)", ("$id", row.Id), ("$owner", buildId), ("$position", i), ("$resource", row.ResourceId), ("$amount", row.Amount));
        }

        transaction.Commit();
    }

    /// <summary>
    /// A file's catalogue taken in: in place of the whole catalogue, or merged into it by id — a resource of the file replaces the one of
    /// its id, recipe and all, and every other stays. Goals left asking for a resource that is gone go with it.
    /// </summary>
    public void ImportResources(IReadOnlyList<ResourceRecord> resources, IReadOnlyDictionary<string, PictureRecord> pictures, bool replace)
    {
        ArgumentNullException.ThrowIfNull(resources);
        ArgumentNullException.ThrowIfNull(pictures);

        using SqliteConnection connection = database.Open();
        using SqliteTransaction transaction = connection.BeginTransaction();

        if (replace)
        {
            Execute(connection, "DELETE FROM ingredients");
            Execute(connection, "DELETE FROM resources");
        }

        var created = DateTime.UtcNow.ToString("O", CultureInfo.InvariantCulture);

        foreach (ResourceRecord resource in resources)
        {
            Execute(connection, "DELETE FROM ingredients WHERE resource_id = $id", ("$id", resource.Id));
            PictureRecord? picture = pictures.GetValueOrDefault(resource.Id);
            Execute(connection, "INSERT INTO resources (id, name, icon, color, output, seconds, created_utc, image, image_type, image_hash) VALUES ($id, $name, $icon, $color, $output, $seconds, $created, $image, $type, $hash) ON CONFLICT (id) DO UPDATE SET name = $name, icon = $icon, color = $color, output = $output, seconds = $seconds, image = $image, image_type = $type, image_hash = $hash", ("$id", resource.Id), ("$name", resource.Name), ("$icon", resource.Icon), ("$color", resource.Color), ("$output", resource.Output), ("$seconds", resource.Seconds), ("$created", created), ("$image", picture?.Bytes), ("$type", picture?.ContentType), ("$hash", picture is null ? null : PlannerPictures.Hash(picture.Bytes)));

            for (var i = 0; i < resource.Ingredients.Count; i++)
            {
                AmountRecord row = resource.Ingredients[i];
                Execute(connection, "INSERT INTO ingredients (id, resource_id, position, ingredient_id, amount) VALUES ($id, $owner, $position, $resource, $amount)", ("$id", row.Id), ("$owner", resource.Id), ("$position", i), ("$resource", row.ResourceId), ("$amount", (int)row.Amount));
            }
        }

        Execute(connection, "DELETE FROM goals WHERE resource_id IS NOT NULL AND resource_id NOT IN (SELECT id FROM resources)");
        transaction.Commit();
    }

    /// <summary>
    /// A file's builds taken in, in place of all of them or merged by id; a goal naming a resource this catalogue lacks is left out.
    /// </summary>
    public void ImportBuilds(IReadOnlyList<BuildRecord> builds, bool replace)
    {
        ArgumentNullException.ThrowIfNull(builds);

        using SqliteConnection connection = database.Open();
        using SqliteTransaction transaction = connection.BeginTransaction();

        if (replace)
        {
            Execute(connection, "DELETE FROM goals");
            Execute(connection, "DELETE FROM builds");
        }

        foreach (BuildRecord build in builds)
        {
            Execute(connection, "DELETE FROM goals WHERE build_id = $id", ("$id", build.Id));
            Execute(connection, "INSERT INTO builds (id, name, position, period, objective, bought, pinned) VALUES ($id, $name, (SELECT COALESCE(MAX(position), -1) + 1 FROM builds), $period, $objective, $bought, $pinned) ON CONFLICT (id) DO UPDATE SET name = $name, period = $period, objective = $objective, bought = $bought, pinned = $pinned", ("$id", build.Id), ("$name", build.Name), ("$period", build.Period.ToString()), ("$objective", build.Objective.ToString()), ("$bought", JsonSerializer.Serialize(build.Bought ?? [])), ("$pinned", build.Pinned ? 1 : 0));

            for (var i = 0; i < build.Goals.Count; i++)
            {
                AmountRecord row = build.Goals[i];
                Execute(connection, "INSERT INTO goals (id, build_id, position, resource_id, amount) SELECT $id, $owner, $position, $resource, $amount WHERE EXISTS (SELECT 1 FROM resources WHERE id = $resource)", ("$id", row.Id), ("$owner", build.Id), ("$position", i), ("$resource", row.ResourceId), ("$amount", row.Amount));
            }
        }

        transaction.Commit();
    }

    [System.Diagnostics.CodeAnalysis.SuppressMessage("Security", "CA2100:Review SQL queries for security vulnerabilities", Justification = "Every caller passes a literal; the values go in as parameters.")]
    private static void Execute(SqliteConnection connection, string sql, params (string Name, object? Value)[] parameters)
    {
        using SqliteCommand command = connection.CreateCommand();
        command.CommandText = sql;

        foreach ((var name, var value) in parameters)
            _ = command.Parameters.AddWithValue(name, value ?? DBNull.Value);

        _ = command.ExecuteNonQuery();
    }
}
