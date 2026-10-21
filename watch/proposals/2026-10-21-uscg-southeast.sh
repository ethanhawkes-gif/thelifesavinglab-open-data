#!/usr/bin/env sh
# Proposed triage of the 33 official reports from the U.S. Coast Guard Southeast District feed
# (source uscg-d7-govdelivery) waiting in watch/queue.json on 21 Oct 2026.
#
# A PROPOSAL, NOT A DECISION. Nothing here has been run. The watch's rule is that a person reads each report at its
# link and decides: read the release (both links are given), then run, edit or skip each line. `read` is deliberately
# NOT included; running a line is the person's reading.
#
# Prepared by mitra commons with a Claude session (claude-opus-5-5), which read every release in full in a browser on
# 21 Oct 2026 (the GovDelivery bulletin, and the news.uscg.mil article where the bulletin was only a lead paragraph).
# No names are carried: the releases name rescued, missing and deceased people and officers; none of that is here.
# Places are at harbor, island or town level. Ages are banded. Event dates are worked out from the weekday the release
# names and its own date. Every command was dry-run against a scratch copy of the queue and passes the tool's checks.
#
# Counts: 25 register rows, 6 "same event" matches, 2 dismissals (33 reports). Five rows are fatal or missing.
# Judgement calls a person should look at first are marked CHECK.
set -e
R="node scripts/watch-review.mjs"

# --- Fatal and missing -------------------------------------------------------------------------------------------

# Mona Island, PR: makeshift migrant vessel capsized Sun 27 Sep about 11 p.m. after a fight aboard; people jumped and
# tried to swim to the island; nobody wore a life jacket; survivors estimated about 60 aboard. 49 survivors and 3 bodies
# transferred; search suspended Thu 1 Oct after 78 hours over 2,000 sq nm. CHECK: one outcome per row, so 'fatal' with
# the missing count in the note.
# https://content.govdelivery.com/accounts/USDHSCG/bulletins/42cf0da  ·  https://www.news.uscg.mil/Press-Releases/Article/4613083/
# APPLIED 21 Oct 2026 (row-written; do not run again): checked against 42cf0da/4613083 and the suspension release 42d8bf6/4617075; run as proposed.
# $R row 4567dbfd743f844d --water sea-coast --activity migrant-crossing --outcome fatal --date 2026-09-27 \
#   --place "off Mona Island, Puerto Rico" --vessel "makeshift vessel" --persons "about 60 (survivors' estimate)" --pfd no \
#   --who "Coast Guard Sector San Juan, a merchant vessel, Puerto Rico Police, CBP" --confidence high \
#   --note "3 recovered deceased, 49 survivors, about 8 unaccounted for by the survivors' estimate; violence aboard preceded the capsize; search suspended after 78 h"
$R match 1c9be63906b1b92c --with 4567dbfd743f844d   # 42d8bf6: the suspension release for the same event

# Condado Beach, San Juan, PR: a man (20s) went missing Wed 18 Mar at night while trying to rescue one of two people in
# distress; body recovered Fri 20 Mar about 1.5 nm offshore. High rip-current risk on the north coast that week.
# This is the tree's rescuer-drowning branch.
# https://content.govdelivery.com/accounts/USDHSCG/bulletins/40f0a2d  ·  .../bulletins/40f4a04
# APPLIED 21 Oct 2026 (row-written; do not run again): checked against 40f0a2d/4438081 and 40f4a04/4440069; run as proposed.
# $R row f39fe9fe64c2a0db --water sea-coast --activity bystander-rescue --outcome fatal --date 2026-03-18 \
#   --place "Condado Beach, San Juan, Puerto Rico" --persons 3 --age 15-29 \
#   --who "Coast Guard Sector San Juan, San Juan Maritime Police" --confidence high \
#   --note "the person who died was a bystander attempting a rescue; rip currents; recovered 1.5 nm offshore on day 3"
$R match 2b74d2856bddff8e --with f39fe9fe64c2a0db   # 40f4a04: recovery release

# Biscayne Bay, Miami: a person (20s) last seen aboard a vessel transiting the bay, reported Fri 12 Jun; a person in the
# water was found south of Brickell Key on Sun 14 Jun and later identified. CHECK: the release offers condolences and
# says 'recovered' but does not print 'deceased'; 'fatal' is inferred, so confidence medium.
# https://content.govdelivery.com/accounts/USDHSCG/bulletins/41c62be  ·  https://www.news.uscg.mil/Press-Releases/Article/4517509/
# APPLIED 21 Oct 2026 (row-written; do not run again): checked against 41c62be/4517509; run with --vessel "cabin cruiser, 39 ft" added (the release gives it).
# $R row 184833bcf3cb6af9 --water harbor-river --activity overboard --outcome fatal --date 2026-06-12 \
#   --place "Biscayne Bay, Miami, Florida" --vessel "cabin cruiser, 39 ft" --persons 1 --age 15-29 \
#   --who "Coast Guard Sector Miami, Miami-Dade Sheriff's Office, Good Samaritans" --confidence medium \
#   --note "last seen aboard a vessel; found in the water two days later; outcome inferred from the release's wording"
$R match 0f473dd2818b4b89 --with 184833bcf3cb6af9   # 41c6111: earlier version of the same release

# Jupiter, FL: paddleboarder (40s) last seen Mon 14 Sep about 4 miles east of Jupiter Beach; search suspended
# Sat 19 Sep after about 28,490 sq miles.
# https://content.govdelivery.com/accounts/USDHSCG/bulletins/42ad935  ·  https://www.news.uscg.mil/Press-Releases/Article/4606717/
# APPLIED 21 Oct 2026 (row-written; do not run again): checked against 4601546 (initial) and 42ad935/4606717; run as proposed.
# $R row fd31f016b7e7836c --water sea-coast --activity paddleboarding --outcome missing --date 2026-09-14 \
#   --place "off Jupiter Beach, Florida" --persons 1 --age 45-59 \
#   --who "Coast Guard Sector Miami, air stations Miami and Clearwater, local law enforcement" --confidence high \
#   --note "search suspended after about 28,490 square miles"
$R match 9fc5bec024566098 --with fd31f016b7e7836c   # 42b9c90: suspension release

# Ponce, PR: fisherman (60s) left the local boat ramp Sat 18 Jul about 6 p.m., not back by Sunday morning; search
# suspended Wed 22 Jul.
# https://content.govdelivery.com/accounts/USDHSCG/bulletins/421cc0a  ·  https://www.news.uscg.mil/Press-Releases/Article/4553539/
# APPLIED 21 Oct 2026 (row-written; do not run again): checked against 421cc0a/4553539; run with --vessel "recreational vessel, 19 ft" added (boat name left out).
# $R row e61479c21e9ac498 --water sea-coast --activity fishing --outcome missing --date 2026-07-18 \
#   --place "off Ponce, Puerto Rico" --vessel "recreational vessel, 19 ft" --persons 1 --age 60+ \
#   --who "Coast Guard Sector San Juan and partners" --confidence high --note "overdue small-boat fisherman; search suspended after 4 days"

# --- Rescued -----------------------------------------------------------------------------------------------------

# Boot Key Harbor, Marathon, FL: 26-ft catamaran capsized about 5 miles south, Sun 18 Oct; mayday on VHF 16; four
# rescued, no injuries.  .../bulletins/42f9b3b  ·  https://www.news.uscg.mil/Press-Releases/Article/4628138/
$R row 8adbb8794a09f7ff --water sea-coast --activity boating --outcome rescued-unharmed --date 2026-10-18 \
  --place "off Boot Key Harbor, Marathon, Florida" --vessel "catamaran, 26 ft" --persons 4 \
  --who "Coast Guard Station Marathon" --confidence high --note "VHF 16 mayday; small craft advisory in effect"

# Off the Dominican Republic: 61 people from an overloaded, sinking vessel, Mon 5 Oct; all rescued.
# .../bulletins/42e1677
$R row 6e23969af2ced7d4 --water sea-coast --activity migrant-crossing --outcome rescued-unharmed --date 2026-10-05 \
  --place "Atlantic, off the Dominican Republic" --vessel "overloaded vessel" --persons 61 \
  --who "Coast Guard cutter, Dominican Republic Navy" --confidence high

# Off Brunswick, GA: 30-ft fishing vessel sank about 75 miles offshore, Mon 21 Sep; two found clinging to a bean bag
# and rescued by a passing merchant ship; no serious injuries.  .../bulletins/42c0caf
$R row a5f6e5e541c8c23b --water sea-coast --activity fishing --outcome rescued-unharmed --date 2026-09-21 \
  --place "75 miles off Brunswick, Georgia" --vessel "fishing vessel, 30 ft" --persons 2 \
  --who "Coast Guard Southeast District (coordination), a merchant vessel" --confidence high --note "survivors kept afloat on a bean bag; no serious injuries"

# Government Cut, Miami: personal watercraft taking on water, Mon 17 Aug about 2:30 p.m.; two recovered from the
# water, no injuries.  .../bulletins/425887e  ·  https://www.news.uscg.mil/Press-Releases/Article/4575986/
$R row a198efb79a399615 --water harbor-river --activity personal-watercraft --outcome rescued-unharmed --date 2026-08-17 \
  --place "Government Cut, Miami, Florida" --vessel "personal watercraft" --persons 2 \
  --who "Coast Guard Station Miami Beach, Miami-Dade Fire Rescue" --confidence high

# Tortola to Sint Maarten: solo sailor (50s) on a 45-ft catamaran, departed Sun 9 Aug, overdue; found Thu 13 Aug about
# 11 nm west of Sint Maarten steering by emergency tiller; towed in, no injuries.  .../bulletins/424fa50 and 424d277
$R row 4ac8e9f1515882fe --water sea-coast --activity sailing --outcome rescued-unharmed --date 2026-08-09 \
  --place "Caribbean, west of Sint Maarten" --vessel "sailing catamaran, 45 ft" --persons 1 --age 45-59 \
  --who "Coast Guard aircraft, Dutch Coast Guard, French rescue units" --confidence high --note "overdue 4 days; found by aircraft"
$R match 9d8da9362a93a277 --with 4ac8e9f1515882fe   # 424d277: the search-launched release

# St. Thomas, USVI: fisherman (50s) in a 12-ft dinghy that became disabled, Thu 16 Jul; found stranded on an uninhabited
# island off the west end, Fri 17 Jul.  .../bulletins/420fdf2 (420fdf1 is an identical second release)
$R row ba58fa63e2265687 --water sea-coast --activity fishing --outcome rescued-unharmed --date 2026-07-16 \
  --place "off St. Thomas, U.S. Virgin Islands" --vessel "dinghy, 12 ft" --persons 1 --age 45-59 \
  --who "Virgin Islands Police marine unit, Coast Guard" --confidence high --note "disabled boat; reached land and waited"
$R match 510b123aaea8b044 --with ba58fa63e2265687   # 420fdf1: duplicate release

# Key Largo, FL: diver (40s) failed to surface about 15 minutes after the scheduled time from a dive boat 5 miles off
# John Pennekamp park, Sat 11 Jul; found in the initial search area. CHECK: 'transported to EMS in stable condition',
# injuries not stated.  .../bulletins/42021c4  ·  https://www.news.uscg.mil/Press-Releases/Article/4540834/
$R row 4c12b4ed3b306e44 --water sea-coast --activity diving --outcome rescued-unharmed --date 2026-07-11 \
  --place "off Key Largo, Florida" --persons 1 --age 45-59 \
  --who "Coast Guard Station Islamorada, Air Station Miami, Florida FWC" --confidence medium --note "separated from dive boat; to EMS in stable condition, injuries not stated"

# Elliot Key, FL: two men drifted away from their vessel near Caesar Creek, Sun 21 Jun; no life jackets; reported by a
# tug at about 7:30 a.m., crew on scene about 8:10 a.m.; no injuries.  https://www.news.uscg.mil/Press-Releases/Article/4522516/
$R row 7534952a97f3c393 --water sea-coast --activity swimming-from-boat --outcome rescued-unharmed --date 2026-06-21 \
  --place "4 miles east of Elliot Key, Florida" --persons 2 --pfd no --minutes 40 \
  --who "Coast Guard Station Miami Beach; reported by a tug crew" --confidence high --note "drifted away from the boat without life jackets"

# Little Palm Island, FL: vessel capsized about 5 miles south, Sun 7 Jun; 911 transfer at about 5:45 p.m.; three in the
# water rescued, no injuries.  https://www.news.uscg.mil/Press-Releases/Article/4511527/
$R row 549ca4928e81024d --water sea-coast --activity boating --outcome rescued-unharmed --date 2026-06-07 \
  --place "off Little Palm Island, Florida Keys" --persons 3 --who "Coast Guard Station Marathon" --confidence high

# Loíza, PR: a boater jumped in without a life jacket to fix the outboard and was swept away, Sun 31 May about 7 p.m.;
# two still aboard the disabled boat; all three rescued with a Good Samaritan.  .../bulletins/419f446
$R row e7f823e321c321f9 --water sea-coast --activity boating --outcome rescued-unharmed --date 2026-05-31 \
  --place "off Loíza, Puerto Rico" --persons 3 --pfd no \
  --who "Coast Guard air and surface crews, a Good Samaritan" --confidence medium --note "entered the water to repair the engine and was swept away; injuries not stated"

# St. Thomas, USVI: vessel fire, Sun 31 May; one boater rescued.  .../bulletins/419ecc7
$R row 6b5e6dfa0ff6a78b --water sea-coast --activity boating --outcome unknown --date 2026-05-31 \
  --place "near St. Thomas, U.S. Virgin Islands" --persons 1 --who "Coast Guard boat forces, St. Thomas and St. John rescue units" \
  --confidence medium --note "vessel fire; the bulletin gives no condition; outcome left unknown"

# Key West, FL: two kayaks overturned near Fort Zachary Taylor, Sun 24 May; life jackets worn; alarm about 12:30, crew
# on scene about 12:50; no injuries.  https://www.news.uscg.mil/Press-Releases/Article/4500073/
$R row 18278d041a22d726 --water sea-coast --activity kayaking --outcome rescued-unharmed --date 2026-05-24 \
  --place "Fort Zachary Taylor, Key West, Florida" --persons 2 --pfd yes --minutes 20 --who "Coast Guard Station Key West" --confidence high

# Off Melbourne, FL: civilian aircraft ditched after engine failure about 80 miles offshore; 11 hoisted from a life raft.
# CHECK: the release does not give the day; date is the release date.  https://www.news.uscg.mil/Press-Releases/Article/4485348/
$R row 0c848cf28e1dbb38 --water sea-coast --activity aircraft-ditching --outcome rescued-unharmed --date 2026-05-13 \
  --place "80 miles off Melbourne, Florida" --persons 11 --who "U.S. Air Force rescue helicopter; Coast Guard coordination" \
  --confidence medium --note "all in a life raft; date is the release date"

# Isla de Cabras, Toa Baja, PR: two capsizes during one response, Tue 31 Mar at night: three federal agents responding
# and two boaters were all in the water and all rescued.  .../bulletins/4116201
$R row ae5d664b856bc63c --water sea-coast --activity boating --outcome rescued-unharmed --date 2026-03-31 \
  --place "off Isla de Cabras, Toa Baja, Puerto Rico" --persons 5 \
  --who "Coast Guard helicopter, Puerto Rico Police FURA, CBP Air and Marine" --confidence high \
  --note "a responding crew's own vessel capsized; responders became casualties"

# Three Rooker Island, FL: fisherman (30s) left Anclote in a 12-ft aluminum skiff Thu 26 Mar 7:30 a.m.; reported
# overdue 9:30 p.m.; found 4:30 a.m. Fri clinging to a fuel can; to hospital in stable condition.
# CHECK: minutes are from the overdue report to the find (420), not from the capsize, which is unknown.
# https://www.news.uscg.mil/Press-Releases/Article/4446342/
$R row f98515861eb4a0f7 --water sea-coast --activity fishing --outcome rescued-unharmed --date 2026-03-26 \
  --place "6 miles west of Three Rooker Island, Florida" --vessel "aluminum skiff, 12 ft" --persons 1 --age 30-44 --minutes 420 \
  --who "Coast Guard Air Station Clearwater, Station Sand Key" --confidence medium --note "in the water clinging to a fuel can; hospital, stable"

# Fajardo, PR: two people (late teens) trapped at the bottom of a shoreside cliff by the rising sea, Sat 21 Mar;
# hoisted by helicopter.  .../bulletins/40fa526
$R row 20827e5f71761cf1 --water sea-coast --activity shore --outcome rescued-unharmed --date 2026-03-21 \
  --place "Seven Seas Beach, Fajardo, Puerto Rico" --persons 2 --age 15-29 --who "Coast Guard Air Station Borinquen, local responders" --confidence high

# Desecheo, PR: two fishermen in a disabled, overdue 23-ft boat in the Mona Passage, Sun 15 Mar; rescued.
# .../bulletins/40e9230
$R row 67983a4720b54932 --water sea-coast --activity fishing --outcome rescued-unharmed --date 2026-03-15 \
  --place "off Desecheo, Mona Passage, Puerto Rico" --vessel "pleasure craft, 23 ft" --persons 2 --who "Coast Guard air and surface units" --confidence high

# Virginia Key, Miami: vessel taking on water about 3 miles east of Government Cut, Fri 13 Mar; life jackets worn;
# alarm 12:19, crew on scene 12:37; no injuries.  https://www.news.uscg.mil/Press-Releases/Article/4434806/
$R row 88909c46205c885e --water sea-coast --activity boating --outcome rescued-unharmed --date 2026-03-13 \
  --place "off Virginia Key, Miami, Florida" --persons 3 --pfd yes --minutes 18 --who "Coast Guard Station Miami Beach" --confidence high

# 450 miles east of Daytona Beach: sailing vessel taking on water in 20-ft seas; EPIRB alert Sun 1 Feb 3:20 p.m.,
# aircraft on scene 8:30 p.m., three taken aboard a tanker 2:20 a.m. Mon; no injuries.
# https://www.news.uscg.mil/Press-Releases/Article/4396737/
$R row 2ae80957ecd3b007 --water sea-coast --activity sailing --outcome rescued-unharmed --date 2026-02-01 \
  --place "Atlantic, 450 miles east of Daytona Beach, Florida" --persons 3 --minutes 310 \
  --who "Coast Guard HC-130 from Elizabeth City, a merchant tanker" --confidence high --note "minutes = alert to aircraft on scene; rescue by tanker about 11 h after the alert"

# East of Puerto Rico: an ocean rower (40s) capsized by rogue waves in 13-15 ft seas, Wed 21 Jan at night, during a
# transatlantic rowing race; took to the life raft; rescued by a tanker.  .../bulletins/405ac83
$R row 208387a6222edf20 --water sea-coast --activity rowing --outcome rescued-unharmed --date 2026-01-21 \
  --place "Atlantic, east of Puerto Rico" --vessel "ocean rowing boat" --persons 1 --age 45-59 \
  --who "Coast Guard Sector San Juan (coordination), a merchant tanker" --confidence high

# --- Dismissals ---------------------------------------------------------------------------------------------------

# 42f645d: a repatriation after a maritime interdiction; no distress or water entry is described.
$R dismiss f3bd57acc208ac75 --note "interdiction and repatriation; no distress described"
# 4104b1d: a seasonal patrol announcement, not an event.
$R dismiss dce37f389a8c8a58 --note "patrol announcement, not an event"
