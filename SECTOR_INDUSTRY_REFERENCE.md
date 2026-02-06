# Sector & Industry API Reference

This document provides reference information for using the Sector and Industry endpoints.

## Sector Endpoints

### Get Sector Data
```
GET /sector/{sector_key}
```

Returns comprehensive sector information including:
- Overview (companies count, market cap, description, market weight, employees)
- Top companies with ratings and market weights
- Industries within the sector
- Top ETFs and Mutual Funds

**Common Sector Keys:**
- `technology` - Technology sector (AAPL, MSFT, NVDA, etc.)
- `healthcare` - Healthcare sector
- `financial-services` - Financial services sector
- `consumer-cyclical` - Consumer cyclical sector
- `industrials` - Industrial sector
- `communication-services` - Communication services sector
- `energy` - Energy sector
- `basic-materials` - Basic materials sector
- `consumer-defensive` - Consumer defensive sector
- `real-estate` - Real estate sector
- `utilities` - Utilities sector

### Example Response:
```json
{
  "key": "technology",
  "name": "Technology",
  "symbol": "^YH311",
  "overview": {
    "companies_count": 831,
    "market_cap": 21560901500928,
    "description": "Companies engaged in the design, development...",
    "industries_count": 12,
    "market_weight": 0.2792906,
    "employee_count": 7810749
  },
  "top_companies": [
    {
      "name": "NVIDIA Corporation",
      "rating": "Strong Buy",
      "market weight": 0.19525105
    }
  ],
  "industries": [
    {
      "name": "Semiconductors",
      "symbol": "^YH31130020",
      "market weight": 0.35183218
    }
  ],
  "top_etfs": {
    "VGT": "Vanguard Information Tech ETF",
    "XLK": "State Street Technology Select"
  },
  "top_mutual_funds": {
    "VITAX": "Vanguard Information Technology"
  }
}
```

## Industry Endpoints

### Get Industry Data
```
GET /industry/{industry_key}
```

Returns comprehensive industry information including:
- Overview (companies count, market cap, description, market weight, employees)
- Sector association
- Top performing companies (by YTD return)
- Top growth companies (by growth estimate)

**Common Industry Keys:**
- `software-infrastructure` - Cloud, SaaS, infrastructure software
- `semiconductors` - Chip manufacturers
- `biotechnology` - Biotech companies
- `banks-regional` - Regional banking
- `oil-gas-exploration` - Oil & gas exploration
- `consumer-electronics` - Consumer electronics manufacturers
- `software-application` - Application software
- `semiconductor-equipment-materials` - Semiconductor equipment

### Example Response:
```json
{
  "key": "software-infrastructure",
  "name": "Software - Infrastructure",
  "symbol": "^YH31110030",
  "sector_key": "technology",
  "sector_name": "Technology",
  "overview": {
    "companies_count": 197,
    "market_cap": 4602794606592,
    "description": "Companies that develop, design, support...",
    "market_weight": 0.21347876,
    "employee_count": 817366
  },
  "top_performing_companies": [
    {
      "name": "Company Name",
      "ytd return": 32.2385,
      "last price": 172.84,
      "target price": 200.0
    }
  ],
  "top_growth_companies": [
    {
      "name": "Company Name",
      "ytd return": 0.004,
      "growth estimate": 5.5
    }
  ]
}
```

## Getting Sector/Industry from Ticker

You can get sector and industry information from any stock ticker:

```python
import yfinance as yf

msft = yf.Ticker('MSFT')
sector_key = msft.info.get('sectorKey')  # 'technology'
industry_key = msft.info.get('industryKey')  # 'software-infrastructure'
```

Then use these keys with the sector/industry endpoints.

## Frontend Usage

### Fetch Sector Data
```typescript
import { stockApi } from "@/api/endpoints/stocks";

const sectorData = await stockApi.getSector("technology");
```

### Fetch Industry Data
```typescript
const industryData = await stockApi.getIndustry("software-infrastructure");
```

## Caching

- Both endpoints cache data for **1 hour** (3600 seconds)
- Cached responses include `"cached": true` flag
- Cache is per sector/industry key

## Rate Limiting

- 30 requests per minute per endpoint
- Rate limits are per IP address
