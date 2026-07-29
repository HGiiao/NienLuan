# Deployment Guide

## Prerequisites

- .NET SDK 10.0+
- Node.js 18+
- Azure CLI
- SQL Server Management Studio or `sqlcmd`

## Backend (Azure App Service)

```bash
cd backend/FlightAggregatorApi
dotnet publish -c Release -o ./publish

az group create --name flightAggregatorRG --location southeastasia
az appservice plan create --name flightPlan --sku B1 --resource-group flightAggregatorRG
az webapp create --name myFlightApi --plan flightPlan --resource-group flightAggregatorRG --runtime "DOTNET|10.0"
az webapp config connection-string set --name myFlightApi --resource-group flightAggregatorRG \
  --settings AzureSqlDb="Server=tcp:YOUR_SERVER.database.windows.net,1433;Database=YOUR_DB;..."
az webapp cors add --name myFlightApi --resource-group flightAggregatorRG --allowed-origins "https://myflightapp.azureedge.net"
az webapp deploy --resource-group flightAggregatorRG --name myFlightApi --src-path ./publish --type zip
```

## Frontend (Azure Static Web Apps)

```bash
cd frontend
npm run build

az staticwebapp create --name myFlightApp --resource-group flightAggregatorRG \
  --source ./dist --location southeastasia
```

## Database

```bash
sqlcmd -S YOUR_SERVER.database.windows.net -U admin -P password -d YOUR_DB -i database/schema.sql
sqlcmd -S YOUR_SERVER.database.windows.net -U admin -P password -d YOUR_DB -i database/seed-data.sql
```

