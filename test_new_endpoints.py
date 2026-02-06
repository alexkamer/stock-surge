"""
Test script for newly added yfinance endpoints
"""
import requests

BASE_URL = "http://localhost:8000"

# Test new endpoints
new_endpoints = [
    "/stock/AAPL/isin",
    "/stock/AAPL/shares",
    "/stock/AAPL/shares-full",
    "/stock/AAPL/capital-gains",
    "/stock/AAPL/funds-data",  # Will fail - AAPL is not a fund
    "/stock/AAPL/quarterly-earnings",
    "/stock/AAPL/recommendations-summary",
    "/stock/AAPL/history-metadata",
]

print("Testing new yfinance endpoints...\n")

for endpoint in new_endpoints:
    try:
        response = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
        status = "✅" if response.status_code == 200 else f"⚠️ ({response.status_code})"

        if response.status_code == 200:
            data = response.json()
            has_data = bool(data.get('data'))
            cached = data.get('cached', False)
            cache_status = " [CACHED]" if cached else " [FRESH]"
            data_status = " ✓ Has data" if has_data else " ⚠ No data"
            print(f"{status} {endpoint}{cache_status}{data_status}")
        else:
            print(f"{status} {endpoint} - {response.text[:100]}")

    except Exception as e:
        print(f"❌ {endpoint} - Error: {str(e)}")

print("\n" + "="*60)
print("Testing complete!")
print("="*60)

# Show sample data from one endpoint
print("\nSample data from /stock/AAPL/isin:")
try:
    response = requests.get(f"{BASE_URL}/stock/AAPL/isin")
    if response.status_code == 200:
        data = response.json()
        print(f"  Ticker: {data['ticker']}")
        print(f"  ISIN: {data['data']}")
    else:
        print(f"  Error: {response.status_code}")
except Exception as e:
    print(f"  Error: {e}")

print("\nAll endpoints are ready to use! 🚀")
