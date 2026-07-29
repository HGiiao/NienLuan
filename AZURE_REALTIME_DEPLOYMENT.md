# AZURE REALTIME DEPLOYMENT GUIDE

Mục tiêu: triển khai backend Vé247 lên Azure App Service với SignalR realtime, Azure SQL ổn định, CORS đúng và Background Service không bị ngủ.

## 1. Backend build + publish

```bash
cd D:/NienLuan/backend/FlightAggregatorApi
dotnet restore
dotnet build -c Release
dotnet publish -c Release -o ./publish
```

## 2. Azure App Service

### Tạo resource
```bash
az group create --name rg-ve247 --location southeastasia
az appservice plan create --name plan-ve247 --resource-group rg-ve247 --sku B1
az webapp create --name ve247-api --resource-group rg-ve247 --plan plan-ve247 --runtime "DOTNETCORE|10.0"
```

### Cấu hình Application Settings
- `ConnectionStrings:AzureSqlDb`: connection string Azure SQL
- `Cors:AllowedOrigins`: `http://localhost:5173` và domain frontend production
- Bật Always On: `az webapp config set --name ve247-api --resource-group rg-ve247 --always-on true`
- Disable ARR affinity nếu dùng nhiều instance: `az webapp config set --name ve247-api --resource-group rg-ve247 --client-affinity-enabled false`

## 3. Azure SQL

- Firewall: allow Azure services + IP publish máy local
- Database user có quyền DDL để chạy raw migration trong `Program.cs`
- `Encrypt=True` + `TrustServerCertificate=False` đã có trong connection string

```bash
az sql db create --resource-group rg-ve247 --server <server-name> --name ve247-db --service-objective S0
```

## 4. Deploy code

```bash
az webapp deployment source config-zip --name ve247-api --resource-group rg-ve247 --src ./publish.zip
```

## 5. SignalR + CORS checklist

- Backend đã map hub: `/hubs/prices`
- CORS chính xác từ `Cors:AllowedOrigins`
- Frontend dùng `VITE_API_URL` trỏ domain backend Azure

## 6. Health check + log

```bash
curl https://ve247-api.azurewebsites.net/health
az webapp log tail --name ve247-api --resource-group rg-ve247
```

## 7. Notes
- Giữ `Always On = true` để Background Service chạy ổn định
- Nếu cần scale ra nhiều instance, cân nhắc dùng Azure SignalR Service để đồng bộ broadcast
- Monitoring: kết nối Application Insights nếu cần theo dõi reconnect + lỗi realtime
