-- Seed data for competitions table
-- This script populates the competitions table with major football competitions

-- Insert major football competitions
INSERT INTO competitions (id, name, type, country, country_code, logo_url, is_active, current_season) VALUES
-- Premier League
('PL', 'Premier League', 'league', 'England', 'GB', 'https://logos-world.net/wp-content/uploads/2020/06/Premier-League-Logo.png', true, '2023-24'),

-- La Liga
('LL', 'La Liga', 'league', 'Spain', 'ES', 'https://logos-world.net/wp-content/uploads/2020/06/La-Liga-Logo.png', true, '2023-24'),

-- Serie A
('SA', 'Serie A', 'league', 'Italy', 'IT', 'https://logos-world.net/wp-content/uploads/2020/06/Serie-A-Logo.png', true, '2023-24'),

-- Bundesliga
('BL', 'Bundesliga', 'league', 'Germany', 'DE', 'https://logos-world.net/wp-content/uploads/2020/06/Bundesliga-Logo.png', true, '2023-24'),

-- Ligue 1
('L1', 'Ligue 1', 'league', 'France', 'FR', 'https://logos-world.net/wp-content/uploads/2020/06/Ligue-1-Logo.png', true, '2023-24'),

-- Champions League
('UCL', 'UEFA Champions League', 'cup', 'Europe', 'EU', 'https://logos-world.net/wp-content/uploads/2020/06/UEFA-Champions-League-Logo.png', true, '2023-24'),

-- Europa League
('UEL', 'UEFA Europa League', 'cup', 'Europe', 'EU', 'https://logos-world.net/wp-content/uploads/2020/06/UEFA-Europa-League-Logo.png', true, '2023-24'),

-- Europa Conference League
('UECL', 'UEFA Europa Conference League', 'cup', 'Europe', 'EU', 'https://logos-world.net/wp-content/uploads/2020/06/UEFA-Europa-Conference-League-Logo.png', true, '2023-24'),

-- FA Cup
('FAC', 'FA Cup', 'cup', 'England', 'GB', 'https://logos-world.net/wp-content/uploads/2020/06/FA-Cup-Logo.png', true, '2023-24'),

-- Copa del Rey
('CDR', 'Copa del Rey', 'cup', 'Spain', 'ES', 'https://logos-world.net/wp-content/uploads/2020/06/Copa-del-Rey-Logo.png', true, '2023-24'),

-- Coppa Italia
('CI', 'Coppa Italia', 'cup', 'Italy', 'IT', 'https://logos-world.net/wp-content/uploads/2020/06/Coppa-Italia-Logo.png', true, '2023-24'),

-- DFB-Pokal
('DFB', 'DFB-Pokal', 'cup', 'Germany', 'DE', 'https://logos-world.net/wp-content/uploads/2020/06/DFB-Pokal-Logo.png', true, '2023-24'),

-- Coupe de France
('CDF', 'Coupe de France', 'cup', 'France', 'FR', 'https://logos-world.net/wp-content/uploads/2020/06/Coupe-de-France-Logo.png', true, '2023-24'),

-- World Cup
('WC', 'FIFA World Cup', 'international', 'World', 'WW', 'https://logos-world.net/wp-content/uploads/2020/06/FIFA-World-Cup-Logo.png', true, '2022'),

-- European Championship
('EC', 'UEFA European Championship', 'international', 'Europe', 'EU', 'https://logos-world.net/wp-content/uploads/2020/06/UEFA-European-Championship-Logo.png', true, '2024'),

-- Copa America
('CA', 'Copa America', 'international', 'South America', 'SA', 'https://logos-world.net/wp-content/uploads/2020/06/Copa-America-Logo.png', true, '2024'),

-- Nations League
('UNL', 'UEFA Nations League', 'international', 'Europe', 'EU', 'https://logos-world.net/wp-content/uploads/2020/06/UEFA-Nations-League-Logo.png', true, '2024-25'),

-- MLS
('MLS', 'Major League Soccer', 'league', 'United States', 'US', 'https://logos-world.net/wp-content/uploads/2020/06/MLS-Logo.png', true, '2024'),

-- Brasileirao
('BR', 'Brasileirao', 'league', 'Brazil', 'BR', 'https://logos-world.net/wp-content/uploads/2020/06/Brasileirao-Logo.png', true, '2024'),

-- Liga MX
('LMX', 'Liga MX', 'league', 'Mexico', 'MX', 'https://logos-world.net/wp-content/uploads/2020/06/Liga-MX-Logo.png', true, '2024'),

-- Eredivisie
('ED', 'Eredivisie', 'league', 'Netherlands', 'NL', 'https://logos-world.net/wp-content/uploads/2020/06/Eredivisie-Logo.png', true, '2023-24'),

-- Primeira Liga
('PLP', 'Primeira Liga', 'league', 'Portugal', 'PT', 'https://logos-world.net/wp-content/uploads/2020/06/Primeira-Liga-Logo.png', true, '2023-24'),

-- Belgian Pro League
('BPL', 'Belgian Pro League', 'league', 'Belgium', 'BE', 'https://logos-world.net/wp-content/uploads/2020/06/Belgian-Pro-League-Logo.png', true, '2023-24'),

-- Austrian Bundesliga
('AB', 'Austrian Bundesliga', 'league', 'Austria', 'AT', 'https://logos-world.net/wp-content/uploads/2020/06/Austrian-Bundesliga-Logo.png', true, '2023-24'),

-- Swiss Super League
('SSL', 'Swiss Super League', 'league', 'Switzerland', 'CH', 'https://logos-world.net/wp-content/uploads/2020/06/Swiss-Super-League-Logo.png', true, '2023-24'),

-- Championship
('CH', 'Championship', 'league', 'England', 'GB', 'https://logos-world.net/wp-content/uploads/2020/06/Championship-Logo.png', true, '2023-24'),

-- Segunda Division
('SD', 'Segunda Division', 'league', 'Spain', 'ES', 'https://logos-world.net/wp-content/uploads/2020/06/Segunda-Division-Logo.png', true, '2023-24'),

-- Serie B
('SB', 'Serie B', 'league', 'Italy', 'IT', 'https://logos-world.net/wp-content/uploads/2020/06/Serie-B-Logo.png', true, '2023-24'),

-- 2. Bundesliga
('2BL', '2. Bundesliga', 'league', 'Germany', 'DE', 'https://logos-world.net/wp-content/uploads/2020/06/2-Bundesliga-Logo.png', true, '2023-24'),

-- Ligue 2
('L2', 'Ligue 2', 'league', 'France', 'FR', 'https://logos-world.net/wp-content/uploads/2020/06/Ligue-2-Logo.png', true, '2023-24')

ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    country = EXCLUDED.country,
    country_code = EXCLUDED.country_code,
    logo_url = EXCLUDED.logo_url,
    is_active = EXCLUDED.is_active,
    current_season = EXCLUDED.current_season,
    updated_at = NOW();

-- Update the updated_at timestamp
UPDATE competitions SET updated_at = NOW() WHERE id IN (
    'PL', 'LL', 'SA', 'BL', 'L1', 'UCL', 'UEL', 'UECL', 'FAC', 'CDR', 
    'CI', 'DFB', 'CDF', 'WC', 'EC', 'CA', 'UNL', 'MLS', 'BR', 'LMX',
    'ED', 'PLP', 'BPL', 'AB', 'SSL', 'CH', 'SD', 'SB', '2BL', 'L2'
);

\echo 'Competitions seeded successfully!'


