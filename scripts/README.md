# Team Data Seeding Scripts

This directory contains scripts to populate your teams table with real soccer team data.

## 🚀 Quick Start

### Option 1: Use Static Data (Recommended for Development)

```bash
npm run seed:teams
```

This will seed your database with **45+ teams** from major European leagues:

- 🏴󠁧󠁢󠁥󠁮󠁧󠁿 **Premier League** (20 teams)
- 🇪🇸 **La Liga** (5 teams)
- 🇮🇹 **Serie A** (5 teams)
- 🇩🇪 **Bundesliga** (5 teams)
- 🇫🇷 **Ligue 1** (5 teams)

### Option 2: Use Football API (Production)

```bash
npm run seed:teams:api
```

This script will attempt to fetch live data from Football-Data.org API and fall back to static data if the API is unavailable.

## 📋 Prerequisites

1. **Database Migration**: Make sure you've run the migration script first:

   ```sql
   -- Run the migration-final.sql script in Supabase
   ```

2. **Environment Variables**: Ensure your `.env` file contains:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Important**: You need the **Service Role Key** (not the Anon Key) for seeding because it bypasses Row Level Security policies. Get it from your Supabase Dashboard → Settings → API → service_role key.

3. **For API Option**: Add API keys to your `.env`:

   ```env
   # Football-Data.org (Free: 10 requests/minute)
   FOOTBALL_DATA_API_KEY=your_api_key

   # API-Sports (Free: 100 requests/day)
   API_SPORTS_KEY=your_api_key
   ```

## 🏆 Available Teams

### Premier League (20 teams)

- Arsenal, Chelsea, Manchester City, Manchester United, Liverpool
- Tottenham, Newcastle, Crystal Palace, West Ham, Brighton
- Aston Villa, Brentford, Burnley, Fulham, Everton
- Wolves, Sheffield United, Luton Town, Nottingham Forest, Norwich City

### La Liga (5 teams)

- Barcelona, Real Madrid, Atletico Madrid, Sevilla, Villarreal

### Serie A (5 teams)

- Juventus, AC Milan, Inter Milan, AS Roma, Napoli

### Bundesliga (5 teams)

- Bayern Munich, Borussia Dortmund, RB Leipzig, Bayer Leverkusen, Borussia Mönchengladbach

### Ligue 1 (5 teams)

- PSG, Marseille, Lyon, Monaco, Lille

## 🔧 Customization

### Adding More Teams

To add more teams, edit `scripts/seed-comprehensive-teams.js`:

```javascript
const newTeams = [
  {
    external_id: "123",
    name: "Team Name",
    short_name: "Short",
    code: "TNM",
    country: "Country",
    country_code: "CC",
    league: "League Name",
    league_id: "2024",
    continental_confederation: "UEFA",
    founded_year: 1900,
    venue_name: "Stadium Name",
    venue_city: "City",
    venue_capacity: 50000,
    logo_url: "https://example.com/logo.png",
    website_url: "https://www.team.com",
  },
];

// Add to existing array
COMPREHENSIVE_TEAMS_DATA.premierLeague.push(...newTeams);
```

### Adding New Leagues

```javascript
COMPREHENSIVE_TEAMS_DATA.newLeague = [
  // Add teams here
];

// Update the allTeams array
const allTeams = [
  ...COMPREHENSIVE_TEAMS_DATA.premierLeague,
  ...COMPREHENSIVE_TEAMS_DATA.laLiga,
  ...COMPREHENSIVE_TEAMS_DATA.serieA,
  ...COMPREHENSIVE_TEAMS_DATA.bundesliga,
  ...COMPREHENSIVE_TEAMS_DATA.ligue1,
  ...COMPREHENSIVE_TEAMS_DATA.newLeague, // Add here
];
```

## 🚨 Troubleshooting

### Common Issues

1. **"relation 'teams' does not exist"**

   - Run the migration script first: `migration-final.sql`

2. **"duplicate key value violates unique constraint"**

   - Teams already exist. Clear the table first:

   ```sql
   DELETE FROM teams;
   ```

3. **API rate limit exceeded**

   - Wait a few minutes and try again
   - Use the static data option instead

4. **Network errors**
   - Check your internet connection
   - Verify API keys are correct
   - Use static data fallback

### Verifying Data

Check your seeded data:

```sql
-- Count teams by league
SELECT league, COUNT(*) as team_count
FROM teams
GROUP BY league
ORDER BY team_count DESC;

-- View all teams
SELECT name, league, country, venue_name, venue_capacity
FROM teams
ORDER BY league, name;
```

## 📊 Data Structure

Each team includes:

- **Basic Info**: `name`, `short_name`, `code`, `external_id`
- **Location**: `country`, `country_code`, `league`, `league_id`
- **Confederation**: `continental_confederation` (UEFA, CONMEBOL, etc.)
- **Stadium**: `venue_name`, `venue_city`, `venue_capacity`
- **Additional**: `founded_year`, `logo_url`, `website_url`, `is_active`

## 🔄 Updating Data

To update team data:

1. **Clear existing data**:

   ```sql
   DELETE FROM teams;
   ```

2. **Re-run seeding**:
   ```bash
   npm run seed:teams
   ```

## 📝 Notes

- Static data includes major teams from top 5 European leagues
- API data provides real-time information but requires API keys
- All teams are marked as `is_active = true` by default
- External IDs are from Football-Data.org for consistency
- Logo URLs point to Football-Data.org's CDN
