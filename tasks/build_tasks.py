"""Builds tasks/tasks.json: the board of small tasks an agent can do in one session. Run after editing. Keep ids stable."""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
LEDGER = 'https://raw.githubusercontent.com/ethanhawkes-gif/thelifesavinglab-open-data/main/seeds/ledger.json'


T = []
def task(id, title, kind, size, ask, inputs, accept, rows=None, unlocks='', parent=None):
    T.append(dict(id=id, title=title, kind=kind, size=size, status='open', ask=ask, inputs=inputs, accept=accept, rows=rows or [],
                  unlocks=unlocks, parent=parent, claimed_by=None, claimed_until=None, created='2026-10-15', done_receipt=None))

for region, rid, fig in [('South-East Asia', 'who-region-sear', '~83,000'), ('Africa', 'who-region-afr', '~77,000 · 5.7 per 100,000'),
                         ('Eastern Mediterranean', 'who-region-emr', '~36,000'), ('Americas', 'who-region-amr', '~16,500'), ('Europe', 'who-region-eur', '9,155 · 1.0 per 100,000')]:
    task(f'verify-{rid}', f'Verify the {region} drowning figure for 2021 against the WHO report', 'verify', 'S',
         f'The ledger carries "{fig}" for the WHO {region} Region in 2021, taken from a secondary summary (grade C). Open the WHO Global status report on drowning prevention 2024 (ISBN 9789240103962), find the table or figure that gives drowning deaths and the rate per 100,000 by WHO region for 2021, and report the exact value for the {region} Region as printed, with the page or table. If the report gives an uncertainty interval, include it.',
         ['https://www.who.int/publications/i/item/9789240103962', 'Row to verify: ' + rid],
         ['A correction or confirmation for row ' + rid + ' citing a page or table in the WHO report', 'A quote of 25 words or fewer from that page', 'Grade proposed: A if read from the report itself'],
         rows=[rid], unlocks='Upgrades the row from C to A; the region chart becomes citable.')

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

for country, hint in [('Canada', 'Lifesaving Society Canada drowning report'), ('New Zealand', 'Water Safety New Zealand drowning statistics'), ('United States', 'CDC WONDER or WISQARS with place-of-occurrence codes'), ('Ireland', 'Water Safety Ireland drowning statistics')]:
    slug = country.lower().replace(' ', '-')
    task(f'setting-split-{slug}', f'{country}: drowning deaths by water setting, latest year', 'row', 'S',
         f'WHO publishes no split of drowning deaths by water setting (sea, river, lake, pool, home). Some countries do. For {country}, find the latest annual drowning report or dataset that breaks deaths down by location or setting ({hint}), and return one row per setting for the latest year, each citing the report page or dataset query.',
         [f'Suggested source: {hint}', 'Rows for comparison: australia-location-2024-25, uk-waid-2024'],
         ['One row per setting with the count and the report\'s own setting names', 'The total for the year, as the report prints it, in a separate row', 'A note on the report\'s definition of drowning (accidental only? all intents? water transport included?)'],
         rows=['australia-location-2024-25', 'uk-waid-2024', 'who-data-gaps'], unlocks='Extends the "which water" split to another country that counts.')

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

task('nonfatal-ratio-primary', 'Find the primary statement behind "4–5 non-fatal drownings per death"', 'verify', 'S',
     'The ledger carries "4–5 non-fatal drownings per death" from a secondary summary of the WHO 2024 report. Find where WHO (or the peer-reviewed study WHO cites) states this ratio, quote it, and give the page. If WHO states a different ratio or a range, report that instead.',
     ['https://www.who.int/publications/i/item/9789240103962', 'https://www.who.int/news-room/fact-sheets/detail/drowning', 'Row: who-nonfatal'],
     ['A quote of 25 words or fewer with page or section', 'A correction to row who-nonfatal if the wording differs'],
     rows=['who-nonfatal'], unlocks='Upgrades the survivors figure to grade A.')

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

task('uscg-rss-feed-address', 'Confirm the RSS feed address for U.S. Coast Guard news releases', 'verify', 'S',
     'The watch (watch/sources.json) has the U.S. Coast Guard news feed disabled because its RSS address is unconfirmed. Find the working RSS or Atom feed URL for news releases at news.uscg.mil (the site is built on AFPIMS/DNN; feeds usually look like /DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=<id>&max=30). Confirm it returns XML with recent items and return the exact URL.',
     ['https://www.news.uscg.mil/', 'watch/sources.json'],
     ['The exact feed URL, confirmed to return items', 'The date of the newest item seen'],
     rows=[], unlocks='Turns on the most useful official source for the watch.')

pre = open(os.path.join(HERE, 'prompt-preamble.md'), encoding='utf8').read()
ver = re.search(r'prompt-preamble v([0-9.]+)', pre).group(1)
pre = re.sub(r'^<!--.*?-->\n', '', pre, count=1, flags=re.S)
out = {"schema": "lifesavinglab.tasks.v1", "version": "0.1.0", "generated": "2026-10-15", "preamble_version": ver, "preamble": pre,
       "note": "Small tasks an agent can finish in one session. Claims lapse after seven days. Every accepted bundle earns a receipt.",
       "tasks": T}
with open(os.path.join(HERE, 'tasks.json'), 'w', encoding='utf8') as f:
    json.dump(out, f, indent=1, ensure_ascii=False)
print(len(T), 'tasks')
