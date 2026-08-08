# API Endpoints — Vé247

Base URL: `http://localhost:5000/api`

## Flights

| Method | Path | Params | Description |
|--------|------|--------|-------------|
| GET | /api/flights | from, to, date, tripType, returnDate, sortBy, page, pageSize | Search flights |
| GET | /api/flights/{id} | - | Get flight detail |

## Trains

| Method | Path | Params | Description |
|--------|------|--------|-------------|
| GET | /api/trains | from, to, date, tripType, returnDate, sortBy, page, pageSize | Search trains |
| GET | /api/trains/{id} | - | Get train detail |

## Prices

| Method | Path | Params | Description |
|--------|------|--------|-------------|
| GET | /api/prices/trends | from, to, days | Price trend data |
| GET | /api/prices/compare | from, to, date, tripType, returnDate | Compare flights vs trains |
| POST | /api/prices/optimal-route | Body: originCity, destinationCity, startDate, endDate, preferences | Multi-leg route planner (máy bay/tàu hỏa/xe khách, 2-3 chặng, segment `type` = flight/train/bus) |

## Bookings

| Method | Path | Body/Params | Description |
|--------|------|-------------|-------------|
| GET | /api/bookings | email, userId, page, pageSize | List bookings |
| GET | /api/bookings/{id} | - | Get booking detail |
| POST | /api/bookings | email, fullName, phone, address, paymentMethod, flightId/trainId, passengers | Create booking |
| POST | /api/bookings/{id}/pay | - | Process payment (sandbox) |
| PATCH | /api/bookings/{id}/cancel | - | Cancel booking |

## Auth

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | email, password, fullName, phone | Register (sends OTP) |
| POST | /api/auth/verify-email | email, code | Verify OTP |
| POST | /api/auth/login | email, password | Login |
| POST | /api/auth/clerk-sync | email, fullName, phone | Sync Clerk user |
| GET | /api/auth/profile | email | Get profile |
| PUT | /api/auth/profile | email, fullName, phone | Update profile |

## Price Alerts

| Method | Path | Body/Params | Description |
|--------|------|-------------|-------------|
| POST | /api/price-alerts | email, routeFrom, routeTo, targetPrice | Create alert |
| GET | /api/price-alerts | email | List alerts |
| DELETE | /api/price-alerts/{id} | - | Delete alert |
| PATCH | /api/price-alerts/{id}/toggle | - | Toggle active |
| POST | /api/price-alerts/check | email | Check & notify |

## Locations

| Method | Path | Params | Description |
|--------|------|--------|-------------|
| GET | /api/locations/search | q | Search airport/city codes |

## Payments

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/payments/vnpay-return | VNPay return handler |
| GET | /api/payments/vnpay-ipn | VNPay IPN callback |

## Admin (require X-Admin-Email header)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/dashboard | Dashboard summary |
| GET | /api/admin/stats?period=30 | Detailed analytics |
| GET | /api/admin/users | List users (search, role) |
| DELETE | /api/admin/users/{id} | Delete user |
| GET | /api/admin/bookings | List bookings (search, status, dateFrom, dateTo) |
| GET | /api/admin/flights | List flights (search, airline, dateFrom, dateTo) |
| POST | /api/admin/flights | Create flight |
| PUT | /api/admin/flights/{id} | Update flight |
| DELETE | /api/admin/flights/{id} | Delete flight |
| GET | /api/admin/trains | List trains (search, dateFrom, dateTo) |
| POST | /api/admin/trains | Create train |
| PUT | /api/admin/trains/{id} | Update train |
| DELETE | /api/admin/trains/{id} | Delete train |

## Other

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check (200 OK) |

### Example: Search flights

```bash
curl "http://localhost:5000/api/flights?from=HAN&to=SGN&date=2026-08-01&sortBy=price"
```

### Example: Get optimal route

```bash
curl -X POST "http://localhost:5000/api/prices/optimal-route" \
  -H "Content-Type: application/json" \
  -d '{"originCity":"HAN","destinationCity":"SGN","startDate":"2026-08-01","endDate":"2026-08-05","preferences":"cheapest"}'
```

### Example: Health check

```bash
curl "http://localhost:5000/health"
```
