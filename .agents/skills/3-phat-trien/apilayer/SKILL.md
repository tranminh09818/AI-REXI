---
name: apilayer
description: Unified API marketplace with 40+ production-ready APIs for finance, geolocation, weather, data, and AI. Use when integrating currency conversion, IP geolocation, email validation, phone number lookup, or language detection.
---

# APILayer

APILayer is a unified API marketplace providing 40+ production-ready REST APIs through a single account and single API key. Trusted by 2.2M+ developers.

## Available APIs

### Finance
- **currencylayer**: Real-time and historical exchange rates
- **fixer.io**: Foreign exchange rates (JSON)
- **exchangeratesapi.io**: Exchange rate API
- **marketstack**: Real-time stock market data

### Geolocation
- **ipstack**: IP to geolocation (country, city, lat/lon, ISP, timezone)
- **ip_to_location**: IP address location lookup

### Data Validation
- **mailboxlayer**: Email address validation and verification
- **numverify**: Phone number validation and lookup
- **vatlayer**: EU VAT number validation

### Content & AI
- **languagelayer**: Language detection
- **userstack**: User agent parsing and device detection
- **spelllayer**: Spell checking and correction
- **sentimentlayer**: Sentiment analysis
- **scraperlayer**: Web scraping API
- **keywordlayer**: Keyword extraction

### Weather
- **weatherstack**: Real-time weather data

## Usage

All APIs use the same base pattern:

```bash
curl "https://api.apilayer.com/{api_name}/{endpoint}?param=value" \
  -H "apikey: YOUR_API_KEY"
```

## Links

- Website: https://apilayer.com
- Marketplace: https://marketplace.apilayer.com
- Documentation: https://apilayer.com/docs
