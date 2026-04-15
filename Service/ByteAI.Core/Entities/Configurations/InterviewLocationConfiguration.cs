using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class InterviewLocationConfiguration : IEntityTypeConfiguration<InterviewLocation>
{
    public void Configure(EntityTypeBuilder<InterviewLocation> builder)
    {
        builder.ToTable("interview_locations", "interviews");
        builder.HasKey(il => new { il.InterviewId, il.LocationId });
        builder.Property(il => il.InterviewId).HasColumnName("interview_id");
        builder.Property(il => il.LocationId).HasColumnName("location_id");

        builder.HasOne(il => il.Interview)
            .WithMany(i => i.Locations)
            .HasForeignKey(il => il.InterviewId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(il => il.Location)
            .WithMany()
            .HasForeignKey(il => il.LocationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(il => il.LocationId).HasDatabaseName("ix_interview_locations_location_id");
    }
}
