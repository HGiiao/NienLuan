using System.Text.Json;
using System.Text.Json.Serialization;

namespace FlightAggregatorApi.Services;

/// <summary>
/// EF Core đọc cột datetime2 từ SQL Server với Kind = Unspecified, khiến System.Text.Json
/// serialize KHÔNG kèm 'Z'/offset (vd: "2026-08-15T17:34:30.4" thay vì "...Z").
/// Trình duyệt (JS `new Date(...)`) parse chuỗi không offset thành giờ LOCAL → đếm ngược
/// reset, thời gian hiển thị bị lệch/âm. Converter này chuẩn hoá mọi DateTime về UTC
/// (luôn kèm 'Z') khi serialize — áp dụng toàn cục cho mọi API.
/// </summary>
public class UtcDateTimeConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => reader.GetDateTime();

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        var utc = value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            // Unspecified — dữ liệu đọc từ DB đã lưu theo UTC → coi là UTC
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        };
        writer.WriteStringValue(utc);
    }
}
