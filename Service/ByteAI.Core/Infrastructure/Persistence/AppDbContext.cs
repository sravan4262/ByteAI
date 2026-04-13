using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Pgvector.EntityFrameworkCore;

namespace ByteAI.Core.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    // Core content
    public DbSet<User> Users => Set<User>();
    public DbSet<Byte> Bytes => Set<Byte>();
    public DbSet<Interview> Interviews => Set<Interview>();
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<InterviewComment> InterviewComments => Set<InterviewComment>();

    // Engagement — bytes schema
    public DbSet<UserLike> UserLikes => Set<UserLike>();
    public DbSet<UserBookmark> UserBookmarks => Set<UserBookmark>();
    public DbSet<UserView> UserViews => Set<UserView>();
    public DbSet<ByteTechStack> ByteTechStacks => Set<ByteTechStack>();
    public DbSet<ByteQualityScore> ByteQualityScores => Set<ByteQualityScore>();

    // Engagement — interviews schema
    public DbSet<InterviewLike> InterviewLikes => Set<InterviewLike>();
    public DbSet<InterviewBookmark> InterviewBookmarks => Set<InterviewBookmark>();
    public DbSet<InterviewView> InterviewViews => Set<InterviewView>();
    public DbSet<InterviewTechStack> InterviewTechStacks => Set<InterviewTechStack>();
    public DbSet<InterviewQuestion> InterviewQuestions => Set<InterviewQuestion>();
    public DbSet<InterviewQuestionComment> InterviewQuestionComments => Set<InterviewQuestionComment>();
    public DbSet<InterviewQuestionLike> InterviewQuestionLikes => Set<InterviewQuestionLike>();

    // Social graph
    public DbSet<Follow> Follows => Set<Follow>();

    // Lookup tables
    public DbSet<SeniorityType> SeniorityTypes => Set<SeniorityType>();
    public DbSet<Domain> Domains => Set<Domain>();
    public DbSet<TechStack> TechStacks => Set<TechStack>();
    public DbSet<BadgeType> BadgeTypes => Set<BadgeType>();
    public DbSet<LevelType> LevelTypes => Set<LevelType>();
    public DbSet<SearchType> SearchTypes => Set<SearchType>();
    public DbSet<NotificationType> NotificationTypes => Set<NotificationType>();

    // Junction tables — users schema
    public DbSet<UserTechStack> UserTechStacks => Set<UserTechStack>();
    public DbSet<UserFeedPreference> UserFeedPreferences => Set<UserFeedPreference>();

    // User meta
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<UserBadge> UserBadges => Set<UserBadge>();
    public DbSet<Draft> Drafts => Set<Draft>();
    public DbSet<Social> Socials => Set<Social>();

    // Observability / engagement
    public DbSet<TrendingEvent> TrendingEvents => Set<TrendingEvent>();
    public DbSet<AppLog> AppLogs => Set<AppLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("vector");
        modelBuilder.HasPostgresExtension("pg_trgm");

        // Apply all IEntityTypeConfiguration<T> classes in this assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
