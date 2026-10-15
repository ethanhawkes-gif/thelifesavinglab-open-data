import json, os
OUT = os.path.dirname(os.path.abspath(__file__))

# Measure grades: A = recommended by WHO; B = modeled or peer-reviewed evidence; C = established practice, outcome unmeasured; D = open question, a lab pilot
def m(text, grade, src=None):
    d = {"text": text, "grade": grade}
    if src: d["rows"] = src
    return d

N = {}
def q(id, question, help, options, principle=None):
    N[id] = {"type": "question", "q": question, "help": help, "options": options}
    if principle: N[id]["principle"] = principle
def leaf(id, title, summary, measures, count, adopter, track=None, unknown=None, rows=None):
    N[id] = {"type": "leaf", "title": title, "summary": summary, "measures": measures, "count": count, "adopter": adopter,
             "track": track, "unknown": unknown, "rows": rows or []}

q("now", "Is someone in the water right now?",
  "The tree starts here every time. Nothing on this site dispatches help.",
  [{"label": "Yes", "sub": "Someone is in the water or missing on it", "to": "emergency"},
   {"label": "No", "sub": "I want to prevent the next one", "to": "water"}])

N["emergency"] = {"type": "emergency", "title": "Get help moving first.",
  "steps": [
    {"h": "On the sea, a harbor or a river", "p": "Call VHF channel 16 or the Coast Guard. In the United States, 911 also reaches them. Give a position, how many people, and the water."},
    {"h": "Anywhere else", "p": "Call your local emergency number."},
    {"h": "Someone on a bridge, or thinking of harm", "p": "In the United States call or text 988. Stay with them if you safely can."},
    {"h": "Reach or throw. Don't go.", "p": "Keep your eyes on the person. Reach with anything long, throw anything that floats. Enter the water only if you are trained and equipped: untrained rescuers drown."},
    {"h": "Cold water", "p": "The first minute is the gasp. Tell the person to float and get their breathing under control before trying to swim."}
  ],
  "note": "These are the actions responders teach. They are not a substitute for a call."}

q("water", "Which water?",
  "A measure that works in a pool does nothing in a tide. Name the water first, then the person, then the measure.",
  [{"label": "Open sea and coast", "sub": "Surf, rocks, cold water, offshore", "to": "sea"},
   {"label": "Harbor, river, estuary", "sub": "Currents, working boats, docks, bridges", "to": "harbor"},
   {"label": "Lake, pond, reservoir, canal", "sub": "Still water, ice in winter", "to": "lake"},
   {"label": "Pool and spa", "sub": "Home or public", "to": "pool"},
   {"label": "The home", "sub": "Bath, bucket, well, tank", "to": "home-under5"},
   {"label": "Flood water", "sub": "River flood, flash flood, storm surge", "to": "flood"}],
  principle="The water decides the measure.")

q("sea", "Who is at risk on the open sea and coast?", "Pick the person the measure is for.",
  [{"label": "Swimmers and surfers", "sub": "Beaches, rocks, rips, cold water", "to": "sea-swimmers"},
   {"label": "People in small craft", "sub": "Kayaks, dinghies, recreational boats", "to": "sea-small-craft"},
   {"label": "Fishing crews and workers", "sub": "Commercial and artisanal", "to": "sea-fishing"},
   {"label": "Passengers", "sub": "Ferries, overloaded or unsafe vessels, migrant crossings", "to": "sea-passengers"}])

q("harbor", "Who is at risk in the harbor or river?", "Pick the person the measure is for.",
  [{"label": "Working boats and crews", "sub": "Lobster boats, tugs, pilots, charters", "to": "harbor-working"},
   {"label": "Recreational boaters and paddlers", "sub": "Including the four-knot Piscataqua", "to": "harbor-recreational"},
   {"label": "People on foot near the water", "sub": "Docks, rocks, seawalls, bridges", "to": "harbor-foot"},
   {"label": "Children and teens", "sub": "Jumping, swimming, wading", "to": "harbor-children"}])

q("lake", "Who is at risk at the lake?", "Pick the person the measure is for.",
  [{"label": "Children under 5", "sub": "Near water at home or on holiday", "to": "lake-under5"},
   {"label": "Children 5–14 and teens", "sub": "Swimming, playing, ice", "to": "lake-children"},
   {"label": "Adults", "sub": "Swimming, boating, fishing, ice", "to": "lake-adults"}])

q("pool", "Who is at risk at the pool?", "Pick the person the measure is for.",
  [{"label": "Children under 5", "sub": "The leading pool risk", "to": "pool-under5"},
   {"label": "Children and teens", "sub": "", "to": "pool-children"},
   {"label": "Adults", "sub": "", "to": "pool-adults"}])

q("flood", "Where are you in the flood?", "Pick the situation the measure is for.",
  [{"label": "A community, before the flood", "sub": "Planning, warning, routes", "to": "flood-before"},
   {"label": "A household, in a flood", "sub": "Water is rising now", "to": "flood-during"}])

leaf("sea-swimmers", "Swimmers and surfers on the open coast",
  "Most coastal swimming deaths involve rips, cold water, or swimming where no one is watching. The measures with the best evidence are skills and supervision; the cold-water clock is still a question.",
  [m("Basic swimming, water-safety and safe-rescue skills for school-age children", "A", ["who-prevention-measures"]),
   m("Lifeguarded swimming areas, flags and local hazard signs: at USLA-guarded beaches the chance of drowning is about 1 in 18 million", "C", ["usla-guarded-risk"]),
   m("Rip-current and float-first public messaging", "C"),
   m("A hand-size card on time in cold water (1 minute to control breathing, 10 of useful movement, about 1 hour), tested by the people it is for", "D", ["giesbrecht-1-10-1"])],
  ["where (named beach or coordinates)", "water temperature", "lifeguard present or not", "rip current reported", "activity", "minutes from alarm to reaching the person", "outcome"],
  "A beach patrol, a town recreation department, a surf club", "clock",
  "No one publishes a global split of drownings by water setting, so the size of this branch is unknown.", ["who-prevention-measures", "who-data-gaps"])

leaf("sea-small-craft", "People in small craft offshore",
  "In the United States three in four boating deaths are drownings and 87% of those who drowned wore no life jacket. Wearing one is the strongest single measure with evidence behind it.",
  [m("Set and enforce safe boating rules", "A", ["who-prevention-measures"]),
   m("Always wear a life jacket: boaters who wore one drowned at about half the rate of those who did not (risk ratio 0.51)", "B", ["cummings-pfd-2011", "uscg-boating-2024", "peterson-us-348"]),
   m("Boating safety instruction: about 70% of US deaths involve an operator with none (an association, not proof)", "C", ["uscg-boating-2024"]),
   m("A late-boat watch a small harbor can run this season", "D"),
   m("A one-page drift sheet whose error grows honestly", "D", ["hf-radar-search-area"])],
  ["vessel type and length", "persons aboard", "life jackets worn", "float plan filed", "wind, sea state, water temperature", "minutes overdue before the alarm", "who responded", "outcome"],
  "A harbormaster, a marina, a paddling club", "signal", None, ["uscg-boating-2024", "peterson-us-348"])

leaf("sea-fishing", "Fishing crews and workers",
  "Somewhere between 24,000 and more than 100,000 fishers die each year, depending on who counts. Most work on boats the treaties do not reach. The first measure here is to count.",
  [m("Safe shipping and vessel rules; the Cape Town Agreement enters into force on 24 Feb 2027 for vessels of 24 m and over", "A", ["who-prevention-measures", "cape-town-agreement"]),
   m("One rule or one piece of kit for boats under the treaty size", "D"),
   m("Life jackets designed for working on deck", "C"),
   m("A report short enough that a tired harbor will file it", "D", ["who-data-gaps"])],
  ["vessel length and type", "crew aboard", "life jackets worn", "activity (hauling, transit, moored)", "weather", "time of day", "outcome", "who reported it, and to whom"],
  "A fishing co-op, a fisheries safety body, a harbormaster", "register",
  "How much of the fishing toll is already inside WHO's 300,000 is unresolved.", ["fishing-ilo-1999", "fishing-fao-32000", "fishing-fsf-100000"])

leaf("sea-passengers", "Passengers on ferries and unsafe vessels",
  "Ferry deaths run to perhaps a thousand or two a year by an old estimate; deaths on migrant crossings were at least 3,650 in the year to May 2025. Neither is inside the core count.",
  [m("Set and enforce safe shipping and ferry rules, including regular inspections", "A", ["who-prevention-measures"]),
   m("Overloading enforcement and passenger counts at the dock", "C", ["ferry-wfsa"]),
   m("Search and rescue at sea for crossings: a state and NGO task; the lab keeps the count, not a pilot", "C", ["migrants-maritime-sep24-may25"]),
   m("A global yearly series for water-transport deaths, which does not exist", "D", ["water-transport-other"])],
  ["vessel", "persons aboard and capacity", "life jackets aboard", "route", "weather", "deaths and missing, separately", "source of the count"],
  "A flag state, a port authority, a ferry operator", "register",
  "No global series for water-transport deaths: the largest unmeasured piece of the toll.", ["ferry-wfsa", "water-transport-other", "migrants-maritime-sep24-may25"])

leaf("harbor-working", "Working boats and crews in the harbor",
  "A working harbor still learns about a late boat from a cousin. The measures here are cheap and old: a watch, a radio, a jacket, and a form.",
  [m("A late-boat watch a small harbor can run this season", "D"),
   m("A VHF radio carried, channel 16 known by every crew member", "C"),
   m("Life jackets worn on deck", "C", ["uscg-boating-2024"]),
   m("A hand-size card on time in cold water", "D"),
   m("A report short enough that a tired harbor will file it", "D")],
  ["vessel", "crew", "departure and expected return", "life jackets", "water temperature", "minutes overdue before the alarm", "outcome"],
  "A harbormaster, a fishing co-op, a Coast Guard station", "signal", None, [])

leaf("harbor-recreational", "Recreational boaters and paddlers in a river mouth",
  "The Piscataqua runs over four knots on the ebb at its fastest, by NOAA's Coast Pilot. A kayak paddles about three. The sea here is near 12 °C in June. The measures are a jacket, a plan, and respect for the tide table.",
  [m("Always wear a life jacket: about half the drowning risk for boaters who wear one", "B", ["cummings-pfd-2011", "uscg-boating-2024"]),
   m("Boating safety instruction before the first trip", "C", ["uscg-boating-2024"]),
   m("A float plan left with someone ashore; a late-boat watch to receive it", "D"),
   m("Tidal current awareness: plan around slack water", "C", ["piscataqua-current"]),
   m("A hand-size card on time in cold water", "D", ["giesbrecht-1-10-1", "ndbc-44007-water-temp"])],
  ["craft type", "persons aboard", "life jackets worn", "tide state and current", "water temperature", "alcohol suspected", "outcome"],
  "A harbormaster, a paddling club, an outfitter", "signal", None, ["piscataqua-current", "ndbc-44007-water-temp"])

leaf("harbor-foot", "People on foot near the water",
  "Docks, seawalls, rocks and bridges. Two different problems share this branch: falls into cold water, and crisis on a bridge.",
  [m("Throw rings and reach poles at docks and seawalls, checked monthly", "C"),
   m("\"Reach or throw, don't go\" public messaging", "C"),
   m("For a bridge: a physical barrier. Reviews find fewer deaths at sites after barriers; the evidence is low quality and displacement is unsettled", "B"),
   m("988 signs, phones and lighting on a bridge: help, but do not restrict access", "C")],
  ["location", "fall or entry type", "water temperature", "time to rescue", "outcome"],
  "A town, a harbor authority, two state DOTs", None,
  "There is no published annual count for the Piscataqua River Bridge. The span brief keeps what is known.", [])

leaf("harbor-children", "Children and teens around the harbor",
  "Jumping from docks and bridges, wading on a falling tide. Skills and rules, with adults who know the water.",
  [m("Basic swimming, water-safety and safe-rescue skills for school-age children", "A", ["who-prevention-measures"]),
   m("Supervised swim areas and clear rules on jumping", "C"),
   m("Life jackets for children on docks and in boats", "C")],
  ["age band", "activity", "supervision present", "tide state", "outcome"],
  "A town recreation department, a sailing school, a harbormaster", None, None, ["who-age-under30"])

leaf("lake-under5", "Children under 5 near a lake or pond",
  "Nearly a quarter of the world's drowning deaths are children under five. The measures with the strongest evidence are barriers and supervised care.",
  [m("Control access to water: barriers, fencing, covered wells", "A", ["who-prevention-measures"]),
   m("Community day-care for pre-school children: village crèches in Bangladesh cut child drowning deaths by about 82%", "A", ["who-prevention-measures", "rahman-anchal-2012", "who-investment-case"]),
   m("Caregiver CPR and safe-rescue skills", "C")],
  ["age", "supervision at the time", "barrier present", "distance from home", "outcome"],
  "A town, a child-care provider, a lake association", None, None, ["who-age-under5", "who-investment-case"])

leaf("lake-children", "Children 5–14 and teens at the lake",
  "Drowning is a leading cause of death for children 5–14 in several regions. Skills first, then supervised places to use them.",
  [m("Basic swimming, water-safety and safe-rescue skills: SwimSafe lessons in Bangladesh cut child drowning deaths by about 93%", "A", ["who-prevention-measures", "rahman-anchal-2012"]),
   m("Lifeguarded swim areas", "C", ["usla-guarded-risk"]),
   m("Ice safety education and a throw rope at known crossings", "C")],
  ["age band", "swim skills reported", "lifeguard present", "ice or open water", "outcome"],
  "A school district, a camp, a town", None, None, ["who-region-wpr"])

leaf("lake-adults", "Adults at the lake",
  "Alcohol, cold water and no life jacket. In US boating deaths alcohol is the leading known factor.",
  [m("Always wear a life jacket on the water: about half the drowning risk", "B", ["cummings-pfd-2011"]),
   m("Alcohol and water don't mix: the leading known factor in US boating deaths (an association)", "C", ["uscg-boating-2024"]),
   m("A hand-size card on time in cold water", "D", ["giesbrecht-1-10-1"]),
   m("Ice-rescue kit and training for the first responders who will be called", "C")],
  ["activity", "life jacket", "alcohol suspected", "water temperature", "time to rescue", "outcome"],
  "A lake association, a volunteer fire department", "clock", None, ["uscg-boating-2024"])

leaf("pool-under5", "Children under 5 at a pool",
  "Four-sided fencing that separates the pool from the house is the measure with the clearest evidence.",
  [m("Four-sided fencing that separates the pool from the house, with a self-latching gate: a quarter of the odds of drowning versus no fence", "B", ["cochrane-pool-fencing", "peterson-us-348", "who-prevention-measures"]),
   m("Supervision within arm's reach, with one adult named as the watcher", "C"),
   m("Caregiver CPR", "C")],
  ["age", "fence type", "gate latched", "supervision at the time", "outcome"],
  "A town building department, a homeowners' association, a pool company", None, None, ["peterson-us-348"])

leaf("pool-children", "Children and teens at a pool",
  "Skills and lifeguards.",
  [m("Swimming and water-safety lessons", "A", ["who-prevention-measures"]),
   m("Lifeguards and posted rules at public pools", "C")],
  ["age band", "lifeguard present", "swim skills", "outcome"],
  "A school, a town pool, a swim club", None, None, [])

leaf("pool-adults", "Adults at a pool",
  "Alcohol, swimming alone and medical conditions.",
  [m("Never swim alone", "C"), m("Alcohol away from the water", "C"), m("Lifeguards at public pools", "C")],
  ["age", "alone or accompanied", "alcohol suspected", "medical condition reported", "outcome"],
  "A pool operator, a hotel", None, None, [])

leaf("home-under5", "Children under 5 at home",
  "Baths, buckets, wells and tanks. In low-income settings this is where a large share of under-five drownings happen. The WHO investment case puts day-care and swim skills at the center.",
  [m("Cover wells and tanks; empty buckets and baths after use; doorway barriers and playpens", "A", ["who-prevention-measures"]),
   m("Community day-care for pre-school children: crèches cut child drowning deaths by about 82% in Bangladesh", "A", ["who-investment-case", "rahman-anchal-2012"]),
   m("Caregiver safe-rescue skills", "A", ["who-prevention-measures"])],
  ["age", "water source", "supervision at the time", "barrier present", "outcome"],
  "A health ministry, an NGO running day-care, a village council", None, None, ["who-age-under5", "who-investment-case"])

leaf("flood-before", "A community before the flood",
  "Three in four flood-disaster deaths are drownings. Preparedness and early warning are the measures WHO recommends.",
  [m("Flood preparedness, planning and early warning", "A", ["who-prevention-measures"]),
   m("Marked evacuation routes to high ground, practiced", "C"),
   m("Count flood drownings as drownings so they appear in the ledger", "D", ["who-flood-share"])],
  ["event", "warning lead time", "deaths and missing", "drownings among them", "source"],
  "A municipality, a national disaster agency", None,
  "Flood drownings sit outside the core count. We estimate 3,000–8,000 a year and call that a band, not a count.", ["who-flood-share", "emdat-flood-deaths-2019"])

leaf("flood-during", "A household in a flood",
  "Moving water takes cars and people. The measure is not to enter it.",
  [m("Do not walk or drive through moving water", "C"),
   m("Move to high ground early, before routes close", "C"),
   m("Call the local emergency number for anyone in the water", "C")],
  ["event", "entered water on foot or in a vehicle", "depth and flow", "outcome"],
  "A household; the lab has no pilot here", None, None, [])

tree = {"schema": "lifesavinglab.tree.v2", "version": "0.4.0", "start": "now",
        "grades": {"A": "Recommended by WHO", "B": "Modeled or peer-reviewed evidence", "C": "Established practice, outcome unmeasured", "D": "Open question: a lab pilot"},
        "nodes": N}
with open(os.path.join(OUT, 'tree.json'), 'w', encoding='utf8') as f:
    json.dump(tree, f, indent=1, ensure_ascii=False)
leaves = [k for k, v in N.items() if v['type'] == 'leaf']
print(len(N), 'nodes;', len(leaves), 'leaves')
# check every "to" resolves
for k, v in N.items():
    for o in v.get('options', []):
        assert o['to'] in N, (k, o['to'])
print('links ok')
