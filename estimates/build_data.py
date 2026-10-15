import json, csv, os
OUT = os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUT, exist_ok=True)
CHECKED = '2026-10-15'

# grade: A primary official data or model output; B peer-reviewed analysis; C press, secondary or organisation statement; D lab judgment, stated as such
R = []
def row(id, figure, low, high, unit, year, scope, geography, category, source, url, grade, add_rule, note, tags=''):
    R.append(dict(id=id, figure=figure, low=low, high=high, unit=unit, year=year, scope=scope, geography=geography,
                  category=category, source=source, url=url, grade=grade, do_not_add_to=add_rule, note=note, tags=tags, last_checked=CHECKED))

row('who-ghe-2021', '300,228', 300228, 300228, 'deaths', 2021, 'Unintentional drowning, ICD-10 W65–W74. Excludes water transport, flood and other disasters, intentional drowning.', 'Global', 'core',
    'WHO Global Health Estimates 2021, summary table (released 2024)', 'https://www.who.int/data/gho/data/themes/mortality-and-global-health-estimates/ghe-leading-causes-of-death', 'A',
    'Never averaged with ihme-gbd-2021 or who-ghe-2019; never summed with excluded components without stating overlap.', 'Point estimate; the cited table prints no uncertainty interval, which is not the same as no uncertainty.', 'core,modeled')
row('ihme-gbd-2021', '274,200 (95% UI 252,000–298,000)', 252000, 298000, 'deaths', 2021, 'GBD drowning cause; core definition unintentional drowning W65–W74. Same exclusions as WHO.', '204 countries and territories', 'core',
    'Xie Z et al., Global burden of drowning 1990–2021, Scientific Reports 15:10916 (2025), Table 1', 'https://doi.org/10.1038/s41598-025-95486-w', 'B',
    'Never averaged with who-ghe-2021. The 26,028 gap is model disagreement, not a head count.', 'Independent model and input database from WHO.', 'core,modeled')
row('who-ghe-2019', '235,642', 235642, 235642, 'deaths', 2019, 'Unintentional drowning, W65–W74; legacy model vintage.', 'Global', 'core',
    'WHO Global Health Estimates 2019, summary table (released 2020)', 'https://www.who.int/data/gho/data/themes/mortality-and-global-health-estimates/ghe-leading-causes-of-death', 'A',
    'Cannot be used with who-ghe-2021 to show a rise 2019→2021: different vintage.', 'Still quoted on some WHO pages.', 'core,modeled,legacy')
row('gbd-2017-franklin', '295,210 (UI 284,493–306,187)', 284493, 306187, 'deaths', 2017, 'Unintentional drowning, W65–W74 / ICD-9 E910.', 'Global', 'core',
    'Franklin RC et al., The burden of unintentional drowning, Injury Prevention 26:i83 (2020), GBD 2017', 'https://www.healthdata.org/research-analysis/library/burden-unintentional-drowning-global-regional-and-national-estimates', 'B',
    'Different GBD round from ihme-gbd-2021; do not chain into a trend across rounds.', 'Reports a 44.5% fall since 1990.', 'core,modeled,trend')
row('gbd-1990-franklin', '531,956 (UI 484,107–572,854)', 484107, 572854, 'deaths', 1990, 'Unintentional drowning, GBD 2017 back-estimate for 1990.', 'Global', 'context',
    'Franklin RC et al., Injury Prevention (2020)', 'https://www.healthdata.org/research-analysis/library/burden-unintentional-drowning-global-regional-and-national-estimates', 'B',
    'Trend only within the same GBD round.', 'Basis of the 44.5% decline 1990–2017.', 'trend')
row('who-rate-trend', 'Rate fell 38%, 6.1 → 3.8 per 100,000', 3.8, 6.1, 'deaths per 100,000', 2021, 'Global drowning death rate, 2000 vs 2021.', 'Global', 'context',
    'WHO, Drowning fact sheet (2026)', 'https://www.who.int/news-room/fact-sheets/detail/drowning', 'A',
    'A rate, not a count.', '', 'trend')
row('who-income-low', '39,000 · 5.8 per 100,000 · 13%', 39000, 39000, 'deaths', 2021, 'Unintentional drowning by World Bank income group.', 'Low-income countries', 'who-drowns',
    'WHO Global status report on drowning prevention 2024, Table 1 (reproduced in Injury Prevention editorial, PMC12911604)', 'https://www.who.int/publications/i/item/9789240103962', 'A',
    'Rows sum to 299,000 because of rounding; a share of who-ghe-2021, not an addition to it.', '', 'income')
row('who-income-lower-middle', '147,000 · 4.9 per 100,000 · 49%', 147000, 147000, 'deaths', 2021, 'Unintentional drowning by income group.', 'Lower-middle-income countries', 'who-drowns',
    'WHO Global status report 2024, Table 1', 'https://www.who.int/publications/i/item/9789240103962', 'A', 'Share of the WHO 2021 figure.', '', 'income')
row('who-income-upper-middle', '89,000 · 3.2 per 100,000 · 30%', 89000, 89000, 'deaths', 2021, 'Unintentional drowning by income group.', 'Upper-middle-income countries', 'who-drowns',
    'WHO Global status report 2024, Table 1', 'https://www.who.int/publications/i/item/9789240103962', 'A', 'Share of the WHO 2021 figure.', '', 'income')
row('who-income-high', '24,000 · 1.7 per 100,000 · 8%', 24000, 24000, 'deaths', 2021, 'Unintentional drowning by income group.', 'High-income countries', 'who-drowns',
    'WHO Global status report 2024, Table 1', 'https://www.who.int/publications/i/item/9789240103962', 'A', 'Share of the WHO 2021 figure.', '', 'income')
row('who-age-under5', 'Nearly a quarter of drowning deaths', 0.24, 0.24, 'share', 2021, 'Children under 5.', 'Global', 'who-drowns',
    'WHO, Drowning fact sheet', 'https://www.who.int/news-room/fact-sheets/detail/drowning', 'A', 'A share of one estimate; overlaps with region and income cuts.', 'The 2024 report prints 21% (over 62,000) in some summaries; we chart the fact-sheet wording.', 'age')
row('who-age-under30', '57% of drowning deaths', 0.57, 0.57, 'share', 2021, 'Ages 0–29.', 'Global', 'who-drowns',
    'WHO, Drowning fact sheet', 'https://www.who.int/news-room/fact-sheets/detail/drowning', 'A', 'Share, not a count.', '', 'age')
row('who-sex', 'Male rate more than twice the female rate', 2, 2, 'ratio', 2021, 'Drowning death rate by sex.', 'Global', 'who-drowns',
    'WHO, Drowning fact sheet', 'https://www.who.int/news-room/fact-sheets/detail/drowning', 'A', 'Ratio, not a count.', '', 'sex')
row('who-region-wpr', 'Over 84,000 · 4.3 per 100,000 · ~30% of global', 84000, 84000, 'deaths', 2021, 'Unintentional drowning, WHO Western Pacific Region.', 'Western Pacific', 'who-drowns',
    'WHO Western Pacific Regional Office, drowning 2024 data page', 'https://data.wpro.who.int/drowning-2024', 'A', 'A share of the WHO global figure.', 'Highest rate among people 70 and older: 13.7 per 100,000.', 'region')
row('who-region-sear', '~83,000', 83000, 83000, 'deaths', 2021, 'Unintentional drowning, WHO South-East Asia Region.', 'South-East Asia', 'who-drowns',
    'WHO Global status report 2024, as summarised by a secondary source (esanum, 2025)', 'https://www.who.int/publications/i/item/9789240103962', 'C', 'Share of the WHO figure. Verify against the report table before citing.', 'WHO fact sheet: over half of drownings occur in WPR and SEAR combined.', 'region,verify')
row('who-region-afr', '~77,000 · 5.7 per 100,000', 77000, 77000, 'deaths', 2021, 'Unintentional drowning, WHO African Region.', 'Africa', 'who-drowns',
    'WHO Global status report 2024, via secondary source', 'https://www.who.int/publications/i/item/9789240103962', 'C', 'Share of the WHO figure. Verify.', 'Highest regional rate.', 'region,verify')
row('who-region-emr', '~36,000', 36000, 36000, 'deaths', 2021, 'Unintentional drowning, WHO Eastern Mediterranean Region.', 'Eastern Mediterranean', 'who-drowns',
    'WHO Global status report 2024, via secondary source', 'https://www.who.int/publications/i/item/9789240103962', 'C', 'Share of the WHO figure. Verify.', '', 'region,verify')
row('who-region-amr', '~16,500', 16500, 16500, 'deaths', 2021, 'Unintentional drowning, WHO Region of the Americas.', 'Americas', 'who-drowns',
    'WHO Global status report 2024, via secondary source', 'https://www.who.int/publications/i/item/9789240103962', 'C', 'Share of the WHO figure. Verify.', '', 'region,verify')
row('who-region-eur', '9,155 · 1.0 per 100,000 · ~3%', 9155, 9155, 'deaths', 2021, 'Unintentional drowning, WHO European Region.', 'Europe', 'who-drowns',
    'WHO Global status report 2024, via secondary source', 'https://www.who.int/publications/i/item/9789240103962', 'C', 'Share of the WHO figure. Verify.', 'Rates differ more than tenfold between European countries.', 'region,verify')
row('who-nonfatal', '4–5 non-fatal drownings per death', 4, 5, 'ratio', 2024, 'Non-fatal drowning, many with lasting neurological injury.', 'Global', 'context',
    'WHO Global status report 2024, as summarised by a secondary source', 'https://www.who.int/publications/i/item/9789240103962', 'C', 'Not deaths. Never added to any death count.', 'Verify the exact wording in the report.', 'nonfatal,verify')
row('who-data-gaps', '31% of countries record where; under 30% record the activity', 0.31, 0.31, 'share of countries', 2024, 'Surveillance coverage reported by countries.', 'Global', 'gap',
    'WHO Global status report 2024, via secondary source', 'https://www.who.int/publications/i/item/9789240103962', 'C', 'A survey result, not a count.', 'This is the gap the register pilot is written for.', 'gap,verify')
row('who-flood-share', 'Drowning is 75% of deaths in flood disasters', 0.75, 0.75, 'share', 2026, 'Share of flood-disaster deaths that are drownings.', 'Global', 'excluded',
    'WHO, Drowning fact sheet', 'https://www.who.int/news-room/fact-sheets/detail/drowning', 'A', 'A share, not a count. Applied to a flood-death count it gives an estimate, not an observation.', '', 'floods')
row('emdat-flood-deaths-2019', '5,110 flood deaths', 5110, 5110, 'deaths', 2019, 'Deaths attributed to flood disasters, all causes.', 'Global', 'excluded',
    'CRED, Natural disasters 2019 (EM-DAT)', 'https://www.cred.be/sites/default/files/adsr_2019.pdf', 'A', 'All causes, not only drowning. Yearly totals swing several-fold.', 'With who-flood-share: about 3,800 flood drownings in 2019.', 'floods')
row('flood-drowning-band', '~3,000–8,000 flood drownings a year', 3000, 8000, 'deaths', 2019, 'Lab band: 75% of EM-DAT flood deaths, allowing for year-to-year swings.', 'Global', 'excluded',
    'Lab judgment from who-flood-share and EM-DAT yearly totals', '', 'D', 'A band we drew. Replace it with a sourced multi-year average and this row is retired.', 'Open task: compute 75% of EM-DAT flood deaths for 2010–2024.', 'floods,open')
row('ferry-wfsa', '800–1,000 ferry deaths a year; could be twice that', 800, 2000, 'deaths', 2014, 'Deaths in ferry accidents worldwide.', 'Global', 'excluded',
    'Worldwide Ferry Safety Association (R. Weisbrod), quoted in Foreign Policy, 16 Apr 2014', 'https://foreignpolicy.com/2014/04/16/why-do-so-many-people-die-in-ferry-accidents', 'C', 'Ferries only; other shipping and small craft have no global series. Outside the WHO figure by definition.', 'Old estimate. Open task: ask WFSA for its current database totals.', 'transport,verify')
row('water-transport-other', 'No global yearly series', None, None, 'deaths', None, 'Shipping, small craft capsize, work boats, not counted as ferries.', 'Global', 'unknown',
    'None found', '', 'D', 'Cannot be drawn. Single disasters sit in the ledger when sourced.', 'The largest unmeasured piece of the toll.', 'transport,open')
row('fishing-ilo-1999', '24,000 fishing deaths a year', 24000, 24000, 'deaths', 1999, 'Occupational deaths in fishing.', 'Global', 'range',
    'ILO (1999), from the FAO 1987 proposal', 'https://www.imarest.org/resource/fishing-safety-and-the-numbers-a-call-for-action.html', 'C', 'How much falls inside the WHO figure is unresolved; do not add without stating an overlap assumption.', 'Still used by authorities; called "seemingly faulty, decades-old" by FISH Safety Foundation.', 'fishing')
row('fishing-fao-32000', 'More than 32,000 a year', 32000, 32000, 'deaths', 2021, 'Occupational deaths in fishing, as quoted by WHO.', 'Global', 'range',
    'FAO, quoted in the WHO drowning fact sheet', 'https://www.who.int/news-room/fact-sheets/detail/drowning', 'A', 'Overlap with the WHO figure unresolved.', '', 'fishing')
row('fishing-fsf-100000', 'More than 100,000 a year', 100000, 100000, 'deaths', 2023, 'Occupational deaths in fishing, all causes.', 'Global', 'range',
    'FISH Safety Foundation; Willis S, Holliday E et al., Marine Policy (2023)', 'https://www.imarest.org/resource/fishing-safety-and-the-numbers-a-call-for-action.html', 'B', 'Not all drownings; overlap with the WHO figure unresolved.', 'No comprehensive global data on fisher deaths exists; no agreed definition of a fisher.', 'fishing')
row('migrants-iom-2024', '9,191 dead or missing on migration routes', 9191, 9191, 'deaths and disappearances', 2024, 'All routes, land and sea.', 'Global', 'excluded',
    'IOM Missing Migrants Project, as reported to the UN (2025)', 'https://www.un.org/depts/los/general_assembly/contributions80/13IOM.pdf', 'A', 'Not all at sea; not all drownings. Excluded from the WHO figure.', 'Deadliest year on record at the time.', 'migrants')
row('migrants-maritime-sep24-may25', 'At least 3,650 died on maritime migration journeys', 3650, 3650, 'deaths', 2025, 'Sea routes worldwide, Sept 2024–May 2025.', 'Global', 'excluded',
    'IOM Missing Migrants Project (UN submission, June 2025)', 'https://www.un.org/depts/los/general_assembly/contributions80/13IOM.pdf', 'A', 'A minimum; two-thirds of Mediterranean dead remain missing.', 'Over 1,600 drowned in the Mediterranean in this window.', 'migrants')
row('migrants-2025-sea-routes', '~4,200 on three sea routes, plus ~1,500 estimated in unrecorded wrecks', 4200, 5700, 'deaths and disappearances', 2025, 'Mediterranean 2,185; Atlantic route to the Canaries 1,214; Bay of Bengal and Andaman Sea 800+.', 'Three sea routes', 'excluded',
    'IOM 2025 figures as reported by press (Diplomatic Insight, Jan 2026)', 'https://thediplomaticinsight.com/8000-migrants-perished-globally-2025-iom/', 'C', 'A minimum for three routes only. Verify against IOM\'s own 2025 release.', 'IOM warns that a lower total does not mean lower risk: verification and access limits affect the count.', 'migrants,verify')
row('migrants-since-2014', '39,383 drowned during unsafe migration since 2014', 39383, 39383, 'deaths', 2024, 'Cumulative, 2014 to Dec 2024.', 'Global', 'context',
    'IOM Missing Migrants Project, quoted by WHO (Dec 2024)', 'https://www.who.int/news/item/13-12-2024-drowning-deaths-decline-globally-but-the-most-vulnerable-remain-at-risk', 'A', 'Cumulative over a decade; never a yearly figure. WHO states these are excluded from its global estimates.', '', 'migrants')
row('intentional-drowning', 'No global series reproduced', None, None, 'deaths', None, 'Intentional and undetermined-intent drowning (ICD X71, Y21).', 'Global', 'unknown',
    'None reproduced in this pass', '', 'D', 'Outside the unintentional core by definition. A different problem with different prevention.', 'Open task: reproduce GBD self-harm by drowning from a primary table.', 'intentional,open')
row('us-cdc-4345', '4,345 unintentional drowning deaths a year, average', 4345, 4345, 'deaths', 2021, 'Average 2018–2021.', 'United States', 'local',
    'CDC, Drowning data (27 Jan 2026)', 'https://www.cdc.gov/drowning/data/index.html', 'A', 'Windows overlap with us-cdc-4500; never averaged.', '', 'us')
row('us-cdc-4500', 'Over 4,500 drowned each year', 4500, 4500, 'deaths', 2022, 'Average 2020–2022.', 'United States', 'local',
    'CDC Vital Signs (18 Jun 2024); MMWR (14 May 2024)', 'https://www.cdc.gov/vitalsigns/drowning/index.html', 'A', 'Overlaps us-cdc-4345.', '', 'us')
row('uscg-boating-2024', '556 recreational boating deaths; 3 in 4 drowned; 87% of those wore no life jacket', 556, 556, 'deaths', 2024, 'Recreational boating fatalities.', 'United States', 'local',
    'U.S. Coast Guard, 2024 Recreational Boating Statistics', 'https://uscgboating.org/statistics/accident_statistics.php', 'A', 'A subset of US drownings plus non-drowning boating deaths; not added to CDC figures.', 'About 70% of deaths involved an operator with no boating safety instruction; alcohol the leading known factor (20%). Fewest deaths in 50+ years.', 'us,boating')
row('uscg-sar-fy2024', '14,282 SAR cases; 5,892 lives saved', 5892, 5892, 'lives saved', 2024, 'Search and rescue, fiscal year 2024.', 'United States', 'local',
    'U.S. Coast Guard Office of Search and Rescue', 'https://dco.uscg.mil/Our-Organization/Assistant-Commandant-for-Response-Policy-CG-5R/Office-of-Incident-Management-Preparedness-CG-5RI/US-Coast-Guard-Office-of-Search-and-Rescue-CG-SAR', 'A', '"Lives saved" uses the Coast Guard\'s own definition.', '', 'us,rescue')
row('peterson-us-348', '348 US drowning deaths a year preventable by pool fencing and life jackets', 348, 348, 'deaths', 2025, 'Modeled: isolation pool fencing for under-5s and always wearing a life jacket while boating.', 'United States', 'prevention',
    'Peterson C et al., Injury Prevention (2025), doi:10.1136/ip-2024-045597', 'https://doi.org/10.1136/ip-2024-045597', 'B', 'A model, not a count.', 'The $4.5 billion in the paper is the yearly economic cost of those deaths, not the cost of fences or jackets.', 'prevention,modeled')
row('who-investment-case', '774,000 fewer child drownings by 2050', 774000, 774000, 'deaths averted (cumulative)', 2023, 'Modeled: day-care for pre-school children plus basic swim skills.', 'Global', 'prevention',
    'WHO, Hidden depths: the global investment case for drowning prevention (2023)', 'https://www.who.int/publications/i/item/9789240081345', 'A', 'A projection to 2050, never a yearly share of 300,000.', 'Return estimated at 9 times the cost.', 'prevention,modeled')
row('who-prevention-measures', 'Six recommended measures', None, None, 'measures', 2026, 'Control access to water; day-care for pre-school children; swim, water-safety and safe-rescue skills; safe boating, shipping and ferry rules; flood preparedness; a national water safety strategy.', 'Global', 'prevention',
    'WHO, Drowning fact sheet, Prevention', 'https://www.who.int/news-room/fact-sheets/detail/drowning', 'A', 'Recommendations, not counts.', '', 'prevention')
row('preventable-share', 'No published global share of preventable drowning deaths', None, None, 'share', None, 'Checked 12 Oct 2026.', 'Global', 'unknown',
    'None found', '', 'D', 'We will not draw one.', '', 'open')
row('exclusion-halves-hic', 'Exclusions "almost halve" drowning figures in high-income contexts like Australia', None, None, 'statement', 2025, 'Effect of excluding water transport and disasters from the core definition.', 'High-income countries', 'gap',
    'Injury Prevention editorial on the WHO 2024 report, PMC12911604', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12911604/', 'B', 'A statement about definitions, not a global multiplier.', 'Evidence that the true toll sits above the core in some settings.', 'definitions')
row('icd-definition', 'Core = ICD-10 W65–W74; excluded X38, V90, V92, Y21', None, None, 'definition', 2022, 'What the core drowning estimates include and leave out.', 'Global', 'gap',
    'Özanne-Smith J et al., PLOS ONE (2022), PMC9341097', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9341097/', 'B', 'A definition.', 'X38 flood, V90/V92 water transport, Y21 undetermined intent.', 'definitions')
row('rnli-lives-saved', '147,096 lives saved since 1824', 147096, 147096, 'lives saved', 2025, 'RNLI cumulative, by its published definition.', 'UK and Ireland', 'rescue',
    'RNLI annual accounts 2025', 'https://rnli.org/about-us/how-the-rnli-is-run/annual-report-and-accounts', 'A', 'Cumulative; a definition the RNLI publishes.', '', 'rescue')
row('wood-island-rescues', '"Hundreds" of lives in ~70 rescues · 60+ major rescues · 1,678 seafarers aided 1918–1939', None, None, 'rescues', 1939, 'Three counts from three sources about one station.', 'Wood Island, Kittery, ME', 'local',
    'EPA; Maine Preservation (2026); Down East (2022), from station records', 'https://woodislandlifesaving.org/', 'C', 'Three counts that are not a total. Aided is not saved.', '', 'here,history')
row('piscataqua-current', 'Over 4 knots on the ebb (maximum average velocity, off Nobles Island and off Dover Point)', 4, None, 'knots', 2026, 'Maximum average tidal current velocity in the Piscataqua River. Deep-draft navigation is limited to 1.5 hours either side of slack water; strong currents and eddies in the bend at Fort Point.', 'Piscataqua River, NH–ME', 'local',
    'NOAA, U.S. Coast Pilot 1, Chapter 9 (20 Sep 2026 edition), paragraphs 296, 369 and 371', 'https://nauticalcharts.noaa.gov/publications/coast-pilot/files/cp1/CPB1_C09_WEB.pdf', 'A', 'A current speed, not a count. It is the maximum average; the river is slower near slack and in the coves.', 'Upgraded 15 Oct 2026 from a lab statement (grade D) to the NOAA Coast Pilot. A kayak paddles about three knots; a swimmer far less.', 'here,cold-water,current')
row('ndbc-44007-water-temp', 'Mean monthly sea temperature 2.9 °C (March) to 16.7 °C (August); June mean 12.5 °C', 2.9, 16.7, 'degrees C', 2008, 'Climatic summary of NOAA buoy 44007, 12 nautical miles southeast of Portland, Maine, February 1982 to December 2008; monthly means with extremes.', 'Gulf of Maine, off Portland ME', 'local',
    'NOAA National Data Buoy Center, station 44007 climatic summary', 'https://www.ndbc.noaa.gov/data/climatic/44007.txt', 'A', 'A temperature, not a count. The buoy is about 50 nautical miles up the coast from Portsmouth; harbor and river water differ from the open gulf.', 'In June, when the lab runs, the sea is about 12 °C (54 °F). Cold-water immersion rules apply here all year.', 'here,cold-water')
row('hf-radar-search-area', 'Measured surface currents 6× more accurate than modelled; search area reduced by about two-thirds', 6, 6, 'ratio', 2024, 'HF radar surface currents feeding search planning.', 'US coastal ocean', 'prevention',
    'Rutgers RUCOOL, 20th-anniversary HF radar SAR presentation (2024), citing Roarty et al. 2018', 'https://rucool.marine.rutgers.edu/downloads/presentations/presentations-2024/20th_Anniversary_HFR_SAR_FINAL.pdf', 'C', 'A technical claim, not a count of lives.', 'Relevant to the Drift pilot track.', 'rescue,drift')
row('cape-town-agreement', 'Fishing-vessel safety treaty enters into force 24 Feb 2027, for vessels of 24 m and over', None, None, 'milestone', 2027, 'IMO Cape Town Agreement of 2012; 28 states acceded by Feb 2026.', 'Global', 'context',
    'IMO press briefing; DNV statutory news (2026)', 'https://www.imo.org/en/mediacentre/pressbriefings/pages/cape-town-agreement-global-treaty-fishing-vessel-safety-enter-into-force-2027.aspx', 'A', 'A milestone, not a count. Boats under 24 m, where most fishing deaths happen, are outside it.', '', 'fishing,policy')
row('usla-guarded-risk', 'Chance of drowning at a USLA-guarded beach: 1 in 18 million', None, None, 'risk', 2025, 'Fatal drowning at beaches protected by USLA-affiliated lifeguards, from ten years of agency reports.', 'United States', 'prevention',
    'United States Lifesaving Association, Statistics', 'https://www.usla.org/page/statistics', 'C', 'An organisation\'s own calculation; the denominator is beach attendance as agencies report it.', 'Strong practice evidence for guarded swim areas; not a controlled study.', 'prevention,lifeguards')
row('cummings-pfd-2011', 'Life jacket wear: adjusted risk ratio 0.51 (95% CI 0.35–0.74) for drowning among recreational boaters', 0.35, 0.74, 'risk ratio', 2006, 'US Coast Guard boating data 2000–2006, matched cohort.', 'United States', 'prevention',
    'Cummings P, Mueller BA, Quan L. Injury Prevention 17:156 (2011)', 'https://injuryprevention.bmj.com/content/17/3/156.short', 'B', 'A ratio, not a count. The authors caution the estimate may be biased because many vessels were excluded.', 'If the association is causal, wearing a life jacket may prevent one in two boating drownings.', 'prevention,boating')
row('cochrane-pool-fencing', 'Pool fencing: OR 0.27 (0.16–0.47) vs no fence; four-sided isolation fencing OR 0.17 (0.07–0.44) vs three-sided', 0.16, 0.47, 'odds ratio', 2006, 'Drowning and near-drowning in young children; three case-control studies. Searches last updated Oct 2006.', 'High-income settings', 'prevention',
    'Thompson DC, Rivara FP. Cochrane Database of Systematic Reviews, CD001047', 'https://www.cochrane.org/evidence/CD001047_fencing-which-completely-encloses-all-sides-swimming-pool-and-isolates-it-home-effective-preventing', 'B', 'Ratios, not counts.', 'The clearest evidence in the tree: a fence that separates the pool from the house.', 'prevention,pool')
row('giesbrecht-1-10-1', '1 minute to control breathing · 10 minutes of useful movement · about 1 hour before hypothermia takes consciousness', None, None, 'rule of thumb', 2010, 'Cold-water immersion phases, from laboratory and field work with volunteers.', 'Cold water', 'prevention',
    'Gordon Giesbrecht, University of Manitoba (the 1-10-1 principle), as explained by McGill OSS', 'https://www.mcgill.ca/oss/article/medical-did-you-know/professor-popsicles-physiological-proof', 'C', 'A teaching rule, not a count, and never a reason to delay a call.', 'The clock pilot track turns this into a hand-size card and tests whether crews use it.', 'prevention,cold-water')
row('rahman-anchal-2012', 'Village crèches: 82% fewer child drowning deaths (RR 0.181); SwimSafe lessons: 93% fewer (RR 0.072)', 0.072, 0.181, 'risk ratio', 2010, 'Children in rural Bangladesh, 2006–2010, versus matched non-participants. Cost per DALY averted: crèches $812, SwimSafe $85.', 'Bangladesh', 'prevention',
    'Rahman F, Bose S, Linnan M et al. Pediatrics 130(6):e1621 (2012)', 'https://medical.ilsf.org/cost-effectiveness-of-an-injury-and-drowning-prevention-program-in-bangladesh/', 'B', 'Ratios from one country programme; not a global share.', 'The evidence behind WHO\'s day-care and swim-skills recommendations and its 2050 investment case.', 'prevention,children')
row('australia-2024-25', '357 drowning deaths', 357, 357, 'deaths', 2025, '1 July 2024 to 30 June 2025, all drowning deaths as the report defines them.', 'Australia', 'local',
    'Royal Life Saving Society Australia, National Drowning Report 2025', 'https://www.royallifesaving.com.au/library/national-drowning-report/national-drowning-report-2025', 'A', 'A national count with its own definition; not comparable to UK or US rows without that definition.', '', 'country')
row('australia-location-2024-25', 'Coastal 154 (43%) · inland waterways 122 (34%) · swimming pools 35 (10%); rivers and creeks 99, beaches 82', 35, 154, 'deaths', 2025, 'Drowning deaths by location, Australia, July 2024–June 2025. Inland = rivers, creeks, lakes and dams. 68% of pool deaths were in backyard pools.', 'Australia', 'who-drowns',
    'Royal Life Saving Society Australia, National Drowning Report 2025 (news summary, 26 Aug 2025)', 'https://www.royallifesaving.com.au/about/news-and-updates/news/2025/aug/tragic-surge-in-drowning-deaths-prompts-urgent-call-for-action-ahead-of-summer', 'A', 'Shares of one national count; the categories do not sum to 357 because some locations are not listed.', 'A real split by water setting, for one country that counts. The first entry toward gap 4.', 'country,setting')
row('australia-age-2024-25', '65 and older: 118 (33%) · 15–24: 44, up 38% on the ten-year average · under 5: 15, down 21%', 15, 118, 'deaths', 2025, 'Drowning deaths by age, Australia, July 2024–June 2025. The report says people 75 and older have the highest rates.', 'Australia', 'who-drowns',
    'Royal Life Saving Society Australia, National Drowning Report 2025 (news summary)', 'https://www.royallifesaving.com.au/about/news-and-updates/news/2025/aug/tragic-surge-in-drowning-deaths-prompts-urgent-call-for-action-ahead-of-summer', 'A', 'Shares of one national count.', 'In a high-income country the age profile inverts: older adults, not under-fives, carry the largest share.', 'country,age')
row('exposure-denominators', 'No measure of how many people are on the water', None, None, 'denominator', None, 'Rates are published per 100,000 residents, not per hour or per trip on the water. Risk per trip is unknown everywhere.', 'Global', 'unknown',
    'None found', '', 'D', 'Cannot be drawn. Without it, no rate on this site is a risk.', 'Open task: count launches at one ramp for one season; pair with AIS for larger vessels.', 'gap,open,exposure')
row('uscg-bard', 'Event-level records of every reported US recreational boating accident', None, None, 'database', 2024, 'Boating Accident Report Database: vessel, activity, weather, life-jacket use, outcome, per accident.', 'United States', 'gap',
    'U.S. Coast Guard, Boating Accident Report Database (BARD) and annual statistics', 'https://uscgboating.org/statistics/accident_statistics.php', 'A', 'US boating only; reporting thresholds apply.', 'Proof that event-level records with activity and life-jacket fields can be kept at national scale.', 'us,boating,register')
row('uk-waid-2024', '193 accidental water-related deaths; 84% male; 61% inland', 193, 193, 'deaths', 2024, 'Accidental water-related fatalities, UK, with 206 cases of unknown cause still open with coroners.', 'United Kingdom', 'local',
    'National Water Safety Forum, Water Incident Database (WAID) 2024', 'https://www.port.ac.uk/news-events-and-blogs/news/193-accidental-water-related-fatalities-in-2024', 'A', 'Accidental only; the open coroner cases may add to it. Not comparable to other countries without the definition.', '', 'country')

with open(os.path.join(OUT, 'ledger.json'), 'w', encoding='utf8') as f:
    json.dump({"schema": "lifesavinglab.ledger.v2", "version": "0.4.0", "last_checked": CHECKED,
               "rule": "No figure in this ledger is summed or averaged across rows unless a row states the overlap assumption and names the rows it combines.",
               "grades": {"A": "primary official data or model output", "B": "peer-reviewed analysis", "C": "press, secondary summary, or an organisation's own statement", "D": "lab judgment, stated as such, with the task that retires it"},
               "rows": R}, f, indent=1, ensure_ascii=False)
with open(os.path.join(OUT, 'ledger.csv'), 'w', encoding='utf8', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(R[0].keys()))
    w.writeheader(); w.writerows(R)

# ---- the toll, as layers ----
toll = {
 "schema": "lifesavinglab.toll.v1", "last_checked": CHECKED,
 "method": "Floor = the lowest documented value of every component that is outside the core by definition, plus the core's lowest published bound. Ceiling = the highest documented value of each, assuming the fishing figure sits entirely outside the core. Beyond the ceiling the toll is unknown, not zero.",
 "layers": [
  {"id": "core", "label": "Core: unintentional drowning", "status": "modeled", "low": 252000, "high": 300228, "inside_core": True,
   "rows": ["ihme-gbd-2021", "who-ghe-2021"], "note": "Two models of the same year. The spread is the uncertainty, not new deaths."},
  {"id": "fishing", "label": "Fishing work (share outside the core unknown)", "status": "range", "low": 0, "high": 100000, "inside_core": "unknown",
   "rows": ["fishing-ilo-1999", "fishing-fao-32000", "fishing-fsf-100000"], "note": "24,000 to 100,000+ a year across sources and decades. Nobody has published how much is already inside WHO's figure, so the floor is 0 and the ceiling assumes none of it is."},
  {"id": "floods", "label": "Flood and disaster drownings", "status": "estimate", "low": 3000, "high": 8000, "inside_core": False,
   "rows": ["who-flood-share", "emdat-flood-deaths-2019", "flood-drowning-band"], "note": "75% of flood-disaster deaths (WHO) applied to EM-DAT yearly totals, which swing several-fold."},
  {"id": "migrants", "label": "Migrants at sea", "status": "minimum", "low": 3650, "high": 5700, "inside_core": False,
   "rows": ["migrants-maritime-sep24-may25", "migrants-2025-sea-routes"], "note": "Recorded deaths are a minimum; IOM estimates about 1,500 more in wrecks no one recorded."},
  {"id": "ferries", "label": "Ferry accidents", "status": "estimate", "low": 800, "high": 2000, "inside_core": False,
   "rows": ["ferry-wfsa"], "note": "An old estimate from the Worldwide Ferry Safety Association, which said the true figure could be double."},
  {"id": "transport-other", "label": "Other shipping and small craft", "status": "unknown", "low": None, "high": None, "inside_core": False,
   "rows": ["water-transport-other"], "note": "No global yearly series exists."},
  {"id": "intentional", "label": "Intentional and undetermined intent", "status": "unknown", "low": None, "high": None, "inside_core": False,
   "rows": ["intentional-drowning"], "note": "A different problem with different prevention; no primary global figure reproduced here."}
 ],
 "nonfatal": {"label": "Non-fatal drownings", "ratio_low": 4, "ratio_high": 5, "rows": ["who-nonfatal"], "note": "For every death, four to five people survive a drowning, many with lasting injury. Never added to deaths."}
}
floor = sum(l["low"] for l in toll["layers"] if l["low"] is not None)
ceiling = sum(l["high"] for l in toll["layers"] if l["high"] is not None)
toll["floor"] = floor; toll["ceiling"] = ceiling
with open(os.path.join(OUT, 'toll.json'), 'w', encoding='utf8') as f:
    json.dump(toll, f, indent=1, ensure_ascii=False)
print('floor', floor, 'ceiling', ceiling, 'rows', len(R))
