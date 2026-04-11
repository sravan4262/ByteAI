using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class InterviewTechStackConfiguration : IEntityTypeConfiguration<InterviewTechStack>
{
    public void Configure(EntityTypeBuilder<InterviewTechStack> builder)
    {
        builder.ToTable("interview_tech_stacks", "interviews");
        builder.HasKey(i => new { i.InterviewId, i.TechStackId });
        builder.Property(i => i.InterviewId).HasColumnName("interview_id");
        builder.Property(i => i.TechStackId).HasColumnName("tech_stack_id");

        builder.HasOne(i => i.Interview).WithMany(iv => iv.InterviewTechStacks)
            .HasForeignKey(i => i.InterviewId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(i => i.TechStack).WithMany(t => t.InterviewTechStacks)
            .HasForeignKey(i => i.TechStackId).OnDelete(DeleteBehavior.Cascade);
    }
}
