"""Builds tasks/tasks.json: the board of small tasks an agent can do in one session. Run after editing. Keep ids stable."""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
LEDGER = 'https://raw.githubusercontent.com/ethanhawkes-gif/thelifesavinglab-open-data/main/seeds/ledger.json'


T = []
def task(id, title, kind, size, ask, inputs, accept, rows=None, unlocks='', parent=None, status='open', done_note=None, needs=None):
    """needs: 'browser' marks a task an assistant without a real browser cannot finish (a site that refuses automated readers, a form, a browser check). The board shows it; an agent that cannot browse should pick another task."""
    T.append(dict(id=id, title=title, kind=kind, size=size, status=status, ask=ask, inputs=inputs, accept=accept, rows=rows or [],
                  unlocks=unlocks, parent=parent, needs=needs, claimed_by=None, claimed_until=None, created='2026-10-15', done_receipt=None, done_note=done_note))

DONE_NOTE = 'Done by the lab on 15 Oct 2026 by reading the report (Fig. 2 and p. 14); the row is now grade A. The bundle that would have been returned is tasks/example-bundle.json.'
for region, rid, fig in [('South-East Asia', 'who-region-sear', '83,000 · 4.0 per 100,000'), ('Africa', 'who-region-afr', '66,000 · 5.6 per 100,000'),
                         ('Eastern Mediterranean', 'who-region-emr', '35,000 · 4.4 per 100,000'), ('Americas', 'who-region-amr', '17,000 · 1.6 per 100,000'), ('Europe', 'who-region-eur', '15,000 · 1.7 per 100,000')]:
    task(f'verify-{rid}', f'Verify the {region} drowning figure for 2021 against the WHO report', 'verify', 'S',
         f'The ledger carried a figure for the WHO {region} Region in 2021 taken from a secondary summary (grade C). Open the WHO Global status report on drowning prevention 2024 (ISBN 9789240103962), find the table or figure that gives drowning deaths and the rate per 100,000 by WHO region for 2021, and report the exact value for the {region} Region as printed, with the page or table.',
         ['https://www.who.int/publications/i/item/9789240103962', 'Row verified: ' + rid + ' now reads ' + fig],
         ['A correction or confirmation for row ' + rid + ' citing a page or table in the WHO report', 'A quote of 25 words or fewer from that page', 'Grade proposed: A if read from the report itself'],
         rows=[rid], unlocks='Upgrades the row from C to A; the region chart becomes citable.', status='done', done_note=DONE_NOTE)

task('who-europe-9155-reconcile', 'Europe: 9,155 (1.0 per 100,000) or 15,000 (1.7)? Find where the smaller figure comes from', 'verify', 'M',
     'The WHO 2024 report prints 15 000 drowning deaths and 1.7 per 100 000 for the WHO European Region in 2021 (Fig. 2 and p. 14). A secondary summary gave 9,155 and 1.0 per 100,000, which the ledger carried until 15 Oct 2026. Find the primary source of 9,155 and report what the two figures count.',
     ['https://www.who.int/publications/i/item/9789240103962', 'Rows: who-region-eur, esanum-europe-9155 (retired), eurostat-eu27-drowning-2021-2022, who-europe-20000-statement'],
     ['The primary source of the 9,155 figure, or status not-found with what was tried', 'What each figure counts: region membership, year, ICD codes', 'A proposed scope note for row who-region-eur, or a new row if both stand'],
     rows=['who-region-eur'], unlocks='Resolves a discrepancy that a careful reader will spot.', status='done',
     done_note='Done by an independent agent on 15 Oct 2026 (contributions/merged/who-europe-9155-reconcile-agent-three.json): the 9,155 figure exists only in a press article whose numbers mix the GBD 2017 global estimate with the WHO 2024 report; no primary source. The row now carries the report\'s definition (W65–W74, Box 3 exclusions, 53 countries), and three related rows were added: the press figure (retired), Eurostat\'s EU-27 count, and WHO Europe\'s 20,000 statement.')

task('gbd-2017-franklin-s1-europe', 'Is 9,155 the GBD 2017 estimate for Europe? Read supplementary table S1 of Franklin et al. 2020', 'verify', 'S',
     'A retired press figure (9,155 drowning deaths in "Europe", 1.0 per 100,000) has no known primary source, but the same article\'s global figure, 295,210, is exactly the GBD 2017 estimate for 2017 (Franklin et al., Injury Prevention 2020;26:i83–i95). The paper\'s regional values are in its online supplementary table S1, which the lab could not open. Find table S1 (PubMed Central PMC7571364, the journal\'s supplementary files, or an author repository), and report the 2017 drowning deaths and rate it gives for Europe or the WHO European Region, as printed, with the table\'s row labels.',
     ['https://injuryprevention.bmj.com/content/26/Suppl_2/i83', 'Rows: esanum-europe-9155, gbd-2017-franklin, who-region-eur'],
     ['The S1 value for Europe (or the nearest regional grouping) with its exact label, year and interval', 'A quote of 25 words or fewer from the table caption', 'A one-line verdict: does 9,155 appear, and under what label'],
     rows=['esanum-europe-9155', 'gbd-2017-franklin'], unlocks='Closes the trace on a figure that readers will keep meeting.', parent='who-europe-9155-reconcile', status='done',
     done_note='Partial, by an independent agent on 15 Oct 2026 (contributions/merged/gbd-2017-franklin-s1-europe-agent-seven.json): the main text prints no European figure and 9,155 is not in it; S1 sits behind browser checks at PMC, BMJ and Europe PMC. The global figure was re-verified against the full text, the row now cites the DOI, and a companion rate row was added. Reading S1 is now a task for a person with a browser.')
task('gbd-2017-s1-europe-by-hand', 'Open supplementary table S1 of Franklin 2020 in a browser and record the 2017 European rows', 'verify', 'S',
     'The regional values of the GBD 2017 drowning paper live in online supplementary table S1 (file injuryprev-2019-043484supp001.pdf at PubMed Central PMC7571364 or on the BMJ article page). Automated readers are refused by all three hosts. In a browser, open S1 and record, as printed, the 2017 drowning deaths, interval and age-standardised rate for every European row (Western, Central and Eastern Europe and any \'Europe\' or \'high-income\' grouping) with the exact row labels, then say whether 9,155 appears anywhere in the table.',
     ['https://pmc.ncbi.nlm.nih.gov/articles/PMC7571364/', 'https://injuryprevention.bmj.com/content/26/Suppl_2/i83', 'Rows: gbd-2017-franklin, gbd-2017-franklin-rate, esanum-europe-9155 (retired)'],
     ['One row per European grouping with the exact label, deaths, interval, rate, year and page', 'A quote of 25 words or fewer from the table caption', 'A one-line verdict on 9,155'],
     rows=['gbd-2017-franklin', 'esanum-europe-9155'], unlocks='Closes the trace on a figure that readers will keep meeting.', parent='gbd-2017-franklin-s1-europe', needs='browser')
task('franklin-2020-rate-interval', 'Franklin 2020: is the global age-standardised rate interval 3.8–4.1 or 3.6–4.1?', 'verify', 'S',
     'An agent reading the full text of Franklin et al. 2020 (GBD 2017) reported the global age-standardised drowning rate for 2017 as 4.0 with the interval printed as 3.8 to 4.1 in the abstract and 3.6 to 4.1 in the Discussion. Open the full text (the Brunel repository copy is readable by automated tools), find both passages, quote each (25 words or fewer) with its section, and say which the lab should cite.',
     ['https://bura.brunel.ac.uk/bitstream/2438/23369/1/FullText.pdf', 'Row: gbd-2017-franklin-rate'],
     ['Both passages quoted with their section', 'A proposed correction to row gbd-2017-franklin-rate if the abstract is not the figure to cite'],
     rows=['gbd-2017-franklin-rate'], unlocks='One interval, not two, behind a rate the lab cites.', parent='gbd-2017-franklin-s1-europe', status='done',
     done_note='Done by an independent agent on 15 Oct 2026 (contributions/merged/franklin-2020-rate-interval-agent-ten.json): the Abstract and the Results both print 3.8 to 4.1 (the Results with the UI label); the Discussion prints 3.6–4.1 once, in passing. The row cites 3.8 to 4.1 and says why. Whether the version of record differs from the repository copy is a follow-up.')
task('franklin-2020-version-of-record', 'Franklin 2020: does the BMJ version of record print the same two rate intervals as the repository copy?', 'verify', 'S',
     'The repository copy of Franklin et al. 2020 (Brunel, FullText.pdf) prints the global age-standardised drowning rate interval as 3.8 to 4.1 in the Abstract and Results and as 3.6–4.1 once in the Discussion. The Brunel copy may be an accepted manuscript. Open the version of record at the DOI, or the IHME GBD 2017 results tool, and report which interval the published article prints in each place, and whether an erratum exists.',
     ['https://doi.org/10.1136/injuryprev-2019-043484', 'https://vizhub.healthdata.org/gbd-results/', 'Row: gbd-2017-franklin-rate'],
     ['The interval as printed in the version of record, in each of the three places, with the section named', 'Or the GBD 2017 results tool value with its interval, as displayed', 'A proposed correction to the row if either differs from 3.8 to 4.1'],
     rows=['gbd-2017-franklin-rate'], unlocks='Settles which lower bound is the misprint.', parent='franklin-2020-rate-interval', needs='browser')
task('who-ghe-europe-9155-check', 'Does 9,155 · 1.0 per 100,000 match any WHO Global Health Estimates release for the European Region?', 'verify', 'S',
     'The retired press figure for Europe (9,155 drowning deaths, 1.0 per 100,000) sits beside WHO-region figures in the same article, so it may come from an earlier Global Health Estimates edition (2019 or 2021 releases) rather than from GBD. Open WHO\'s GHE regional death files or tables, find unintentional drowning (W65–W74) for the European Region in the 2019 and 2021 editions, and report whether any printed value is 9,155 or rounds to it, with the file, sheet and row label.',
     ['https://www.who.int/data/gho/data/themes/mortality-and-global-health-estimates/ghe-leading-causes-of-death', 'Rows: who-region-eur, esanum-europe-9155 (retired), who-ghe-2021'],
     ['The European Region drowning value in each GHE edition opened, as printed, with file and row label', 'A one-line verdict: does 9,155 appear, and in which edition'],
     rows=['who-region-eur', 'esanum-europe-9155'], unlocks='Either sources the stray figure or shows it has no WHO origin either.', parent='gbd-2017-franklin-s1-europe')

task('who-ghe-regional-unrounded', 'WHO GHE by region: the unrounded drowning deaths behind the printed 15,000, 66,000 and the rest, for 2019, 2021 and 2023', 'row', 'S',
     'WHO\'s Global Health Estimates page lists a regional file (deaths by WHO region, 2000–2023; the file name seen on 15 Oct 2026 was deaths_whoregion_2026-09-30.xlsx on cdn.who.int). The lab could not download it. Open the file, find the unintentional drowning rows (W65–W74), and return one row per WHO region per year for 2019, 2021 and 2023 with the unrounded death count and the rate, naming the sheet and the row label used.',
     ['https://www.who.int/data/gho/data/themes/mortality-and-global-health-estimates/ghe-leading-causes-of-death', 'Rows: who-region-wpr, who-region-sear, who-region-afr, who-region-emr, who-region-amr, who-region-eur, who-ghe-2021'],
     ['One row per region per year with the unrounded count, the rate and the file, sheet and row label', 'A note on whether the 2021 values match the report\'s rounded figures', 'Nothing summed across regions by the agent'],
     rows=['who-ghe-2021', 'who-region-eur'], unlocks='Exact figures behind the rounded ones, and a first look at 2023.', parent='who-europe-9155-reconcile')

task('flood-series-emdat', 'Compute flood drownings from EM-DAT for 2010–2024', 'row', 'M',
     'WHO states that drowning is 75% of deaths in flood disasters. The ledger carries one year (2019: 5,110 flood deaths, EM-DAT) and a lab band of 3,000–8,000 flood drownings a year. Using EM-DAT (free for research use; register at emdat.be) or CRED\'s annual reports, list total flood deaths for each year 2010–2024, apply 75%, and return one row per year plus a row for the 15-year mean, each citing the CRED report or EM-DAT query used.',
     ['https://www.emdat.be/', 'https://www.cred.be/publications', 'Rows: who-flood-share, emdat-flood-deaths-2019, flood-drowning-band'],
     ['One row per year 2010–2024 with the all-cause flood death count and its source', 'A separate row for 75% of the 15-year mean, marked as an estimate', 'No row combines flood drownings with any other count'],
     rows=['who-flood-share', 'emdat-flood-deaths-2019', 'flood-drowning-band'], unlocks='Retires a lab judgment (grade D) with a sourced series.')

task('ferry-database-totals', 'Find a current yearly count of ferry-accident deaths', 'row', 'M',
     'The ledger\'s only ferry figure is a 2014 press quote of the Worldwide Ferry Safety Association (800–1,000 deaths a year, "could be twice that"). Find the WFSA\'s own published database or reports, or another primary compilation (IMO GISIS casualty data, Interferry), and return yearly totals for the most recent five years available, with the counting rules the source states.',
     ['https://www.ferrysafety.org/', 'https://gisis.imo.org/', 'Row: ferry-wfsa'],
     ['Yearly totals with the source\'s own definition of a ferry and of a death', 'The URL of the table or report, not a news story', 'A note on what the count leaves out (small craft, unreported sinkings)'],
     rows=['ferry-wfsa', 'water-transport-other'], unlocks='A documented floor for ferries instead of a decade-old quote.')

task('fishing-overlap-method', 'How much of the fishing toll is already inside WHO\'s drowning figure? Test one country', 'method', 'L',
     'Fisher deaths are estimated at 24,000 to over 100,000 a year, and nobody has published how much of that is already counted inside WHO\'s unintentional-drowning figure (ICD-10 W65–W74) versus coded as water transport (V90, V92) or other causes. Pick one country with complete cause-of-death records and a real fishing fleet (for example Norway, Iceland, Australia, New Zealand, or a U.S. state such as Alaska). Find, for one recent year, how many fisher deaths were recorded and how they were coded. Return the counts, the codes, and the share that falls inside W65–W74.',
     ['Rows: fishing-ilo-1999, fishing-fao-32000, fishing-fsf-100000, icd-definition', 'Candidate sources: national maritime accident boards, statistics offices, occupational-safety agencies'],
     ['Counts with their ICD codes or the source\'s own categories, for a named year and country', 'The share inside W65–W74 stated as a fraction with its numerator and denominator', 'Status partial is fine if only categories, not codes, are available'],
     rows=['fishing-ilo-1999', 'fishing-fsf-100000', 'icd-definition'], unlocks='Turns the 0–100,000 band into an estimate with a method.')

task('setting-split-canada', 'Canada: drowning deaths by water setting, latest year', 'row', 'S',
     'WHO publishes no split of drowning deaths by water setting. Some countries do. For Canada, find the latest annual drowning report or dataset that breaks deaths down by location or setting and return one row per setting for the latest year.',
     ['Suggested source: Lifesaving Society Canada drowning report', 'Rows now in the ledger: canada-location-lakes-2018-22 and the other canada-location-* rows, canada-total-2022'],
     ['One row per setting with the count and the report\'s own setting names', 'The total for the year, as the report prints it, in a separate row', 'A note on the report\'s definition of drowning'],
     rows=['canada-total-2022', 'who-data-gaps'], unlocks='Extends the "which water" split to another country that counts.', status='done',
     done_note='Done by an independent agent on 15 Oct 2026 (contributions/merged/setting-split-canada-agent-four.json): seven setting shares for 2018–2022 and the 2022 total (560) from the 2026 National Drowning Data Snapshot, percentages only. The full report, with counts, is a follow-up task.')

task('canada-full-report-counts', 'Canada: counts per setting from the full 2026 Canadian Drowning Report, and the bathtubs-or-other check', 'row', 'S',
     'The ledger carries Canada\'s 2018–2022 setting split as percentages from a one-page snapshot. The full 2026 Canadian Drowning Report (Lifesaving Society Canada, lifesaving.org, file 361108) should hold the counts, and the printed page can settle a pairing the text extraction left ambiguous: whether 15% belongs to bathtubs and 7% to "other", or the reverse. Open the report, return one row per setting with the count for the latest period it prints, say whether 2022 is flagged as partial or missing British Columbia, and record the activity split (boating and the rest).',
     ['https://www.lifesaving.org/public-education/drowning-reports', 'Rows: canada-location-bathtubs-2018-22, canada-location-other-2018-22, canada-total-2022'],
     ['Counts per setting with the page', 'A one-line verdict on the bathtubs-or-other pairing', 'The activity split as printed, as separate rows'],
     rows=['canada-location-bathtubs-2018-22', 'canada-location-other-2018-22', 'canada-total-2022'], unlocks='Counts instead of shares, and a check on the one inferred pairing.', parent='setting-split-canada')

SPLIT_DONE = {
    'new-zealand': 'Partial, by an independent agent on 15 Oct 2026 (contributions/merged/setting-split-new-zealand-agent-six.json): the 2025 WSNZ report\'s text gives tidal 14, rivers 17, offshore 3, inland still 9 and the male coastal count; the Pools, Home and all-sex Coast counts sit in charts and a PDF that refuse automated readers. Total 78 (Feb 2026 printing) and 79 (Oct 2026 printing) both recorded. Nine rows added; reading the PDF is a follow-up task.',
    'united-states': 'Partial, by an independent agent on 15 Oct 2026 (contributions/merged/setting-split-united-states-agent-five.json): the setting split lives in CDC WONDER (ICD-10 W65–W74), which answers only an interactive session, so the agent returned what primary reports print: CPSC\'s pool-and-spa count for children (379 in 2023), the Coast Guard\'s 365 boating drownings for 2024, the MMWR\'s exact 2022 total (4,509) and CDC\'s location-by-age statements. Four rows added; the WONDER query is a follow-up task for a person with a browser.',
}
for country, hint in [('New Zealand', 'Water Safety New Zealand drowning statistics'), ('United States', 'CDC WONDER or WISQARS with place-of-occurrence codes'), ('Ireland', 'Water Safety Ireland drowning statistics')]:
    slug = country.lower().replace(' ', '-')
    task(f'setting-split-{slug}', f'{country}: drowning deaths by water setting, latest year', 'row', 'S',
         f'WHO publishes no split of drowning deaths by water setting (sea, river, lake, pool, home). Some countries do. For {country}, find the latest annual drowning report or dataset that breaks deaths down by location or setting ({hint}), and return one row per setting for the latest year, each citing the report page or dataset query.',
         [f'Suggested source: {hint}', 'Rows for comparison: australia-location-2024-25, uk-waid-2024'],
         ['One row per setting with the count and the report\'s own setting names', 'The total for the year, as the report prints it, in a separate row', 'A note on the report\'s definition of drowning (accidental only? all intents? water transport included?)'],
         rows=['australia-location-2024-25', 'uk-waid-2024', 'who-data-gaps'], unlocks='Extends the "which water" split to another country that counts.', status='done' if slug in SPLIT_DONE else 'open', done_note=SPLIT_DONE.get(slug))
task('cdc-wonder-setting-split-2024', 'United States: run the CDC WONDER query for 2024 deaths by ICD-10 code W65–W74, V90 and V92', 'row', 'S',
     'The United States counts where people drown, but the count lives in CDC WONDER (Underlying Cause of Death, 2018–2024, dataset D176) as ICD-10 codes: bathtub W65–W66, swimming pool W67–W68, natural water W69–W70, other specified W73, unspecified W74; watercraft drownings are V90 and V92. WONDER answers only an interactive session with its data-use agreement, so this needs a browser. Group results by ICD-10 code, select those codes, year 2024, and file one row per code with WONDER\'s own code titles, plus the W65–W74 total row. The 2024 total should sit near the MMWR\'s 2019–2022 totals (4,067 / 4,589 / 4,677 / 4,509).',
     ['https://wonder.cdc.gov/ucd-icd10-expanded.html', 'Rows for comparison: us-total-2022, us-location-shares-by-age, australia-location-2024-25, uk-waid-2024'],
     ['One row per ICD-10 code with the count and WONDER\'s code title, year 2024, with the query settings used', 'The W65–W74 total as a separate row', 'A note on suppressed cells, if any'],
     rows=['us-total-2022', 'who-data-gaps'], unlocks='The first US setting split in the ledger, and the row that lets the US join the gaps card.', parent='setting-split-united-states', needs='browser')
task('setting-split-new-zealand-pdf', 'New Zealand: the Pools, Home and all-sex Coast counts for 2025 from the report PDF', 'row', 'S',
     'The web edition of Water Safety New Zealand\'s 2025 Drowning Prevention Report prints counts for four of its seven environments; the Pools, Home and all-sex Coast counts sit in embedded charts and in the PDF, which Dropbox refuses to serve to automated readers. In a browser, open the PDF from the report page, and record the 2025 count for Pools, Home and Coast (all sexes), any \'Other\' environment, and the report\'s own definition of a preventable drowning, each with the page.',
     ['https://www.watersafetynz.org/drowning-insights/latest-drowning-report', 'Rows: new-zealand-location-pools-2025, new-zealand-location-home-2025, new-zealand-location-coast-men-2025, new-zealand-total-2025'],
     ['Corrections replacing the four placeholder rows (Pools, Home, Underwater, Other recreation) with printed counts and pages', 'The all-sex Coast count as a new row', 'The definition of preventable drowning, quoted (25 words or fewer) with the page'],
     rows=['new-zealand-location-pools-2025', 'new-zealand-location-home-2025', 'new-zealand-location-coast-men-2025', 'new-zealand-activity-underwater-2025', 'new-zealand-activity-other-recreation-2025'], unlocks='Completes a seven-environment and six-activity split for one country that counts.', parent='setting-split-new-zealand', needs='browser')
task('new-zealand-activity-split-2025', 'New Zealand: drowning deaths by activity for 2025, from the same report', 'row', 'S',
     'The 2025 WSNZ report\'s web edition prints deaths by activity (the agent saw Swimming 15, Craft 17, Fishing from land 10, Slips and falls 24, and Underwater and Other recreation sections). Open the report page, read each activity section, and return one row per activity with the printed count and any 2024 comparison, as printed.',
     ['https://www.watersafetynz.org/drowning-insights/latest-drowning-report', 'Rows: new-zealand-total-2025, new-zealand-location-rivers-2025'],
     ['One row per activity with the count as printed and the section name', 'Nothing summed by the agent; the rows need not reach the total'],
     rows=['new-zealand-total-2025'], unlocks='Activity is the second axis the register needs, and few countries print it.', parent='setting-split-new-zealand', status='done',
     done_note='Partial, by an independent agent on 15 Oct 2026 (contributions/merged/new-zealand-activity-split-2025-agent-eleven.json): swimming 15, craft 17, fishing from land 10 and slips and falls 24 as printed; underwater and other recreation sit in charts and the PDF, so they are gap rows. Six rows added; the PDF reading is part of setting-split-new-zealand-pdf.')
task('uscg-boating-2025-update', 'Record the 2025 U.S. Coast Guard Recreational Boating Statistics when published', 'row', 'S',
     'The Coast Guard\'s 2025 edition was listed as pending on 15 Oct 2026 (the 2024 edition came out on 24 June 2025). When it appears, record the total deaths, the drowning count and the life-jacket figures as printed, with table and page, and propose corrections to uscg-boating-2024 and us-location-boating-2024 only if the 2024 figures were revised.',
     ['https://uscgboating.org/statistics/accident_statistics.php', 'Rows: uscg-boating-2024, us-location-boating-2024'],
     ['Status not-found if the edition is still pending, with the date checked', 'Otherwise one row for the year with the printed figures, table and page'],
     rows=['uscg-boating-2024', 'us-location-boating-2024'], unlocks='The one US setting figure that refreshes on a fixed annual cycle.', parent='setting-split-united-states')

task('migrants-iom-by-route', 'Migrants at sea: replace press-reported IOM figures with the Missing Migrants Project\'s own data, by sea route and year', 'row', 'M',
     'The ledger\'s migrant row (~4,200 deaths and disappearances on three sea routes in 2025, plus ~1,500 estimated in unrecorded wrecks) comes from a press report of IOM figures (grade C). Open the IOM Missing Migrants Project data portal, download or read the recorded deaths and disappearances for 2023, 2024 and 2025 for each sea route (central, eastern and western Mediterranean; the Atlantic route to the Canary Islands; others the portal lists), and return one row per route per year with IOM\'s own counting rules (what counts as a death at sea, how disappearances are recorded, what "invisible shipwrecks" means and whether IOM publishes an estimate for them).',
     ['https://missingmigrants.iom.int/', 'Row: migrants-2025-sea-routes', 'Note: the portal may require a browser; the API or CSV download is the primary'],
     ['One row per route per year with the count, the route name as IOM prints it, and the URL of the data page or file', 'A separate row for any IOM estimate of unrecorded deaths, labelled as an estimate', 'Nothing summed across routes by the agent; IOM\'s own totals only'],
     rows=['migrants-2025-sea-routes'], unlocks='Turns the migrants layer of the toll from a press summary into the source itself.')

task('intentional-drowning-who-mdb', 'Intentional drowning: counts from the WHO Mortality Database for reporting countries', 'row', 'M',
     'The ledger has no figure for intentional or undetermined-intent drowning (ICD-10 X71, Y21). Using the WHO Mortality Database (the online portal or its downloadable files), find the number of deaths coded X71 and Y21 for the most recent year available, for the set of countries that report, and return those totals with the number of reporting countries and the year, clearly labelled "reporting countries only, not a global estimate".',
     ['https://platform.who.int/mortality', 'Row: intentional-drowning, icd-definition'],
     ['Two rows (X71, Y21) with year, count, and number of reporting countries', 'A note that the figure is not global', 'The portal query or file name used'],
     rows=['intentional-drowning', 'icd-definition'], unlocks='An honest partial row instead of a blank.')

task('transport-series-national', 'National water-transport death series: UK, Canada, Australia', 'row', 'M',
     'There is no global yearly count of deaths in water transport. Several countries publish one. Find the latest five years of water-transport or boating fatality counts from the UK Marine Accident Investigation Branch annual report, the Transportation Safety Board of Canada marine statistics, and the Australian Transport Safety Bureau or Australian Maritime Safety Authority, and return one row per country per year with the counting rules each source states.',
     ['https://www.gov.uk/government/organisations/marine-accident-investigation-branch', 'https://www.tsb.gc.ca/', 'https://www.amsa.gov.au/', 'Row: water-transport-other, uscg-bard'],
     ['Rows with year, count, and the source\'s definition (commercial only? recreational included?)', 'Each row cites a report or table, not a press release', 'Nothing summed across countries'],
     rows=['water-transport-other', 'uscg-bard'], unlocks='The first pieces of a transport sub-ledger.')

task('nonfatal-ratio-primary', 'Where does "4–5 non-fatal drownings per death" come from? It is not in the WHO 2024 report', 'verify', 'M',
     'The ledger carried "4–5 non-fatal drownings per death" attributed to the WHO 2024 report. The report says (p. 6) that accurate global data on non-fatal drowning are largely unavailable; the fact sheet gives no ratio. Find the primary origin of the claim or declare it unsupported.',
     ['https://www.who.int/publications/i/item/9789240103962', 'https://www.who.int/news-room/fact-sheets/detail/drowning', 'Rows: who-nonfatal (retired), cdc-nonfatal-ed-2012-2021, ontario-nonfatal-ed-ratio-2014-2023, australia-nonfatal-hospitalisation-ratio-2002-2015'],
     ['A quote of 25 words or fewer with page or section, from a primary document, or status not-found with what was tried', 'A correction to row who-nonfatal: source, url, grade', 'No ratio stated as fact without a document behind it'],
     rows=['who-nonfatal', 'cdc-nonfatal-ed-2012-2021'], unlocks='Either sources a number the whole field repeats, or retires it.', status='done',
     done_note='Done by an independent agent on 15 Oct 2026 (contributions/nonfatal-ratio-primary-agent-two.json): after reading the WHO 2024 and 2014 reports, the fact sheet and thirteen other documents, no primary states 4–5; the figure appears only in a press article with no source. The row was retired and three counted, place-specific ratios were added.')

task('cdc-2014-children-five', 'Open an archived copy of the October 2014 CDC "Unintentional Drowning: Get the Facts" page and record its children\'s "another five" ratio', 'verify', 'S',
     'Several papers and reports (BMJ Open 2015;5:e008444; Safe Kids, Dangerous Waters, 2016) cite a CDC fact page from October 2014 for the statement that for every child who dies from drowning, another five receive emergency department care. The page is no longer on a CDC server. Find an archived copy (the Internet Archive\'s Wayback Machine, or CDC Stacks), quote the sentence with the data years it covers, and return it as a row.',
     ['https://web.archive.org/', 'https://stacks.cdc.gov/', 'Row for comparison: cdc-children-nonfatal-ed-7 (the current CDC document says seven)'],
     ['A quote of 25 words or fewer from the archived page with its capture date', 'The data years the ratio covers, as the page states them', 'A row with grade A if the archived page is CDC\'s own'],
     rows=['cdc-children-nonfatal-ed-7'], unlocks='The primary behind a figure that a dozen secondary sources repeat.', parent='nonfatal-ratio-primary')

task('nonfatal-ratios-by-place', 'Non-fatal to fatal drowning ratios by place and by door: NSW ambulance, New Zealand under-5, Alberta', 'row', 'M',
     'The ledger now carries three counted ratios (United States emergency departments 2.0; Ontario emergency departments 3.6; Australia hospital admissions 2.71). An independent agent found three more it did not have room to return as rows: New South Wales ambulance-attended incidents 1:15 (Journal of Safety Research 2024;91:373–380); New Zealand children under five 6.9 hospitalisations and 74.7 ACC claims per fatal drowning (Aust N Z J Public Health 2022;46(1):46–51); Alberta 6 non-fatal per fatal (Lifesaving Society Alberta and NWT, 28 July 2021). Open each source, confirm the figure, and return one row per source with its denominator (ambulance, hospital, claims) and years.',
     ['https://researchonline.jcu.edu.au/85178/1/85178.pdf', 'https://www.lifesaving.org/about/news/post/20-year-analysis-on-drowning', 'Rows: ontario-nonfatal-ed-ratio-2014-2023, australia-nonfatal-hospitalisation-ratio-2002-2015, cdc-nonfatal-ed-2012-2021'],
     ['One row per source with the ratio as printed, the denominator named, the years and the page', 'A quote of 25 words or fewer per source', 'Nothing averaged across places or denominators'],
     rows=['ontario-nonfatal-ed-ratio-2014-2023', 'australia-nonfatal-hospitalisation-ratio-2002-2015'], unlocks='Shows how much the ratio depends on which door is counted, which is the argument against any single global ratio.', parent='nonfatal-ratio-primary')

task('exposure-any-published', 'Is there any published measure of boating or swimming exposure (trips, hours, launches)?', 'method', 'M',
     'Every drowning rate is per resident, not per trip or hour on the water. Search for any published exposure measure: national boating participation surveys with trips per year (for example the U.S. National Recreational Boating Survey), beach attendance counts from lifeguard services, or harbor launch counts. Return what exists, with its definition, year and source, and a judgment of whether a risk-per-trip figure could be computed from it.',
     ['https://uscgboating.org/', 'https://www.usla.org/page/statistics', 'Row: exposure-denominators'],
     ['At least one row per exposure measure found, with unit (trips, hours, visits) and year', 'A note on whether deaths and exposure use compatible definitions', 'Status not-found with what was tried is acceptable'],
     rows=['exposure-denominators'], unlocks='The first denominator for a real risk figure.')

for state, hint in [('New Hampshire', 'the Office of the Chief Medical Examiner annual report, NH DHHS, or CDC WONDER (ICD-10 W65–W74, V90, V92) filtered to NH'), ('Maine', 'the Maine CDC, the Office of the Chief Medical Examiner, or CDC WONDER filtered to Maine')]:
    slug = state.lower().replace(' ', '-')
    task(f'state-counts-{slug}', f'{state}: drowning deaths by year and by water, latest five years', 'row', 'M',
         f'The lab sits on Portsmouth Harbor, on the {state} side of the Piscataqua, and the ledger has no yearly count of drowning deaths for {state}. Find an official count for each of the latest five available years ({hint}), and, if the source breaks deaths down by place or activity (sea, river, lake, pool, boating), return that split too. One row per year; one row per setting per year if available.',
         [f'Suggested source: {hint}', 'Rows for comparison: us-cdc-4345, uscg-boating-2024', 'Local rows: piscataqua-current, ndbc-44007-water-temp'],
         ['One row per year with the count and the source\'s definition (accidental only? all intents? water transport included?)', 'A quote of 25 words or fewer from the report or the query page', 'Nothing summed across years or settings'],
         rows=['us-cdc-4345', 'uscg-boating-2024'], unlocks=f'The first local denominator: how many a year, and in which water, in {state}.')

task('rnli-rss-feed-access', 'Why does the RNLI news feed return HTTP 403 to the watch, and what address or headers work?', 'verify', 'S',
     'The watch (watch/sources.json) reads https://rnli.org/news-and-media/rss with the user agent "lifesavinglab-watch/1.0" and gets HTTP 403 (first run, 15 Oct 2026). Find out whether the RNLI publishes an RSS or Atom feed of its news or lifeboat launches, what its working address is, and whether it refuses non-browser user agents. Return the address that works and any header it needs, or status not-found with what was tried.',
     ['https://rnli.org/news-and-media', 'watch/sources.json', 'watch/queue.json (the runs list shows the error)'],
     ['A feed address confirmed to return items, with the date of the newest item', 'The request headers that work, if any are needed', 'A note on the feed\'s terms of use if the site states them'],
     rows=[], unlocks='Turns on the most complete official source of rescues in the UK and Ireland.')

task('leeway-values-piw-raft', 'Leeway: the recommended drift values for a person in the water and a small life raft, from the Coast Guard\'s own tables', 'row', 'M',
     'For the June exercise the lab wants a drift worksheet whose numbers come from a primary source. The U.S. Coast Guard R&D Center report "Review of Leeway: Field Experiments and Implementation" (Allen & Plourde, April 1999, CG-D-08-99, DTIC ADA366414) has Table 8-1 "Recommended Leeway Speed and Direction Values"; a later report by Allen (2005, "Leeway Divergence", CG-D-05-05) refines them. The lab could read only the first 88,000 characters of the 1999 PDF and Table 8-1 was not in them. Find Table 8-1 (or the 2005 equivalent) and return one row per object class for: person in water (vertical, sitting, horizontal/deceased), life raft 4–6 person (with and without drogue or ballast), skiff or small open boat, sea kayak, surfboard. Each row: leeway speed as a percentage of the 10 m wind speed (with any offset), the divergence angle, and the table and page.',
     ['https://apps.dtic.mil/sti/pdfs/ADA366414.pdf (automated readers get only the first 88,000 characters; Table 8-1 starts on p. 8-5, inside section 8.3, pp. 8-4 to 8-13, and the coefficients are in Appendix B)', 'Full OCR text, 568 KB: https://archive.org/download/DTIC_ADA366414/DTIC_ADA366414_djvu.txt', 'Allen, A.A. (2005) Leeway Divergence, USCG R&D Center CG-D-05-05, DTIC ADA435435 (not served by DTIC on 15 Oct 2026; NTRL lists it)', 'Rows for context: hf-radar-search-area, giesbrecht-1-10-1'],
     ['One row per object class with the printed value, the table number and the page', 'A quote of 25 words or fewer from the table caption or the text that introduces it', 'No value taken from a secondary summary; the report itself'],
     rows=['hf-radar-search-area'], unlocks='A drift worksheet for day two with every coefficient traceable to the Coast Guard\'s own tables.')
task('leeway-sar-addendum-h7', 'Leeway: Table H-7 and H-7a of the Coast Guard SAR Addendum, the current operational values', 'row', 'M',
     'The Coast Guard\'s current leeway table is Table H-7, "Leeway Speed and Direction Values for Drift Objects" (p. H-28), with sub-table H-7a for maritime life rafts (p. H-30), in the SAR Addendum COMDTINST M16130.2F (2013). Automated readers get only the first 120,000 characters of the PDF. Open the Addendum far enough to read H-28 to H-30 and return one row per object class for: person in water (vertical, sitting, horizontal), life raft 4–6 person (with and without drogue or ballast), skiff or small open boat, sea kayak, surfboard: leeway speed as a percentage of wind speed with any offset, divergence angle, table and page. Record which edition the values come from; they are compared with Table 8-1 of the 1999 report, never merged with it.',
     ['https://www.dco.uscg.mil/Portals/9/CG-5R/manuals/COMDTINST%20M16130.2F.pdf', 'Rows for context: hf-radar-search-area, leeway-definition'],
     ['One row per object class with the printed value, table and page, and the edition named', 'A quote of 25 words or fewer from the table caption', 'No value from a secondary summary'],
     rows=['hf-radar-search-area'], unlocks='The operational numbers for the day-two drift worksheet.', parent='leeway-values-piw-raft')

task('official-feeds-five-services', 'Find working news or incident feeds for five official rescue services the watch could read', 'verify', 'M',
     'The watch (watch/sources.json) reads public feeds every hour and keeps only links, dates and a derived kind. It has one official source enabled (none working: the RNLI feed returns 403, the U.S. Coast Guard address is unconfirmed) and leans on news searches. Find RSS or Atom feeds, or a JSON endpoint, for five of: Surf Life Saving Australia, Royal Life Saving Australia, Maritime New Zealand, the Irish Coast Guard, the Canadian Coast Guard, the Dutch KNRM, the German DGzRS, the Norwegian Redningsselskapet, the Spanish Salvamento Marítimo, the Italian Guardia Costiera. For each: the exact feed address, confirmed to return items, the date of the newest item, the kind of content (press releases, incident log, rescue statistics), and any stated terms of use.',
     ['watch/sources.json', 'watch/README.md', 'Note: a feed that needs a browser user agent is still useful; say which header it needs'],
     ['Five feed addresses confirmed to return items, each with the newest item\'s date', 'The content kind of each, in one line', 'Status partial with fewer than five is fine if what was tried is listed'],
     rows=[], unlocks='Official sources for the watch beyond the English-language press.')

task('uscg-rss-feed-address', 'Confirm the RSS feed address for U.S. Coast Guard news releases', 'verify', 'S',
     'The watch (watch/sources.json) carries two trial addresses for Coast Guard news releases at news.uscg.mil, neither confirmed. The site is built on AFPIMS/DNN, where feeds look like /DesktopModules/ArticleCS/RSS.ashx?ContentType=<1 for News, 2 for Press Releases>&Site=<id>&max=30; sibling sites print theirs (MARFORRES Site=537, navy.mil Site=1067). Automated readers are refused by the RSS.ashx handler and get the page\'s links stripped, so this needs a browser: open https://www.news.uscg.mil/, view the page source, search for RSS.ashx, read the Site and ContentType values, paste the address into a feed reader and confirm it returns items. Also look for a national GovDelivery topic (District 7 publishes https://public.govdelivery.com/topics/USDHSCG_164/feed.rss; a national topic would cover every district).',
     ['https://www.news.uscg.mil/', 'watch/sources.json', 'contributions/merged/uscg-rss-feed-address-agent-eight.json: what an assistant without a browser could and could not establish', 'Ruled out: Site=1041 answers HTTP 404 with ContentType=1 and times out with ContentType=2 (GitHub runner, 15 Oct 2026), so the site id is wrong. The District 7 GovDelivery feed works and is enabled.'],
     ['The exact feed URL, confirmed to return items', 'The date of the newest item seen'],
     rows=[], unlocks='Turns on the most useful official source for the watch.', needs='browser')

pre = open(os.path.join(HERE, 'prompt-preamble.md'), encoding='utf8').read()
ver = re.search(r'prompt-preamble v([0-9.]+)', pre).group(1)
pre = re.sub(r'^<!--.*?-->\n', '', pre, count=1, flags=re.S)
# Receipts are the record: a rebuild carries each task's latest accepted receipt id so the board never forgets who did the work.
try:
    with open(os.path.join(HERE, '..', 'receipts', 'lend.json'), encoding='utf8') as f:
        _receipts = json.load(f).get('receipts', [])
    for t in T:
        for rc in _receipts:  # newest first
            if rc.get('task_id') == t['id'] and rc.get('decision') == 'accepted':
                t['done_receipt'] = rc['id']; break
except (OSError, ValueError):
    pass

out = {"schema": "lifesavinglab.tasks.v1", "version": "0.1.0", "generated": "2026-10-15", "preamble_version": ver, "preamble": pre,
       "note": "Small tasks an agent can finish in one session. Claims lapse after seven days. Every accepted bundle earns a receipt.",
       "tasks": T}
with open(os.path.join(HERE, 'tasks.json'), 'w', encoding='utf8') as f:
    json.dump(out, f, indent=1, ensure_ascii=False)
print(len(T), 'tasks')
