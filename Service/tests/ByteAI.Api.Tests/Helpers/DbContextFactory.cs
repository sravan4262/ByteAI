using System.Text.Json;
using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using NpgsqlTypes;
using Pgvector;

namespace ByteAI.Api.Tests.Helpers;

/// <summary>
/// Creates a fresh AppDbContext backed by the EF Core InMemory provider.
/// Each test gets its own isolated database via a unique DB name.
///
/// A custom IModelCustomizer patches three CLR types that the InMemory provider
/// cannot handle natively:
///   • Pgvector.Vector  — stored as comma-separated float string
///   • NpgsqlTsVector   — stored as empty string (computed by Postgres; always null in tests)
///   • JsonDocument     — stored as raw JSON string
/// </summary>
public static class DbContextFactory
{
    public static AppDbContext Create()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ReplaceService<IModelCustomizer, InMemoryTestModelCustomizer>()
            .Options;

        return new AppDbContext(options);
    }
}

/// <summary>
/// Overrides the default model customizer to install InMemory-compatible value
/// converters for Npgsql/pgvector-specific property types.
///
/// Vector composition fix:
///   pgvector's TypeMappingSourcePlugin intercepts "vector(N)" column-type annotations
///   and registers a Vector→float[] converter.  During model finalisation the InMemory
///   provider tries to compose that with IEnumerable&lt;float&gt;→string and fails because
///   float[] and IEnumerable&lt;float&gt; are different CLR types in EF Core's type check.
///   Fix: remove the "Relational:ColumnType" annotation first, then install a direct
///   Vector→string converter.  The same technique is applied to NpgsqlTsVector and
///   to JsonDocument (which has no provider-level mapping at all in InMemory).
///
///   All converter lambdas are wrapped in private static methods to avoid CS0854
///   (optional-argument calls are forbidden inside expression trees).
/// </summary>
internal sealed class InMemoryTestModelCustomizer(ModelCustomizerDependencies dependencies)
    : ModelCustomizer(dependencies)
{
    private const string ColumnTypeKey = "Relational:ColumnType";

    public override void Customize(ModelBuilder modelBuilder, DbContext context)
    {
        base.Customize(modelBuilder, context);

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var prop in entityType.GetProperties().ToList())
            {
                var mutable = (IMutableProperty)prop;

                if (prop.ClrType == typeof(Vector))
                {
                    mutable.SetOrRemoveAnnotation(ColumnTypeKey, null);
                    mutable.SetValueConverter(new ValueConverter<Vector, string>(
                        v => VectorToString(v),
                        s => StringToVector(s)));
                }
                else if (prop.ClrType == typeof(NpgsqlTsVector))
                {
                    mutable.SetOrRemoveAnnotation(ColumnTypeKey, null);
                    mutable.SetValueConverter(new ValueConverter<NpgsqlTsVector, string>(
                        v => TsVectorToString(v),
                        s => StringToTsVector(s)));
                }
                else if (prop.ClrType == typeof(JsonDocument))
                {
                    mutable.SetOrRemoveAnnotation(ColumnTypeKey, null);
                    mutable.SetValueConverter(new ValueConverter<JsonDocument, string>(
                        v => JsonDocToString(v),
                        s => StringToJsonDoc(s)));
                }
            }
        }
    }

    // ── Vector ─────────────────────────────────────────────────────────────────

    private static string VectorToString(Vector v) =>
        string.Join(",", v.ToArray());

    private static Vector StringToVector(string s) =>
        new(s.Split(',').Select(p => float.Parse(p, System.Globalization.CultureInfo.InvariantCulture)).ToArray());

    // ── NpgsqlTsVector (computed by Postgres; always null in tests) ────────────

    private static string TsVectorToString(NpgsqlTsVector v) =>
        v?.ToString() ?? string.Empty;

    private static NpgsqlTsVector StringToTsVector(string _) => default!;

    // ── JsonDocument (stored as raw JSON string) ───────────────────────────────

    private static string JsonDocToString(JsonDocument v) =>
        v?.RootElement.GetRawText() ?? "null";

    private static JsonDocument StringToJsonDoc(string s) =>
        JsonDocument.Parse(string.IsNullOrEmpty(s) ? "null" : s);
}
