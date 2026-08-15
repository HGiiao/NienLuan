using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Models;

namespace FlightAggregatorApi.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<Flight> Flights => Set<Flight>();
    public DbSet<Train> Trains => Set<Train>();
    public DbSet<Bus> Buses => Set<Bus>();
    public DbSet<PriceHistory> PriceHistories => Set<PriceHistory>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<BookingSegment> BookingSegments => Set<BookingSegment>();
    public DbSet<PriceAlert> PriceAlerts => Set<PriceAlert>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<CommunityTip> CommunityTips => Set<CommunityTip>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<InsurancePackage> InsurancePackages => Set<InsurancePackage>();
    public DbSet<BookingInsurance> BookingInsurances => Set<BookingInsurance>();
    public DbSet<CorporateAccount> CorporateAccounts => Set<CorporateAccount>();
    public DbSet<CorporateEmployee> CorporateEmployees => Set<CorporateEmployee>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
    public DbSet<UserSubscription> UserSubscriptions => Set<UserSubscription>();
    public DbSet<Hotel> Hotels => Set<Hotel>();
    public DbSet<HotelBooking> HotelBookings => Set<HotelBooking>();
    public DbSet<PriceConfig> PriceConfigs => Set<PriceConfig>();
    public DbSet<PromoCode> PromoCodes => Set<PromoCode>();
    public DbSet<LuckyWheelSpin> LuckyWheelSpins => Set<LuckyWheelSpin>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Flight>(entity =>
        {
            entity.HasIndex(e => new { e.DepartureLocation, e.ArrivalLocation, e.FlightDate });
            entity.HasIndex(e => e.Price);
        });

        modelBuilder.Entity<Train>(entity =>
        {
            entity.HasIndex(e => new { e.DepartureLocation, e.ArrivalLocation, e.TrainDate });
            entity.HasIndex(e => e.Price);
        });

        modelBuilder.Entity<Bus>(entity =>
        {
            entity.HasIndex(e => new { e.DepartureLocation, e.ArrivalLocation, e.BusDate });
            entity.HasIndex(e => e.Price);
        });

        modelBuilder.Entity<PriceHistory>(entity =>
        {
            entity.HasIndex(e => new { e.RouteFrom, e.RouteTo, e.RecordedDate });
            entity.HasIndex(e => e.Price);
            entity.HasOne(e => e.Flight).WithMany().HasForeignKey(e => e.FlightId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Train).WithMany().HasForeignKey(e => e.TrainId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Bus).WithMany().HasForeignKey(e => e.BusId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(e => e.Email).IsUnique();
        });

        modelBuilder.Entity<BookingSegment>(entity =>
        {
            entity.HasIndex(e => e.BookingId);
            entity.HasOne(e => e.Booking).WithMany(b => b.Segments).HasForeignKey(e => e.BookingId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Booking>(entity =>
        {
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Status);
            entity.HasOne(e => e.User).WithMany(u => u.Bookings).HasForeignKey(e => e.UserId);
            entity.HasOne(e => e.Flight).WithMany(f => f.Bookings).HasForeignKey(e => e.FlightId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Train).WithMany(t => t.Bookings).HasForeignKey(e => e.TrainId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Bus).WithMany(b => b.Bookings).HasForeignKey(e => e.BusId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Review>(entity =>
        {
            entity.HasIndex(e => e.FlightId);
            entity.HasIndex(e => e.TrainId);
            entity.HasOne(e => e.Flight).WithMany().HasForeignKey(e => e.FlightId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Train).WithMany().HasForeignKey(e => e.TrainId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<CommunityTip>(entity =>
        {
            entity.HasIndex(e => new { e.RouteFrom, e.RouteTo });
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasIndex(e => e.Email);
            entity.HasIndex(e => new { e.Email, e.IsRead });
        });

        modelBuilder.Entity<LuckyWheelSpin>(entity =>
        {
            entity.HasIndex(e => e.Email);
            entity.HasIndex(e => new { e.Email, e.CreatedAt });
        });

        modelBuilder.Entity<BookingInsurance>(entity =>
        {
            entity.HasIndex(e => e.BookingId);
            entity.HasOne(e => e.Booking).WithMany().HasForeignKey(e => e.BookingId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Package).WithMany().HasForeignKey(e => e.PackageId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CorporateAccount>(entity =>
        {
            entity.HasIndex(e => e.TaxCode).IsUnique();
        });

        modelBuilder.Entity<CorporateEmployee>(entity =>
        {
            entity.HasIndex(e => e.CorporateAccountId);
            entity.HasOne(e => e.CorporateAccount).WithMany().HasForeignKey(e => e.CorporateAccountId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.HasIndex(e => e.CorporateAccountId);
            entity.HasOne(e => e.CorporateAccount).WithMany().HasForeignKey(e => e.CorporateAccountId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserSubscription>(entity =>
        {
            entity.HasIndex(e => e.UserId);
            entity.HasOne(e => e.Plan).WithMany().HasForeignKey(e => e.PlanId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Hotel>(entity =>
        {
            entity.HasIndex(e => e.Location);
        });

        modelBuilder.Entity<HotelBooking>(entity =>
        {
            entity.HasIndex(e => e.BookingId);
            entity.HasOne(e => e.Hotel).WithMany().HasForeignKey(e => e.HotelId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Booking).WithMany().HasForeignKey(e => e.BookingId).OnDelete(DeleteBehavior.SetNull);
        });
    }
}
