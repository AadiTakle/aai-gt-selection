# DOK 1 — How Many Children Are Identified as Gifted in the United States

**Research question.** How many children in the United States are identified as gifted, how does that number
vary, and how many are identified each year?

Fact extraction only. No interpretation, no editorializing. Every number and every quoted phrase below was
read out of the source named beside it. Exact quotes are in quotation marks. Anything I could not verify is
flagged inline **and** listed again in the final section.

---

## The numbers, in one table

Every figure here is sourced and caveated in the section named. Read the section before quoting the number.

| Quantity | Figure | Year | Source | §|
| --- | ---: | --- | --- | --- |
| US public school students identified as gifted | **2,955,610** | 2020-21 | CRDC Public Use File (Tier 1) | 1.1 |
| …as a share of enrollment, as NCES publishes it | **6.1%** | 2020-21 | NCES Digest 2023, T204.90 (Tier 1) | 1.3 |
| …as the ratio of the two published CRDC totals | 6.01% | 2020-21 | my arithmetic on Tier 1 inputs | 1.2 |
| Last published national *count* from NCES | 3,329,540 | 2017-18 | NCES Digest 2022, T204.80 (Tier 1) | 1.5 |
| Change in the count, 2017-18 → 2020-21 | **−373,930 (−11.2%)** | — | my subtraction of two Tier 1 figures | 6.1 |
| Highest state identification rate | **South Carolina, 14.87%** | 2020-21 | my computation on CRDC (Tier 1) | 2.2 |
| Lowest state identification rate | **Vermont, 0.04%** (28 students) | 2020-21 | my computation on CRDC (Tier 1) | 2.2 |
| Lowest jurisdiction of any kind | District of Columbia, 0.02% (20 students) | 2020-21 | my computation on CRDC (Tier 1) | 2.2 |
| Newly identified per year, nationally | **not published anywhere; ~220k–300k inferred** | — | my inference, two models | 3.4 |
| One public grade cohort (grade 2) | 3,613,000 | fall 2023 | NCES Digest 2024, T203.10 (Tier 1) | 3.3 |
| Public K–8 enrollment | 32,331,000 | fall 2023 | my sum of Tier 1 grade cells | 4.1 |
| Private K–8 enrollment | 3,329,190 (SE 11,595) | fall 2021 | NCES Digest 2023, T205.20 (Tier 1) | 4.2 |
| Total K–8, public + private, matched year | ≈35,828,000 | fall 2021 | my addition of two Tier 1 figures | 4.3 |
| States requiring identification by law/rule | **35 of 50** | 2022-23 | NAGC State of the States (Tier 4) | 5.2 |
| States mandating gifted services | **25 of 48** | 2022-23 | NAGC State of the States (Tier 4) | 5.2 |
| States with dedicated gifted funding | **26 of 47** (55%) | 2022-23 | NAGC State of the States (Tier 4) | 5.2 |
| States funding universal screening | 7 | 2022-23 | NAGC State of the States (Tier 4) | 5.4 |
| States where universal screening is not required | 38 of 50 | 2022-23 | NAGC State of the States (Tier 4) | 5.5 |
| CTY Talent Search testers | ~15,000 | 2019-20 | JHU CTY press release (Tier 5) | 7.1 |
| CTY Talent Search participants | ~15,300 | 2021-22 | CTY news article (Tier 5) | 7.1 |
| Duke TIP students identified annually | ~100,000 | as of 2016 | Duke Today (Tier 5) | 7.2 |
| Duke TIP closure | **announced 8 Oct 2020**, 75 layoffs; cause stated as COVID destroying the residential-revenue model | 2020 | Duke official quoted in ABC11; Duke statement | 7.3 |
| Stanford Online High School | 1,073 total (44% full-time) | 2025-26 | school profile (Tier 5); 985 in PSS 2023-24 (Tier 1) | 8.2–8.3 |
| Roeper School | 496 | 2023-24 | NCES PSS (Tier 1) | 8.2 |
| Mirman School | 417 | 2023-24 | NCES PSS (Tier 1) | 8.2 |
| Davidson Academy (Reno) | 173 | 2025-26 | school profile (Tier 5); NV Legislature (Tier 1) | 8.3–8.4 |
| Davidson Academy Online | 103 | 2025-26 | school profile (Tier 5); 95 in PSS 2023-24 (Tier 1) | 8.2–8.3 |
| **All five gifted schools combined** | **≈2,262** | mixed | my addition | 8.6 |
| **Any single school serving 10,000 highly gifted children?** | **No — none found; largest is ~1,073** | — | NCES PSS + CCD (Tier 1) | 8.1 |

Two corrections to figures I was asked to check: **the 1.98% / 19.33% pair is real but comes from an
analysis that drops all districts reporting zero gifted enrollment** (§2.1), and **New York City did not
eliminate its gifted program — it eliminated the admissions test and then expanded seats** (§6.4).

---

## Citation verification method

Every DOI cited in this document was resolved against the Crossref REST API
(`https://api.crossref.org/works/<DOI>`) and the returned title, container-title, publisher, volume, pages,
authors and issued year were compared field by field against the citation as written. **One cited DOI is a
DataCite DOI rather than a Crossref DOI and returns no Crossref record; it was verified against
`https://api.datacite.org/dois/<DOI>` instead, and I say so explicitly at that citation.** DOIs that did not
match were discarded, not "fixed."

**Only two DOIs appear in this document.** Where I could not obtain a verified DOI, I cited the source by
URL and labeled its tier rather than manufacturing an identifier. Every government data URL was fetched,
confirmed to return the document, and the exact table number, worksheet, row or page is named at the fact.

Full verification log — including the field-by-field DOI comparison tables, the HTTP status of all 40 URLs,
and the internal arithmetic cross-checks I ran — is at the end of this document.

## Source tier labels

Every source below carries one of these tags:

- **TIER 1 — Federal administrative data.** US Department of Education Office for Civil Rights (CRDC),
  NCES (Common Core of Data, Private School Universe Survey, Digest of Education Statistics, NTPS). Census.
  These are censuses or federally mandated collections, not samples of convenience.
- **TIER 2 — Peer-reviewed research.** Journal articles with DOIs, resolved against Crossref.
- **TIER 3 — Federally funded research center / technical report.** NRC/GT, Fordham, Urban Institute,
  Brookings, university research centers. Not peer reviewed but methods are documented.
- **TIER 4 — Advocacy organization self-report.** NAGC, CSDPG, state gifted associations. Useful for
  policy-inventory facts that no federal source collects; treated as weaker for anything quantitative that a
  federal source also measures.
- **TIER 5 — Institutional self-report / press.** A school reporting its own enrollment, a news article.
  Used only where no better source exists, and labeled as such.

---

## Question 1 — The national stock: how many US public school students are identified as gifted

### 1.1 The headline number: 2,955,610 students, 2020-21

**Source. TIER 1 — Federal administrative data.** US Department of Education, Office for Civil Rights,
**Civil Rights Data Collection, 2020-21, Public Use File.** State and National Estimation table
"Gifted and Talented Enrollment," worksheet **`Total`**, row for "50 states, District of Columbia, and
Puerto Rico," **column C ("Total Students")**.

- Landing page: [civilrightsdata.ed.gov/estimations/2020-2021](https://civilrightsdata.ed.gov/estimations/2020-2021)
  (verified HTTP 200). The page is a JavaScript application; the download button calls the API endpoint
  below.
- Direct file (verified, returns a 39,852-byte `.xlsx`):
  `https://civilrightsdata.ed.gov/api/v1.0/GetStateNationalEstimation?survey_Year_Key=10&Report_Id=34`

**The exact figure: 2,955,610.**

The workbook's own title cell (B2) reads: "Number and percentage of public school students enrolled in
gifted/talented programs, by race/ethnicity, disability status, and English proficiency, by state: School
Year 2020-21."

The workbook's own NOTE row states, verbatim: "Table reads (for 50 states, District of Columbia, and
Puerto Rico totals): Of all **2,955,610** public school students enrolled in gifted/talented programs,
19,408 (0.66%) were American Indian or Al[aska Native]…"

A second note in the same workbook, verbatim: "**Data reported in this table represent 98.62% of responding
schools.**" This is the source's own coverage caveat — the count is not 100% of schools.

The workbook's SOURCE line, verbatim: "U.S. Department of Education, Office for Civil Rights, Civil Rights
Data Collection, 2020-21, Public Use File."

### 1.2 The matching denominator from the same collection: 49,150,566

**Source. TIER 1.** Same collection, "Enrollment — Overall" table, worksheet `Total`, same row label.
Direct file (verified): `.../GetStateNationalEstimation?survey_Year_Key=10&Report_Id=1`. Title cell B2:
"Public school students overall and by race/ethnicity, students with disabilities served under IDEA and
those served solely under Section 504, and students who are English language learners, by state: School
Year 2020-21."

**Total public school enrollment, 50 states + DC + PR, 2020-21: 49,150,566.**

**2,955,610 ÷ 49,150,566 = 6.01%.** *(This division is my own arithmetic on two published CRDC totals, not
a published rate. See 1.4 for why NCES publishes 6.1%, not 6.0%.)*

### 1.3 The percentage as NCES publishes it: 6.1% (2020-21)

**Source. TIER 1 — Federal.** NCES, *Digest of Education Statistics 2023*, **Table 204.90**, "Percentage of
public school students enrolled in gifted and talented programs, by sex, race/ethnicity, and state or
jurisdiction: Selected school years, 2004 through 2020-21."
URL: [nces.ed.gov/programs/digest/d23/tables/dt23_204.90.asp](https://nces.ed.gov/programs/digest/d23/tables/dt23_204.90.asp)
(verified HTTP 200; page `<title>` matches the table title exactly).

United States row, 2020-21 columns, read directly off the table:

| 2020-21 breakdown (Table 204.90, US row) | Percent |
| --- | ---: |
| **Total** | **6.1** |
| Male | 6.0 |
| Female | 6.3 |
| American Indian/Alaska Native | 4.4 |
| Asian | 12.4 |
| Black | 3.4 |
| Hispanic | 4.3 |
| Pacific Islander | 3.7 |
| White | 7.7 |
| Two or more races | 6.7 |

Table 204.90's own NOTE, verbatim: "Data for 2011-12 through 2020-21 are based on universe counts of schools
and school districts; therefore, these figures do not have standard errors. Race categories exclude persons
of Hispanic ethnicity."

Table 204.90's own SOURCE line, verbatim: "U.S. Department of Education, Office for Civil Rights, Civil
Rights Data Collection: 2004, 2006, 2011-12, 2013-14, 2017-18, and 2020-21. (This table was prepared
February 2024.)"

### 1.4 A discrepancy I am flagging rather than resolving

NCES publishes **6.1%** for 2020-21. Dividing the two published CRDC totals (2,955,610 ÷ 49,150,566) gives
**6.01%**, which rounds to 6.0%. Excluding Puerto Rico from both gives 6.05%, which also rounds to 6.0%.
NCES's denominator is therefore something narrower than total enrollment — most plausibly enrollment in
schools that reported gifted/talented data (the CRDC workbook says the table covers 98.62% of responding
schools, and 2,955,610 ÷ (49,150,566 × 0.9862) = 6.10%). **I could not find NCES documentation stating the
exact denominator, so I am recording the arithmetic coincidence and not asserting the cause.** Both figures
are correct as published; they answer slightly different questions.

### 1.5 The last published national COUNT from NCES: 3,329,540 (2017-18)

**Source. TIER 1 — Federal.** NCES, *Digest of Education Statistics 2022*, **Table 204.80**, "Number of
public school students enrolled in gifted and talented programs, by sex, race/ethnicity, and state:
Selected years, 2004 through 2017-18."
URL: [nces.ed.gov/programs/digest/d22/tables/dt22_204.80.asp](https://nces.ed.gov/programs/digest/d22/tables/dt22_204.80.asp)
(verified HTTP 200; `<title>` matches).

United States row, read directly:

| Year | Number enrolled in gifted/talented |
| --- | ---: |
| 2004 | 3,202,760 (SE 24,248) |
| 2006 | 3,236,990 (SE 21,177) |
| 2011-12 | 3,189,757 |
| 2013-14 | 3,329,544 |
| **2017-18** | **3,329,540** |

2017-18 disaggregation from the same row: Male 1,661,573; Female 1,667,967; White 1,944,410; Black 273,280;
Hispanic 610,225; Asian 329,947; Pacific Islander 7,163; American Indian/Alaska Native 24,760; Two or more
races 139,755. (Both the sex split and the race split sum exactly to 3,329,540 — I checked.)

**Important structural fact about the source.** The *Digest of Education Statistics 2023* **does not contain
a counts table for gifted and talented.** I retrieved the full Chapter 2 table index for Digest 2023
([nces.ed.gov/programs/digest/2023menu_tables.asp](https://nces.ed.gov/programs/digest/2023menu_tables.asp),
verified HTTP 200): the 204.x series runs 204.06, 204.07, 204.08, 204.09, 204.10, 204.20, 204.25, 204.27,
204.28, 204.30, 204.40, 204.50, 204.60, 204.65, 204.70, **204.90** — there is no 204.80. `dt23_204.80.asp`
returns HTTP 404. So for a *national count* more recent than 2017-18 you must go to the CRDC file itself
(§1.1), which is what I did.

### 1.6 A federal-adjacent restatement of the same number

**Source. TIER 1/TIER 2 — US Census Bureau Center for Economic Studies working paper.** Ainsworth, N. J.,
Ainsworth, A. J., Cleveland, C., Clark, L. R., Brummet, Q., Penner, E. K., Hibel, J., Saultz, A., Spiegel,
M., Hanselman, P., & Penner, A. (December 2025). "Gifted Identification Across the Distribution of Family
Income." *CES Working Paper 25-73*, US Census Bureau, Center for Economic Studies.
URL: [www2.census.gov/library/working-papers/2025/adrm/ces/CES-WP-25-73.pdf](https://www2.census.gov/library/working-papers/2025/adrm/ces/CES-WP-25-73.pdf)
(verified; PDF retrieved and read). **This is a working paper, not peer reviewed** — the paper's own
boilerplate says "The papers have not undergone the review accorded Census Bureau publications and no
endorsement should be inferred."

Abstract, verbatim first sentence: "Currently, 6.1 percent of K-12 students in the United States receive
gifted education."

Body, verbatim: "GT programs now serve more than 3 million U.S. public school enrollees, or about 6.1
percent of the public-school population (Snyder et al., 2020)."

Also verbatim from the abstract, and directly relevant to who gets identified: "Under 4 percent of students
in the lowest income percentile are identified as gifted, compared with **20 percent of those in the top
income percentile**. Income-based differences persist after accounting for student test scores and exist
across students of different sexes and racial/ethnic groups, underscoring the importance of family resources
for gifted identification in schools."

Data source for that paper, verbatim: "We use data from the Oregon Department of Education (ODE) on all
Oregon public school students from 2009-2019… We link the ODE data with family income information from IRS
tax records housed at the U.S. Census Bureau." **The income gradient is Oregon-only, not national.**

---

## Question 2 — State-by-state variation

### 2.1 Verdict on the two figures I was asked to check

**The 1.98% (West Virginia) and 19.33% (Maryland) figures are real and correctly quoted from their source,
but they are NOT raw CRDC identification rates and they do not match the federal data.** They come from an
analysis that deliberately drops part of the denominator.

**Their actual source. TIER 3 — university-affiliated research brief, not peer reviewed.** Sohn, D.,
Gopalan, M., & Frankenberg, E. "Who is labeled as Gifted? Trends and Patterns over the last Decade in US
Public Schools." AdvancED Equity (Penn State). URL:
[www.advancedequity.org/briefs/gt-rates](https://www.advancedequity.org/briefs/gt-rates) (verified, page
retrieved).

Verbatim from that brief: "There is significant variation in the GT identification rates (both overall and
by race/ethnicity) across the country with the lowest overall rate (**1.98% in West Virginia**) nearly 10
times smaller than the highest overall rate (**19.33% in Maryland**)."

And verbatim: "States with highest GT identification rates: Maryland (19.33%) followed by New York (17.19%),
Minnesota (17.11%), Illinois (16.75%), and Virginia (14.93%). States with lowest GT identification rates:
West Virginia (1.98%), Hawaii (2.10%), Kansas (2.68%), Tennessee (2.79%), and Pennsylvania (3.52%)."

**The methodological note that explains the gap, verbatim from the brief's endnote (i):** "We exclude all
school districts that report zero overall enrollment in Gifted and Talented Programs from our analytical
sample."

That exclusion is why their numbers diverge so sharply from the federal figures. Compare their 2021-22
figures with the raw CRDC 2020-21 rates I computed in §2.2:

| State | AdvancED Equity (2021-22, zero-GT districts dropped) | CRDC raw (2020-21, all districts) |
| --- | ---: | ---: |
| Maryland | 19.33% | 11.33% |
| New York | 17.19% | 1.32% |
| Minnesota | 17.11% | 6.04% |
| Illinois | 16.75% | 4.09% |
| Virginia | 14.93% | 12.02% |
| West Virginia | 1.98% | 1.67% |

New York moves from 1.32% to 17.19% — a factor of 13 — purely because most New York districts report zero
gifted enrollment and are dropped from the denominator. **Do not use the AdvancED Equity state figures as
"the share of children identified as gifted."** They answer a different question: the rate *inside districts
that identify anyone at all*.

Two further caveats on that brief. First, it uses **CRDC 2021-22**, one wave later than the most recent
wave I could verify with a primary federal file. Second, it is a web brief with figures rendered as images;
I read the state percentages out of the brief's own body text, which is where they are stated.

### 2.2 The full picture, computed directly from the federal file

**Source. TIER 1.** My own arithmetic on two CRDC 2020-21 Public Use File tables (§1.1 and §1.2): gifted
enrollment ÷ total enrollment, per state, both from the `Total` worksheets. **These rates are my
computation, not published rates**, but every input number is a published CRDC figure. As a check on the
method, every one of these rounds to the value NCES prints in Digest 2023 Table 204.90.

| Rank | State | Identified gifted | Total enrollment | % identified |
| ---: | --- | ---: | ---: | ---: |
| 1 | South Carolina | 114,032 | 766,747 | 14.87% |
| 2 | Oklahoma | 83,029 | 675,107 | 12.30% |
| 3 | Kentucky | 79,570 | 659,694 | 12.06% |
| 4 | Virginia | 150,106 | 1,248,416 | 12.02% |
| 5 | Maryland | 100,100 | 883,399 | 11.33% |
| 6 | Nebraska | 35,300 | 325,052 | 10.86% |
| 7 | Indiana | 106,986 | 1,025,327 | 10.43% |
| 8 | Georgia | 179,520 | 1,725,285 | 10.41% |
| 9 | North Carolina | 157,264 | 1,520,247 | 10.34% |
| 10 | Ohio | 138,478 | 1,668,109 | 8.30% |
| 11 | Arkansas | 39,650 | 481,443 | 8.24% |
| 12 | Texas | 433,583 | 5,329,177 | 8.14% |
| 13 | Iowa | 39,579 | 495,771 | 7.98% |
| 14 | New Jersey | 98,677 | 1,344,876 | 7.34% |
| 15 | Colorado | 64,216 | 881,493 | 7.28% |
| 16 | Oregon | 33,374 | 549,129 | 6.08% |
| 17 | Minnesota | 53,415 | 884,451 | 6.04% |
| — | **United States (50 + DC + PR)** | **2,955,610** | **49,150,566** | **6.01%** |
| 18 | Washington | 64,718 | 1,085,645 | 5.96% |
| 19 | Florida | 163,103 | 2,764,513 | 5.90% |
| 20 | Mississippi | 25,596 | 442,882 | 5.78% |
| 21 | Alabama | 40,981 | 730,852 | 5.61% |
| 22 | California | 297,977 | 5,981,470 | 4.98% |
| 23 | Montana | 7,090 | 148,015 | 4.79% |
| 24 | Maine | 7,985 | 167,150 | 4.78% |
| 25 | Missouri | 40,821 | 891,721 | 4.58% |
| 26 | New Mexico | 13,781 | 311,132 | 4.43% |
| 27 | Wisconsin | 36,093 | 820,887 | 4.40% |
| 28 | Idaho | 13,536 | 308,998 | 4.38% |
| 29 | Utah | 27,650 | 671,631 | 4.12% |
| 30 | Arizona | 44,693 | 1,089,578 | 4.10% |
| 31 | Illinois | 75,891 | 1,857,697 | 4.09% |
| 32 | Alaska | 4,541 | 111,906 | 4.06% |
| 33 | Louisiana | 25,205 | 684,940 | 3.68% |
| 34 | Pennsylvania | 48,846 | 1,689,202 | 2.89% |
| 35 | Nevada | 10,070 | 473,375 | 2.13% |
| 36 | Kansas | 9,467 | 472,996 | 2.00% |
| 37 | South Dakota | 2,799 | 140,077 | 2.00% |
| 38 | Hawaii | 1,976 | 101,481 | 1.95% |
| 39 | North Dakota | 2,267 | 118,609 | 1.91% |
| 40 | Wyoming | 1,777 | 94,465 | 1.88% |
| 41 | Delaware | 2,557 | 139,187 | 1.84% |
| 42 | Connecticut | 8,507 | 507,822 | 1.68% |
| 43 | West Virginia | 4,246 | 253,715 | 1.67% |
| 44 | Tennessee | 15,014 | 974,570 | 1.54% |
| 45 | New York | 33,929 | 2,561,406 | 1.32% |
| 46 | Michigan | 11,706 | 1,435,832 | 0.82% |
| 47 | New Hampshire | 1,315 | 168,706 | 0.78% |
| 48 | Massachusetts | 4,261 | 905,104 | 0.47% |
| 49 | Rhode Island | 176 | 137,363 | 0.13% |
| 50 | Puerto Rico | 109 | 276,436 | 0.04% |
| 51 | Vermont | 28 | 78,255 | 0.04% |
| 52 | District of Columbia | 20 | 89,225 | 0.02% |

**The range, stated plainly (CRDC 2020-21, all districts included):**

- **Highest state: South Carolina, 14.87%** (114,032 of 766,747).
- **Lowest state: Vermont, 0.04%** (28 students of 78,255). Lowest jurisdiction of any kind: the District of
  Columbia, 0.02% (20 students of 89,225).
- **Ratio highest-to-lowest state: about 415 to 1** (14.872% ÷ 0.0358%). Even setting Vermont aside, the
  next spread among the 50 states is South Carolina 14.87% vs. Rhode Island 0.128%, a factor of roughly 116.
- Four jurisdictions identify essentially nobody: **DC (20 students), Vermont (28), Puerto Rico (109),
  Rhode Island (176).** Those are absolute counts for an entire state or territory, not percentages.
- **Maryland is not the highest state in 2020-21** — it is fifth, at 11.33%. It *was* the highest in earlier
  waves (see §2.3).
- **West Virginia is not the lowest state** — it is 43rd of 52, at 1.67%. Nine jurisdictions are lower.

### 2.3 The same computation for 2015-16, for comparison

**Source. TIER 1.** CRDC 2015-16 Public Use File, "Gifted-Talented-Enrollment.xlsx" and
"Enrollment-Overall.xlsx." Direct URLs, both verified HTTP 200 and both returning real `.xlsx` files:
`https://civilrightsdata.ed.gov/assets/downloads/2015-2016/Gifted-Talented-Enrollment.xlsx` and
`https://civilrightsdata.ed.gov/assets/downloads/2015-2016/Enrollment-Overall.xlsx`.

National row, "United States": **3,255,040 gifted of 50,452,567 enrolled = 6.45%** (my division).

Top five and bottom five, my computation:

| | State | % identified, 2015-16 |
| --- | --- | ---: |
| Highest | Maryland | 16.92% |
| | South Carolina | 15.40% |
| | Oklahoma | 13.89% |
| | Kentucky | 13.80% |
| | Virginia | 12.49% |
| Lowest | Rhode Island | 0.10% |
| | Vermont | 0.15% |
| | Massachusetts | 0.71% |
| | New Hampshire | 1.10% |
| | Michigan | 1.27% |

West Virginia 2015-16: **1.92%** (5,347 of 278,514). Maryland 2015-16: **16.92%** (151,217 of 893,662).
So the user's remembered "roughly 1.98% / roughly 19.33%" pair is directionally consistent with the
Maryland-high / West-Virginia-low pattern in earlier waves, but the exact decimals belong to the AdvancED
Equity brief and its restricted denominator, not to any federal table.

### 2.4 Variation by locale (urban / suburban / rural)

**Source. TIER 3 — research brief, not peer reviewed.** Same AdvancED Equity brief as §2.1, using CRDC
2021-22 merged with NCES Common Core of Data 2021-22, **and with zero-GT districts excluded**.

Verbatim: "Rural districts tend to have the lowest GT identification rates overall (**7.6%**) compared to
**8.9%** in suburban districts and **8.6%** in urban districts."

Also verbatim: "Overall, the gap in identification for Black, Hispanic, Native American, and Multiracial
students was wide and fairly consistent across geographic areas. In contrast, the rates for White and Asian
students varied much more depending on location."

**Read those three locale numbers with the same caution as §2.1.** They sit around 8% because zero-GT
districts were dropped; the all-district national rate is 6.01%. The *relative* ordering (rural lowest,
suburban highest) is the usable finding; the levels are not comparable to CRDC raw rates.

**A second, peer-reviewed locale source. TIER 2.** Gentry, M., Whiting, G. W., & Gray, A. M. (2022).
"Systemic Inequities in Identification and Representation of Black Youth with Gifts and Talents: Access,
Equity, and Missingness in Urban and Other School Locales." *Urban Education*, 59(6), 1730–1773. DOI
[10.1177/00420859221095000](https://doi.org/10.1177/00420859221095000).

**Crossref verification:** resolved. Returned title "Systemic Inequities in Identification and
Representation of Black Youth with Gifts and Talents: Access, Equity, and Missingness in Urban and Other
School Locales"; container-title *Urban Education*; publisher SAGE Publications; volume 59, issue 6, pages
1730–1773; issued 2022-05-16. Authors Marcia Gentry, Gilman Whiting, Anne M. Gray. **Match confirmed.**

From the published abstract, verbatim: "With more than 80% of Black youth educated in cities and suburbs,
underrepresentation in gifted programs plague urban centers. Examination of OCR Data by Title I School
status revealed **45% fewer Black students identified in Title I Schools**. Additionally, in every state and
school locale, Black youth were underidentified on average by 50%. In 2016, **276,840 Black students were
identified as gifted, with as many as 771,728 (73.60%) missing from identification**."

*(I read the abstract, not the full text — SAGE returns HTTP 403 to command-line requests. Figures above are
from the abstract as indexed. The 276,840 figure cross-checks against the CRDC 2015-16 file I downloaded
myself, which reports 276,838 Black students identified — a two-student difference, consistent with a minor
revision between file versions.)*

**A related dissertation by the same lead author. TIER 3.** Gray, A. (2020). "Still Underrepresented:
Minoritized Students With Gifts And Talents." Purdue University Graduate School thesis. DOI
[10.25394/pgs.12543710.v1](https://doi.org/10.25394/pgs.12543710.v1). Abstract, verbatim: "In 2015-2016,
there were 276,840 Black students with gifts and talents identified with an estimated 469,213 (62.89%) to
771,728 (73.60%) missing from identification; **588,891 Latinx students** with gifts and talents identified
with an estimated 658,544 (52.79%) to 1,164,363 (66.41%) missing from gifted identification." Data were
examined "by locale (i.e., City, Suburb, Town, Rural)."

**One widely quoted access fact, from press coverage of the Gentry work. TIER 5 — press.** *Journal of
Blacks in Higher Education* (June 2022), reporting on the Purdue study: "**More than one-third of children
in the U.S. do not attend schools that have gifted education programs.**"
URL: [jbhe.com/2022/06/purdue-university-study-examines-barriers-to-gifted-education-for-black-students/](https://jbhe.com/2022/06/purdue-university-study-examines-barriers-to-gifted-education-for-black-students/).
**I could not verify this one-third figure against the primary report text** — flagged in the final section.

## Question 3 — The flow: how many children are newly identified each year

### 3.1 The direct answer: this number is not published, by anyone

**I could not find any source — federal, state, or academic — that publishes the number of US students newly
identified as gifted in a given year.** This is a structural gap, not a search failure, and the reason is
visible in the data-collection design:

- **The CRDC asks for a stock, not a flow.** The 2021-22 CRDC data element list reads, verbatim: "Number of
  students (preschool-12) **enrolled in** gifted & talented programs [disaggregated by race, sex (male,
  female, nonbinary), disability-IDEA, EL]."
  ([www.ed.gov/sites/ed/files/about/offices/list/ocr/docs/2021-22-crdc-data-elements.pdf](https://www.ed.gov/sites/ed/files/about/offices/list/ocr/docs/2021-22-crdc-data-elements.pdf),
  verified.) "Enrolled in" is a count of who is currently in the program. There is no "newly identified this
  year" element, and none in the 2020-21 element list either.
- **NCES does not collect gifted status at all** in the Common Core of Data. Its only gifted tables (204.80,
  204.90) are republications of CRDC.
- **Most states do not collect it either.** Per the 2022-23 State of the States (§5.6), only 6 of 49
  responding states produce an annual report on gifted services, and only 18 of 47 treat "gifted" as a
  sub-reporting group for accountability.

**Stated plainly: the annual flow of newly identified gifted children in the United States is an unpublished
quantity.** Everything below is inference, and I label it as such.

### 3.2 The identification grade, from federal and district sources

**Grade 2 and grade 3 are the modal entry points, and this is documented rather than assumed.**

**TIER 4 — NAGC/CSDPG 2022-23 State of the States, p. 17.** In describing the follow-up question asked of
states with mandatory universal screening, the report gives its own worked example of what a state screening
specification looks like: whether the state specifies "when and with whom the screen occurs (**e.g.,
screening of all second graders**)." Nine of the twelve states with mandatory universal screening do specify
when it occurs; the report does not tabulate which grades they name. **So "grade 2" is NAGC's own
illustrative example, not a published national modal grade. Treat it as suggestive.**

**TIER 1 — municipal government primary source, New York City.** NYC Mayor's Office press release, "Mayor
Adams, Chancellor Banks Announce Expansion of Gifted and Talented Programs Citywide," April 14, 2022.
URL: [www.nyc.gov/mayors-office/news/2022/04/mayor-adams-chancellor-banks-expansion-gifted-talented-programs-citywide](https://www.nyc.gov/mayors-office/news/2022/04/mayor-adams-chancellor-banks-expansion-gifted-talented-programs-citywide)
(verified, retrieved in full).

Verbatim: "**Determined by grades in the four core subject areas, the top 10 percent of second graders in
each school will be invited to apply to a third-grade Gifted and Talented program.**"

And verbatim on why: "**Child development research shows that identifying gifted behavior in later grades
may provide a more accurate assessment of gifted ability.**"

### 3.3 Grade-cohort sizes, so a rate can be applied to one

From NCES Digest 2024 Table 203.10 (see §4.1), public school enrollment, fall 2023, in thousands:

| Grade | Public enrollment |
| --- | ---: |
| Kindergarten | 3,501,000 |
| Grade 2 | 3,613,000 |
| Grade 3 | 3,544,000 |

**A single public school grade cohort in the United States is roughly 3.5 to 3.6 million students.**

Adding private school students: private K–8 was 3,329,190 in fall 2021 across nine grades (§4.2), so a
single private grade cohort averages roughly 370,000. **A single US grade cohort, public plus private, is
therefore on the order of 3.9 to 4.0 million children.** *(That per-grade private figure is my division of a
published nine-grade total by nine, which assumes even distribution across grades. It is an approximation.)*

### 3.4 The inference, with its assumptions stated

**This is my calculation, not a published figure.**

Applying the national CRDC identification rate of 6.01% (§1.2) to one public grade cohort of 3,613,000
(grade 2, fall 2023):

**6.01% × 3,613,000 ≈ 217,000 students per year.**

**Three reasons that number is a floor, not a point estimate:**

1. **The 6.01% is a stock rate averaged over all grades, including K–2 where almost nobody is yet
   identified.** Because identification accumulates with grade level, the share of an entering cohort that
   is *eventually ever* identified must be higher than 6.01%. The true lifetime identification rate — and
   therefore the true annual flow — is above 217,000.
2. **It counts public school only.** Private schools are outside the CRDC entirely and are not counted in
   either the numerator or the denominator.
3. **It assumes each identified student is identified exactly once.** Students who move between districts
   are frequently re-identified; only 4 of 39 states require automatic reciprocity for gifted identification
   across state lines (§5.6). Re-identification events are not new children but would be counted as new
   identifications by any district-level tally.

**An alternative steady-state calculation, also mine.** If the stock is 2,955,610 and a student identified
around grade 3 stays identified for roughly the remaining 10 years of schooling, then in steady state the
annual inflow is approximately 2,955,610 ÷ 10 ≈ **296,000 per year.** This assumes identification is
permanent once conferred and that the system is in steady state; neither assumption is verified, and §6
shows the system is *not* in steady state — the stock fell by 11% between 2017-18 and 2020-21.

**My honest summary of the flow: somewhere in the low hundreds of thousands per year, most plausibly
between roughly 220,000 and 300,000, from two crude models that disagree by about 35%. This is an inference
range, not a measurement.**

### 3.5 One observed flow number, from a single large district

NYC's gifted program has, per the primary source in §3.2, **2,500 total kindergarten seats** (2,400
pre-existing plus 100 added) across all 32 districts, plus **1,000 third-grade seats.** Those two entry
points together are on the order of **3,500 new gifted placements per year in the largest school system in
the United States.**

Verbatim from the same release: "For the 2022-2023 school year, approximately 100 new kindergarten seats
are being added to the Gifted and Talented portfolio — expanding the program to all 32 districts and
**bringing the total number of seats to 2,500.**" And: "For the first time ever, every district in New York
City will provide an additional third-grade Gifted and Talented entry point, amounting to a baseline of one
program in every district and **a total of 1,000 seats.**"

*(For scale against that district: the CRDC 2020-21 file records New York State as identifying 33,929
students out of 2,561,406 enrolled, a rate of 1.32%, the fifth-lowest of the 52 jurisdictions — §2.2.)*

## Question 4 — Total population denominator: K–8 enrollment, public and private

### 4.1 Public school enrollment by grade, fall 2023 (most recent actual)

**Source. TIER 1 — Federal.** NCES, *Digest of Education Statistics 2024*, **Table 203.10**, "Enrollment in
public elementary and secondary schools, by level and grade: Selected years, fall 1980 through fall 2023."
URL: [nces.ed.gov/programs/digest/d24/tables/dt24_203.10.asp](https://nces.ed.gov/programs/digest/d24/tables/dt24_203.10.asp)
(verified HTTP 200; `<title>` matches). All figures in the table are **in thousands**.

Fall 2023 row, read directly:

| Grade | Enrollment (thousands) |
| --- | ---: |
| Prekindergarten | 1,574 |
| Kindergarten | 3,501 |
| Grade 1 | 3,486 |
| Grade 2 | 3,613 |
| Grade 3 | 3,544 |
| Grade 4 | 3,590 |
| Grade 5 | 3,596 |
| Grade 6 | 3,616 |
| Grade 7 | 3,673 |
| Grade 8 | 3,712 |
| Ungraded | 43 |
| **PK through grade 8, total (as published)** | **33,947** |
| Grades 9–12, total | 15,569 |
| **All grades** | **49,516** |

**Public K–8 (kindergarten through grade 8, excluding prekindergarten and ungraded), fall 2023: 32,331
thousand ≈ 32.33 million.** *(This is my sum of the nine published grade cells. NCES publishes the PK-8
total of 33,947 thousand, not a K-8 total, so the K-8 figure is my arithmetic. Cross-check: 33,947 − 1,574
PK − 43 ungraded = 32,330, which agrees to within one thousand — the gap is rounding in the published
thousands.)*

### 4.2 Private school enrollment, K–8, fall 2021 (most recent published)

**Source. TIER 1 — Federal.** NCES, *Digest of Education Statistics 2023*, **Table 205.20**, "Enrollment and
percentage distribution of students enrolled in private elementary and secondary schools, by school
orientation and grade level: Selected years, fall 2009 through fall 2021." Panel **"Kindergarten through
grade 8," row 2021, column "Total private enrollment."**
URL: [nces.ed.gov/programs/digest/d23/tables/dt23_205.20.asp](https://nces.ed.gov/programs/digest/d23/tables/dt23_205.20.asp)
(verified HTTP 200; `<title>` matches). Underlying collection is the NCES Private School Universe Survey
(PSS); the table carries standard errors, so it is a survey estimate, not a census.

**Private K–8, fall 2021: 3,329,190 (standard error 11,595).**

For context from the same panel: private K–8 was 3,390,690 in 2009, 3,264,540 in 2013, 3,457,540 in 2015,
3,430,130 in 2017, 3,233,280 in 2019, and 3,329,190 in 2021 — essentially flat across twelve years.

Total private enrollment all grades, fall 2021: 5,473,540 (SE 16,721). Private prekindergarten, fall 2021:
742,240 (SE 4,971).

**Digest 2024 does not contain Table 205.20 or 205.10** (`dt24_205.20.asp` and `dt24_205.10.asp` both return
HTTP 404, verified). Fall 2021 is therefore the most recent private-school figure available in the Digest
series as of this writing.

### 4.3 The matched-year total: fall 2021

Because private data stop at fall 2021, the only year where both halves come from the same year is fall
2021. From Table 203.10, fall 2021 row: K 3,554; grade 1 3,458; grade 2 3,519; grade 3 3,542; grade 4 3,550;
grade 5 3,611; grade 6 3,650; grade 7 3,756; grade 8 3,859 (thousands).

| Fall 2021, K–8 | Count |
| --- | ---: |
| Public (my sum of nine published grade cells) | 32,499,000 |
| Private (published, Table 205.20) | 3,329,190 |
| **Total K–8, public + private** | **≈ 35,828,000** |

**Label this clearly: the total is my addition of one federal census-based figure and one federal
survey estimate. Neither NCES nor anyone else publishes this combined number as such.** Private enrollment
is 9.29% of the K–8 total on these figures.

*(Do not confuse the private K–8 figure 3,329,190 with the 2017-18 national gifted count 3,329,540 in §1.5.
They are unrelated numbers that happen to agree to four significant figures.)*

---

## Question 5 — How many states mandate identification and services

**The source for all of §5 is the same document.** NAGC & CSDPG. *2022-2023 State of the States in Gifted
Education.* National Association for Gifted Children and the Council of State Directors of Programs for the
Gifted. Copyright 2025. 227 pages.
URL: [assets.noviams.com/novi-file-uploads/nagc/State_of_the_States/2022-23_State_of_States_Repo.pdf](https://assets.noviams.com/novi-file-uploads/nagc/State_of_the_States/2022-23_State_of_States_Repo.pdf)
(verified HTTP 200; 4,091,083-byte PDF downloaded and text extracted; all figure numbers below read from
the extracted page text, page numbers given as the report's own printed page numbers).

**TIER 4 — advocacy organization self-report survey.** This is a survey of state education agency staff, not
an audit of statute. NAGC's own framing: it is "the only broad study of state data on gifted education in
the United States." **No federal source collects this policy inventory**, which is why a Tier 4 source is
the best available here. Read every number below as "N state respondents said X," not "X is true in N
states."

### 5.1 Who answered

Verbatim, Executive Summary p. 7: "For the 2022-2023 report, the findings include **48 states (New York and
Ohio did not respond), the District of Columbia, and the Department of Defense Education Activity.**"

So the respondent pool is 50 entities, not 50 states. Individual item counts have different denominators
(n=50, n=48, n=47, n=46, n=26) because of item nonresponse and because some questions are asked only of
those who answered "yes" upstream. **I report each item's own n.**

### 5.2 The four numbers asked for

| Question | Yes | No | n | Where |
| --- | ---: | ---: | ---: | --- |
| **Requires identification of GT students by law or rule** | **35** | **15** | 50 | Figure 3 (Q19), p. 16 |
| **Has a law or rule mandating gifted programming options/services** | **25** | **23** | 48 | Figure 7 (Q72), p. 20 |
| **Provides dedicated funding to LEAs earmarked for gifted education** | **26** | **21** | 47 | Figure 29 (Q136), p. 31 |
| Has a state definition of "gifted" in law or rule | 46 | 4 | 50 | Figure 2 (Q14), p. 15 |

Verbatim, p. 16: "Of the 50 respondents, **35 require by law or rule the identification of gifted and
talented students and 15 do not.**"

Verbatim, p. 20: "Of 48 respondents, **25 reported their state has a law or rule that mandates gifted
programming options/services and 23 reported their state does not.**"

Verbatim, p. 31: "Respondents were asked if their states provided dedicated funding to LEAs specifically
earmarked to support gifted education. **Of the 47 respondents, 26 indicated 'yes' and 21 indicated 'no'.**"

Verbatim, Executive Summary p. 8: "**Slightly more than half of the states (55%) reported having dedicated
funding for gifted education.**"

### 5.3 "How many have no requirement at all"

**The report does not publish this cross-tabulation, and I did not compute it.** What can be said from the
published marginals: **15 of 50 do not require identification, and 23 of 48 do not mandate programming or
services.** Whether the 15 are a subset of the 23 is not stated, and the two items have different
denominators, so subtracting them would be wrong. Determining the intersection would require reading
Appendix Table 6 (identification by state) against Appendix Table 20 (programming mandate by state)
state-by-state. **I flag this as not established.**

### 5.4 The funding is far thinner than "26 states fund it" suggests

The 26 states with dedicated funding were then asked what it is earmarked for. Verbatim from Executive
Summary p. 8: "several states indicated that state funds were specifically earmarked for **universal
screening (7), identification of gifted students (9), programming for gifted students (13), and to address
the equity/excellence gap in gifted education (1).**"

Confirmed against the section detail:

| Earmark, 2022-23 | Yes | No | n | Where |
| --- | ---: | ---: | ---: | --- |
| Funding earmarked for **identification** | 9 | 17 | 26 | Figure 30 (Q144), p. 31 |
| Funding earmarked for **universal screening** | 7 | 19 | 26 | Figure 31 (Q146), p. 32 |
| Funding earmarked for **programming/services** | 13 | 13 | 26 | Figure 32 (Q149), p. 32 |
| Funding to address the **equity/excellence gap** | 1 | 24 | 25 | p. 32 (text) |

So across 50 responding entities, **7 fund universal screening and 9 fund identification.**

### 5.5 Universal screening is not required in most states

Verbatim, p. 17: "Of the 50 respondents, **10 indicated 'Used for referral for identification,' 12 indicated
'Used for Identification,' and 38 indicated 'Not Required.'**" (Figure 5, Q32; respondents could choose more
than one.)

Executive Summary p. 7 states it as: "In terms of universal screening, **37 of 50 respondents noted that
universal screening was not required.**" *(The Executive Summary says 37 and Figure 5 says 38. I am
recording both as printed rather than picking one; this is an internal inconsistency in the report.)*

Of the 12 states where universal screening is required, verbatim p. 17: "**9 indicated 'yes' and 3 indicated
'no'**" to whether the state specifies when and with whom the screen occurs, "(e.g., screening of all second
graders)." On instruments: "3 indicated 'Yes, LEAs can choose from a list of approved instruments/
assessments,' 2 indicated 'Yes, all LEAs must use the same instrument(s),' and 7 indicated 'no' the state
does not require the instrument to be used."

**That is the whole national picture for mandated universal screening: 12 states, of which 5 name an
instrument or an approved list.**

### 5.6 Criteria, personnel, and accountability

- **Specific identification criteria/methods required of LEAs:** 24 yes, 26 no, n=50 (Figure 4, Q21, p. 16).
  Of the 24, "18 indicated yes and 6 indicated no" that LEAs may modify the criteria.
- **LEAs required to follow the state definition:** 38 of the 46 states that have a definition (p. 15).
- **State law requires each LEA to have a gifted education administrator/coordinator:** 12 yes, 36 no, n=48
  (Figure 19, Q67, p. 26). Of those 12, only **5** require that person to hold a credential in gifted
  education.
- **Teacher training required:** of 42 respondents, "**20 indicated 'training not required by the state,'**
  and 17 indicated 'GT Endorsement.'" Other responses: GT Certification (10), non-credentialed local PD (5),
  GT Licensure (5). (Figure 20, Q113, p. 26.)
- **SEA produces an annual report on GT services:** 6 yes, 37 no, 6 other, n=49 (Figure 33, Q48, p. 33).
- **LEAs required to report on GT programs through state accountability:** 24 yes, 25 no, n=49 (Figure 34,
  Q50, p. 33).
- **State identifies "gifted" as a sub-reporting group for accountability:** 18 yes, 29 no, n=47 (Figure 35,
  Q52, p. 33).
- **Acceleration policy in law or rule:** 12 yes, 36 no, n=48 (Figure 13, Q86, p. 23).
- **Early entrance to kindergarten policy in law or rule:** 17 yes, 31 no, n=48 (Figure 14, Q88, p. 23).
- **Automatic reciprocity for GT identification across states:** 4 required, 35 not, n=39 (p. 25).
  Conditional reciprocity: 7 required, n=39.

### 5.7 The governing legal fact

Verbatim, p. 15: "It is important to note that **states are under no obligation to use the federal
definition. States have the authority to define, identify, and serve gifted students. Further, it is also
important to note that states also have the authority to not provide formal support for gifted students.**"

The federal definition itself, quoted in the report from ESSA (P.L. 114-95; 20 USC 7801[27] [2015]):
"The term 'gifted and talented,' when used with respect to students, children, or youth, means students,
children, or youth who give evidence of high achievement capability in such areas as intellectual,
creative, artistic, or leadership capacity, or in specific academic fields, and who need services or
activities not ordinarily provided by the school in order to fully develop those capabilities."

### 5.8 The prior wave, for comparison

**Source. TIER 4.** NAGC & CSDPG. *2020-2021 State of the States in Gifted Education.* URL:
[www.giftedpage.org/wp-content/uploads/2022/12/2020-21-State-of-the-States-in-Gifted-Education-Final.pdf](https://www.giftedpage.org/wp-content/uploads/2022/12/2020-21-State-of-the-States-in-Gifted-Education-Final.pdf)
(verified; full text retrieved). That wave covered "all 50 states, the District of Columbia and two
additional entities, the Department of Defense Education Activity and Puerto Rico."

Verbatim from its Executive Summary: "There were **46 out of 52 respondents** who reported that they had a
state definition of gifted… The majority of respondents (**41**) indicated that LEAs were required to follow
their state's definition of gifted and that they were **required by law or rule to identify gifted and
talented students** in their state. There was more leeway in the criteria and/or method used to identify
gifted students as **only 10 reported that the identification process was state mandated**."

And: "**Slightly more than half of the respondents (26) reported having dedicated funding from the state for
gifted education**… state funds were specifically earmarked for universal screening (8), identification of
gifted students (8), programming for gifted students (10), and to address the equity/excellence gap in
gifted education (1)."

**The 41 → 35 change in "requires identification" between waves is not necessarily a real policy change.**
The 2022-23 report says explicitly, p. 7: "The primary revision was the **removal of 'determined by the LEA'
from survey responses.**" Response options changed, so the two waves are not directly comparable. The
report itself footnotes this for individual items — e.g., for the criteria/methods item: "in the previous
report, of the 51 respondents, 10 responded yes, 9 responded no, 20 responded it was determined by the LEA,
and 12 responded 'other.'"

## Question 6 — Trends over time

### 6.1 The federal time series: flat for 15 years, then a sharp drop

**Sources. TIER 1 — Federal.** Counts for 2004 through 2017-18 from NCES Digest 2022 Table 204.80 (§1.5).
Count for 2015-16 from the CRDC 2015-16 Public Use File (§2.3). Count for 2020-21 from the CRDC 2020-21
Public Use File (§1.1). Percentages from NCES Digest 2023 Table 204.90 (§1.3).

| CRDC wave | Students identified | Rate (NCES Table 204.90) | Source of the count |
| --- | ---: | ---: | --- |
| 2004 | 3,202,760 (SE 24,248) | 6.7% | Digest 2022, T204.80 |
| 2006 | 3,236,990 (SE 21,177) | 6.7% | Digest 2022, T204.80 |
| 2011-12 | 3,189,757 | 6.4% | Digest 2022, T204.80 |
| 2013-14 | 3,329,544 | 6.7% | Digest 2022, T204.80 |
| 2015-16 | 3,255,040 | *not in T204.90* | CRDC 2015-16 PUF |
| 2017-18 | 3,329,540 | 6.6% | Digest 2022, T204.80 |
| **2020-21** | **2,955,610** | **6.1%** | CRDC 2020-21 PUF |

**The single most important number in this table: the count fell by 373,930 students between 2017-18 and
2020-21, a decline of 11.2%.** *(That subtraction and percentage are mine; both endpoints are published
federal figures.)* Over the same period total public enrollment fell from about 50.9 million to 49.2
million, roughly 3%, so the gifted decline is roughly four times the enrollment decline.

Every prior wave from 2004 to 2017-18 sat between 3.19 and 3.33 million and between 6.4% and 6.7%. **2020-21
is the first wave in the series to break that band.**

**One large caveat on interpreting the 2020-21 drop.** 2020-21 was the first pandemic school year. The CRDC
First Look report for that year records, verbatim, that instruction was disrupted: "88% In-person
instruction only because of the coronavirus pandemic - 6% Virtual instruction only because of the
coronavirus pandemic - 5% No impact on instruction because of the coronavirus pandemic - 1%" hybrid. Whether
the drop reflects fewer children being identified, or testing and screening being suspended for a year, or
a reporting artifact, **is not established by the data itself.** The next wave (2021-22) would settle it;
see §6.4 for why I could not retrieve it.

### 6.2 The state-level picture of the decline

Comparing my own computations for 2015-16 (§2.3) and 2020-21 (§2.2), the states that led the country
declined the most:

| State | 2015-16 rate | 2020-21 rate | Change |
| --- | ---: | ---: | ---: |
| Maryland | 16.92% | 11.33% | −5.59 pts |
| Kentucky | 13.80% | 12.06% | −1.74 pts |
| Indiana | 12.29% | 10.43% | −1.86 pts |
| Oklahoma | 13.89% | 12.30% | −1.59 pts |
| Nevada | 5.21% | 2.13% | −3.08 pts |
| California | 6.78% | 4.98% | −1.80 pts |
| **United States** | **6.45%** | **6.01%** | **−0.44 pts** |

*(All six state changes and the national change are my subtractions of two rates I computed from published
CRDC counts. Maryland's absolute count fell from 151,217 to 100,100 — a loss of 51,117 identified students
in one state.)*

### 6.3 An independent finding of the same direction

**TIER 3 — research brief, not peer reviewed.** AdvancED Equity brief (full citation in §2.1), which
harmonized CRDC school-level data from 2011-12 through 2021-22 merged with the NCES Common Core of Data.

Verbatim: "**GT identification rates have been falling since 2015 for most students** (except White students
whose rates have been largely stable across the decade). **The declines are especially salient for Asian
students.** Even with these declines, racial/ethnic disparities in GT identification persist across this
time period."

*(Note this brief's denominator excludes zero-GT districts, so its levels are not comparable to §6.1. Its
finding of a downward trend since 2015 is nonetheless directionally consistent with the federal counts.)*

### 6.4 What happened in New York City — the case most often cited, told accurately

This is the single most-cited example of a district eliminating gifted programming. **The elimination was
announced and then reversed. Getting this wrong is easy, so here is the sequence with primary and
contemporaneous sources.**

**Step 1 — The admissions test is suspended (2020-21).** The test had already stopped being administered. Per
the NYT, April 14, 2022: "The citywide admissions test, **which has not been offered since fall 2020**, will
be replaced by a screening process…"

**Step 2 — Phase-out announced, October 8, 2021.** **TIER 5 — press.** Chalkbeat New York, October 8, 2021,
verbatim: "**Starting this fall, New York City will no longer test rising kindergartners for entry into its
gifted and talented program**, which has long attracted controversy for enrolling starkly low numbers of
Black and Latino students. Instead of having a specific gifted program sorting a small number of children,
all kindergarten students attending the city's 800 elementary schools next September will receive
'accelerated' instruction… Starting in third grade, all students will be screened to determine if they
should continue to receive accelerated instruction in specific subjects."
URL: [www.chalkbeat.org/newyork/2021/10/8/22716211/gifted-talented-test-segregation-nyc-overhaul/](https://www.chalkbeat.org/newyork/2021/10/8/22716211/gifted-talented-test-segregation-nyc-overhaul/)

The replacement program was named **Brilliant NYC**. Per the same reporting, "the city would train roughly
4,000 teachers."

The NYT, October 8, 2021, verbatim: "Under Mr. de Blasio's plan — released when he has just three months
left in office — elementary school students who are currently enrolled in gifted classes **would become the
final cohort**."

**Step 3 — Reversal and expansion, April 14, 2022.** **TIER 1 — municipal government primary source.** NYC
Mayor's Office press release (URL in §3.2, verified and retrieved in full). Mayor Eric Adams and Chancellor
David Banks **expanded** the program instead: "adding **100 kindergarten seats and 1,000 third-grade
seats**, expanding both entry points to all districts… **bringing the total number of seats to 2,500**"
for kindergarten.

**Step 4 — But the test is gone permanently.** From the same release: kindergarten entry is now "Universal
pre-K screening… **First implemented for the 2021-2022 school year, universal screening led to a more
diverse pool of students receiving invitation to apply**." NYT, April 14, 2022, verbatim: Adams unveiled a
plan "to expand the city's gifted and talented classes for elementary students and to **permanently
eliminate the contentious admissions test given to 4-year-olds**."

**The accurate summary: New York City did not eliminate its gifted program. It permanently eliminated the
kindergarten admissions test, replaced it with teacher nomination plus lottery, and slightly expanded total
seats.** What is genuinely striking in the primary source is the *scale*: the entire kindergarten gifted
program of the largest school district in the United States is **2,500 seats**, plus 1,000 in third grade.

### 6.5 A talent search that actually did shut down

See §7.3. Duke TIP — a program that had been identifying roughly 100,000 students a year — closed
permanently in 2020. That is the clearest single instance in this document of gifted-identification capacity
being removed rather than reorganized.

### 6.6 What I could not retrieve for the trend

**The 2021-22 and 2023-24 CRDC waves both exist and I could not extract a national gifted count from
either.** Documented:

- The 2021-22 CRDC public-use file was released **January 2025**. Per the OCR data snapshot (verified, HTTP
  200, `https://www.ed.gov/media/document/crdc-overview-informational-snapshot-january-2025-109174.pdf`):
  "For the 2021-22 school year, the CRDC includes data from more than 17,000 school districts and 97,000
  schools nationwide." The snapshot lists "Gifted & Talented Programs" among data topics but **publishes no
  gifted count.**
- The OCR state/national estimation API endpoint for 2021-22
  (`.../GetStateNationalEstimation?survey_Year_Key=11&Report_Id=34`) returns HTTP 200 and a valid `.xlsx`,
  but **the workbook is empty** — it contains only the title cell "Number and percentage of public school
  students enrolled in gifted/talented programs, by race/ethnicity, disability status, and English
  proficiency, by state " and no data rows. I verified this on both `civilrightsdata.ed.gov` and
  `ocrdata.ed.gov`. **This appears to be a defect on OCR's side.**
- `ocrdata.ed.gov/data` lists a **2023-24** collection year in its download table. I could not retrieve a
  gifted table for it.

**Consequence: the most recent verifiable national gifted count in this document is 2020-21. Anything about
2021-22 in this document comes from the AdvancED Equity brief's secondary analysis, with its restricted
denominator.**

---

## Question 7 — Talent search participation (CTY, Duke TIP)

### 7.1 Johns Hopkins Center for Talented Youth (CTY)

**Source. TIER 5 — institutional self-report (university press release), primary document.** Johns Hopkins
Center for Talented Youth, "Johns Hopkins Center for Talented Youth honors world's brightest students,"
FOR IMMEDIATE RELEASE, Baltimore, January 2021. PDF retrieved and read in full (verified HTTP 200,
137,569 bytes) at
[bbk12e1-cdn.myschoolcdn.com/ftpimages/27/misc/misc_238607.pdf](https://bbk12e1-cdn.myschoolcdn.com/ftpimages/27/misc/misc_238607.pdf).
*(This is a mirror of the JHU release hosted by a school that reposted it; `cty.jhu.edu` returns HTTP 403 to
command-line requests. The document is on JHU letterhead with named JHU media contacts.)*

Verbatim, on talent search volume: "**More than 15,000 students in grades two through eight tested through
CTY's Talent Search between July 1, 2019 and June 30, 2020**, representing all 50 states plus Washington
D.C., Puerto Rico, Guam, the U.S. Virgin Islands, and Armed Forces installations in Europe and the Pacific,
as well as more than 70 countries."

Verbatim, on the award threshold: "**Nearly 1,400 students** from this group who scored in the top 9% on
their test were 2020 Grand Honors awardees."

Verbatim, on the extreme tail: "**Five** of the students who tested through CTY's Talent Search between July
1, 2019 and June 30, 2020 achieved a perfect score on the reading or math section of their test. In
addition, **more than 160 testers under age 13 achieved a score of 700 or higher on the math or verbal
section of the SAT**, and in turn, qualified for CTY's Julian C. Stanley Study of Exceptional Talent."

Verbatim, on program enrollments: "Typically, there are **more than 9,700 enrollments** by bright pre-college
students in CTY Summer Programs, held at two-dozen sites in the United States and Hong Kong… Last year,
there were **more than 20,600 enrollments in CTY Online Programs** courses and **more than 1,400 enrollments
in CTY Family Academic Programs.**"

**A later year. TIER 5 — CTY news article, February 2023.** "CTY Celebrates Top Students' Academic
Excellence,"
[cty.jhu.edu/who-we-are/news-events/articles/cty-celebrates-top-students-academic-excellence](https://cty.jhu.edu/who-we-are/news-events/articles/cty-celebrates-top-students-academic-excellence).
Verbatim: "**Nearly 15,300 students from 76 countries joined CTY's talent search in the 2021-22 academic
year. About 27 percent of them qualified for the award ceremony**, receiving either high or grand honors
based on their test scores." And: "**More than 135,000 CTY alumni** worldwide."

*(This page returns HTTP 403 to command-line requests. I retrieved the text through search-engine
extraction of the live page, not by fetching it directly. The two figures above are the ones I am
confident of; I flag the retrieval method in the final section.)*

**A historical anchor. TIER 2 — peer-reviewed.** Barnett, L. B., Albert, M. E., & Brody, L. E. (2005). "The
Center for Talented Youth Talent Search and Academic Programs." *High Ability Studies*, 16(1), 27–40. ERIC
accession EJ694780 ([eric.ed.gov/?id=EJ694780](https://eric.ed.gov/?id=EJ694780), verified). Abstract,
verbatim: "**CTY now serves approximately 80,000 students each year through its talent search and various
academic offerings.**"

**Note the contrast: about 80,000 students a year in 2005, about 15,000–15,300 in the talent search in
2019-20 and 2021-22.** These are not identical measures — the 2005 figure combines talent search and all
academic programs, while the 15,000 figures are talent search testers only. **I did not find a
like-for-like time series for CTY, and I am not asserting a decline.** Flagged in the final section.

### 7.2 Duke Talent Identification Program (Duke TIP) — participation

**Source. TIER 5 — institutional primary source.** Duke University, *Duke Today*, "Duke Talent
Identification Program Announces New Director," April 2016.
URL: [today.duke.edu/2016/04/duketip](https://today.duke.edu/2016/04/duketip) (verified HTTP 200, page
retrieved and the passage read directly).

Verbatim: "Duke TIP was founded in 1980 through a grant from The Duke Endowment. **The program annually
identifies nearly 100,000 gifted students through its talent searches** and provides summer and academic
year educational programs at Duke and around the world. **Duke TIP distributes more than $3.2 million in
financial aid each year. Since its founding, it has served more than 2.8 million academically gifted
students in grades 4 through 12.**"

**A second, later Duke primary source with a specific recognition-ceremony count.** Duke University, *Duke
Today*, "While We've Been Away …," September 2020.
URL: [today.duke.edu/2020/09/while-we%E2%80%99ve-been-away-%E2%80%A6](https://today.duke.edu/2020/09/while-we%E2%80%99ve-been-away-%E2%80%A6)
(verified HTTP 200, passage read directly).

Verbatim: "Part of Duke TIP's Talent Search Program, which connects young gifted students with guidance and
academic opportunities, **seventh-graders take the SAT or ACT test.** Those that hit score benchmarks are
invited to recognition ceremonies… **This spring, 10,576 students from 46 states were invited to Duke TIP's
28 ceremonies.**"

So: roughly **100,000 identified per year across all talent searches**, of whom **10,576 hit the recognition
benchmark in spring 2020** in the 7th-grade search.

### 7.3 Duke TIP's closure: the fact, the date, and the stated reason

**Date: announced October 8, 2020. Cause as stated by Duke: COVID-19 destroyed the financial model.**

**Source. TIER 5 — press, with a named Duke official quoted directly.** WTVD/ABC11 Raleigh-Durham, "Duke
University to lay off 75 employees due to COVID-19 disruptions," Friday, October 9, 2020.
URL: [abc11.com/post/duke-university-layoffs-tip-college-covid/6874746/](https://abc11.com/post/duke-university-layoffs-tip-college-covid/6874746/)

Verbatim, quoting **Michael Schoenfeld, chief communications officer** for Duke: "**This is, unfortunately,
a direct result of COVID-19, which forced the cancellation of the TIP residential summer session on the
Duke campus and other colleges in 2020 and likely again in 2021 and thus created an unsustainable financial
position for the program.**"

Also verbatim from that report: "Public documents show Duke University will be laying off **75 employees**
by the start of the new year… On Thursday, in a message to the public, the Executive Vice Provost **Jennifer
Francis** announced that the university had to make a difficult choice of closing the program due to the
pandemic… **The notice, issued on Oct. 8, says layoffs are expected to begin on Jan. 6.**"

**The Duke TIP statement itself.** The original announcement was published at `https://tip.duke.edu/message`
and the follow-up Q&A at `https://tip.duke.edu/updates/suspension-duke-tip-programs-questions-and-answers`.
**Both URLs still resolve (HTTP 200) but now redirect to `https://provost.duke.edu/pre-college-programs/`,
which contains no reference to TIP, the closure, or the talent search — I checked. The statement itself is
no longer on any duke.edu page I could find.** The text is preserved at
[archive.tipwiki.net/A/End_of_Tip.html](https://archive.tipwiki.net/A/End_of_Tip.html), a community archive
— **TIER 5, and an unofficial mirror**. The same passage also appears verbatim in a contemporaneous
third-party repost. I am quoting it because the wording is decisive and it is corroborated by the Duke
official quoted above, but **I flag that I could not read it on a duke.edu domain.**

Verbatim from that archived statement: "**The pandemic-induced closure of Duke TIP's Summer Studies
residential programs on our main campus in Durham and at colleges across the country in 2020 and likely
again in 2021 has fundamentally disrupted the business and financial models that have long supported the
TIP organization.**"

And, the sentence that ends the talent search: "As we redesign our precollege and talented offerings, **we
will not resume the talent search with above-level testing**, but will instead be looking at new ways to
identify students and facilitate their access to these enrichment programs."

And from the Q&A: "**A: Duke TIP programming will be paused through spring 2021. The national Academic
Talent Search that had been administered by Duke TIP will be ended.**"

And, giving the historical scale in Duke's own words: "…the innovative, enriching and challenging
educational experiences that have made TIP such a transformative resource for **more than three million
students over the past 40 years.**"

**Corroboration from Duke's own later web presence. TIER 5 — institutional self-report, retrieved via
Internet Archive** (capture dated 2022-01-20 of `tip.duke.edu`):
[web.archive.org/web/20220120131040/https://tip.duke.edu/](https://web.archive.org/web/20220120131040/https:/tip.duke.edu/).
Verbatim: "**The pandemic also significantly disrupted the Duke TIP and Duke Youth Programs business models,
which were based on providing a high-quality, campus-based, intensive residential experience to large
numbers of students, and led us to make the difficult decision in 2020 to suspend these residential
programs.**… To facilitate this transition, all Duke pre-college programming has been consolidated within
Duke Continuing Studies."

**Summary of the economics fact you asked about:** a 40-year-old university talent search that identified
roughly 100,000 students annually and had served over 3 million cumulatively was shut down because losing
one summer of residential revenue made it financially unsustainable, and 75 staff were laid off. The
above-level-testing talent search was not merely paused — Duke stated it would not resume.

---

## Question 8 — Full-time schools for highly gifted children and their size

### 8.1 Direct answer to the scale question

**No. There is no single school anywhere in the United States serving 10,000 highly gifted children, and
nothing close to it.** The largest dedicated school in this category enrolls about 1,000 students. All five
named schools below, added together, enroll **about 2,260 students**. Even the largest selective public exam
high school in the country — which is not a highly-gifted school — enrolls 5,848 (§8.4).

### 8.2 The named schools, from federal data where available

**Primary source for the private schools. TIER 1 — Federal.** NCES **Private School Universe Survey (PSS),
2023-24 school year**, via the NCES Private School Locator. Each record below was retrieved individually and
each page states its own source line: "Source: PSS Private School Universe Survey data for the 2023-24
school year."

| School | Grades | Total students | NCES School ID | PSS record |
| --- | --- | ---: | --- | --- |
| Stanford Online High School (Redwood City, CA) | 7–12 | **985** | A0900304 | [link](https://nces.ed.gov/surveys/pss/privateschoolsearch/school_detail.asp?ID=A0900304) |
| Roeper City & Country School (Bloomfield Hills, MI) | PK–12 | **496** (436 excluding PK) | A9902435 | [link](https://nces.ed.gov/surveys/pss/privateschoolsearch/school_detail.asp?ID=A9902435) |
| Mirman School (Los Angeles, CA) | K–8 | **417** | 00079183 | [link](https://nces.ed.gov/surveys/pss/privateschoolsearch/school_detail.asp?ID=00079183) |
| Davidson Academy Online (Reno, NV) | 5–12 | **95** | A2390337 | [link](https://nces.ed.gov/surveys/pss/privateschoolsearch/school_detail.asp?ID=A2390337) |

Additional detail read off those same federal records:

- **Mirman School.** PSS type: "Special Program Emphasis." Student/teacher ratio 5.9 (70.9 FTE teachers).
  Enrollment by grade: K 54, 1st 50, 2nd 51, 3rd 54, 4th 49, 5th 55, 6th 52, 7th 31, 8th 21. Race:
  Asian 130, White 144, Two or more 84, Hispanic 34, Black 24, Pacific Islander 1, AI/AN 0.
- **Roeper.** PSS type: "Special Program Emphasis." Ratio 7.9 (55.0 FTE teachers). Grade span PK–12, 60 in
  PK. Largest single grade is 12th, at 45 students.
- **Davidson Academy Online.** PSS type: "Special Program Emphasis." Ratio 4.9 (19.5 FTE teachers).
  Enrollment by grade: 5th 1, 6th 8, 7th 14, 8th 22, 9th 15, 10th 9, 11th 13, 12th 13.
- **Stanford OHS.** PSS type: "Regular elementary or secondary" (not flagged as special emphasis). Ratio
  15.0 (65.8 FTE teachers). Enrollment by grade: 7th 107, 8th 142, 9th 198, 10th 196, 11th 193, 12th 149.

### 8.3 Current-year figures from the schools themselves

**TIER 5 — institutional self-report,** but these are the schools' own published School Profiles for
2025-26, i.e. the documents they send to colleges. Each PDF was downloaded and the figure read from the
document.

**Davidson Academy (Reno) — a *public* school, so not in PSS.** School Profile 2025-2026 (verified, HTTP
200, 397,124-byte PDF):
[www.davidsonacademy.unr.edu/wp-content/uploads/2025/10/School-Profile-2025-2026.pdf](https://www.davidsonacademy.unr.edu/wp-content/uploads/2025/10/School-Profile-2025-2026.pdf)
States, verbatim: "**173 Students Enrolled**," "**40 Students in Class of 2026**," "**9 Average Class
Size**," "**30 National Merit Semifinalists**."

Also verbatim from that profile, on what "highly gifted" means operationally here: "Established in 2006, the
Davidson Academy is a public middle and high school located on the University of Nevada, Reno (UNR) campus,
designated by Nevada legislation as a '**university school for profoundly gifted pupils**' (NRS Chapter
388C)… All students must meet the following eligibility criteria: **A score of 99.9% or above on nationally
normed intelligence tests and/or nationally normed achievement tests.**"

**Davidson Academy Online.** School Profile 2025-26 (verified, HTTP 200, 439,249-byte PDF):
[www.davidsononline.org/wp-content/uploads/2025/09/DAO_SchoolProfile_25-26.pdf](https://www.davidsononline.org/wp-content/uploads/2025/09/DAO_SchoolProfile_25-26.pdf)
Verbatim: "**With an overall enrollment of 103 students and 29 faculty and staff members**, class sizes are
small…" And on the threshold: "**Profoundly gifted students are at least three standard deviations above the
mean on the bell curve of the IQ continuum**"; "students must score in the **99.9th percentile** on accepted
intelligence and/or achievement tests."

Also verbatim, on cumulative output: "Beginning with the class of 2020, Davidson Academy Online has
graduated **44 students**, 10 under Davidson Academy and 34 under Davidson Academy Online."

**Stanford Online High School.** School Profile 2025-26 (Stanford-hosted PDF):
[familygateway.ohs.stanford.edu/sites/default/files/2025-08/OHS_2025-26_School_Profile%20FINAL.pdf](https://familygateway.ohs.stanford.edu/sites/default/files/2025-08/OHS_2025-26_School_Profile%20FINAL.pdf)
Verbatim: "**Total Enrollment 1,073 · Graduating Seniors 91 · Full-Time Students 44% · Part-Time/Single
Course Students 56% · United States Represented 48 · International Countries Represented 47 · Percentage
Students Living Outside the U.S. 16% · Average Students Per Class 13 · Students Receiving Financial Aid
13%.**"

**This is the single most important qualifier in §8: only 44% of Stanford OHS's 1,073 students are
full-time. That is roughly 472 full-time students.** The other 56% are part-time or single-course students
who attend another school. Stanford OHS also describes itself as serving "academically advanced students,"
not specifically highly or profoundly gifted students.

**Mirman School.** Its own homepage states "**430 students ages 5-14**"
([mirman.org](https://mirman.org/)), against the federal PSS figure of 417 for 2023-24. Mirman's IRS
Form 990 narrative, as reproduced on GuideStar, states the school "**HAD AN ENROLLMENT FOR THE 2022-2023
SCHOOL YEAR OF APPROXIMATELY 375 STUDENTS**." **Three different numbers (375, 417, 430) for three different
years; I am reporting the federal one as authoritative.**

**Roeper School.** Its own homepage states "**480 students from 60 metro Detroit communities**"
([roeper.org](https://www.roeper.org/)), against the federal PSS figure of 496 (436 excluding PK) for
2023-24.

### 8.4 A state-government cross-check on Davidson Academy's enrollment history

**Source. TIER 1 — State government.** Nevada Legislature, Research Division, report under NRS 388C.120,
2025.
URL: [www.leg.state.nv.us/Division/Research/Documents/RTTL_NRS388C.120_2025.pdf](https://www.leg.state.nv.us/Division/Research/Documents/RTTL_NRS388C.120_2025.pdf)
(verified HTTP 200, 423,046-byte PDF downloaded).

Verbatim: "The Davidson Academy, located in Reno, Nevada, is now in its **nineteenth year of operation**,
and its seventeenth year receiving appropriate per pupil support funding as a public school in the State of
Nevada… **Enrollment has remained over 150 students, with 169 enrolled for 2023-2024, and 169 initially
enrolled for 2024-2025**… The projected number of students to be enrolled for 2025-2026 is approximately
185."

**So the entire enrollment history of Nevada's statutory school for profoundly gifted pupils is: about 150
to 185 students, in its nineteenth year.**

### 8.5 The scale ceiling, for context

**Source. TIER 1 — Federal.** NCES Common Core of Data, 2024-25 school year, via the NCES Public School
Locator. Brooklyn Technical High School (NCES School ID 360009101928), New York City Geographic District
#13.
URL: [nces.ed.gov/ccd/schoolsearch/school_detail.asp?ID=360009101928](https://nces.ed.gov/ccd/schoolsearch/school_detail.asp?ID=360009101928)
(verified, record retrieved).

**Total Students: 5,848.** Grades 9–12; 294.25 FTE classroom teachers; student/teacher ratio 19.87.

Brooklyn Tech is the largest of New York City's specialized exam high schools and, by enrollment, the
largest selective-admission public secondary school in the United States. **It is a test-in school, not a
school for the highly gifted, and it still does not reach 10,000.**

### 8.6 The totals

| School | Enrollment | Year | Source tier |
| --- | ---: | --- | --- |
| Stanford Online High School | 1,073 (of which ~472 full-time) | 2025-26 | Tier 5 self-report |
| Roeper School | 496 | 2023-24 | Tier 1 federal (PSS) |
| Mirman School | 417 | 2023-24 | Tier 1 federal (PSS) |
| Davidson Academy (Reno) | 173 | 2025-26 | Tier 5 self-report; Tier 1 state corroboration |
| Davidson Academy Online | 103 | 2025-26 | Tier 5 self-report (95 in PSS 2023-24) |
| **Total across all five** | **≈ 2,262** | mixed | *my addition* |

Set that against the national stock: **2,955,610 children are identified as gifted in US public schools, and
the five best-known full-time schools built specifically for them enroll about 2,262 between them — roughly
0.08% of the identified population.** *(That percentage is my division of my own sum by a published federal
count, across mismatched years. It is an order-of-magnitude statement, not a precise rate.)*

---

## Verification log

### DOIs — resolved against the registry and field-matched

Two DOIs are cited in this document. Both were resolved and every field compared.

**1. `10.1177/00420859221095000`** — checked against `https://api.crossref.org/works/10.1177/00420859221095000`.

| Field | As cited here | As returned by Crossref | Match |
| --- | --- | --- | --- |
| Title | Systemic Inequities in Identification and Representation of Black Youth with Gifts and Talents: Access, Equity, and Missingness in Urban and Other School Locales | identical | ✅ |
| Journal | Urban Education | Urban Education | ✅ |
| Publisher | SAGE | SAGE Publications | ✅ |
| Volume/issue/pages | 59(6), 1730–1773 | 59, 6, 1730-1773 | ✅ |
| Issued | 2022 | 2022-05-16 | ✅ |
| Authors | Gentry, Whiting, Gray | Marcia Gentry; Gilman Whiting; Anne M. Gray | ✅ |
| Type | journal article | journal-article | ✅ |

**2. `10.25394/pgs.12543710.v1`** — **not in Crossref** (returns no record). It is a **DataCite** DOI, so I
checked `https://api.datacite.org/dois/10.25394/pgs.12543710.v1`.

| Field | As cited here | As returned by DataCite | Match |
| --- | --- | --- | --- |
| Title | Still Underrepresented: Minoritized Students With Gifts And Talents | identical | ✅ |
| Publisher | Purdue University Graduate School | Purdue University Graduate School | ✅ |
| Year | 2020 | 2020 | ✅ |
| Type | dissertation | Dissertation Thesis | ✅ |
| Creator | Gray, A. | Gray, Anne M | ✅ |
| Landing page | — | hammer.purdue.edu/articles/thesis/…/12543710/1 | ✅ |

**No other DOIs are cited anywhere in this document.** Where I could not obtain a verified DOI for a source,
I cited it by URL and labeled its tier instead of manufacturing an identifier.

### Every URL, HTTP-checked

All 40 distinct URLs in this document were checked. Exact tally from the sweep: **35 returned HTTP 200 on
the first request**, 3 returned 403, 1 returned 202, and 1 returned a connection error. Every one of the
five non-200 results is accounted for below, and **only one is a genuine retrieval failure.**

The 35 clean 200s cover: all four NCES Digest tables and the Digest 2023 table index; all four NCES PSS
school records; the NCES CCD record; the CRDC 2020-21 API endpoint and both 2015-16 CRDC file downloads;
the CRDC estimations landing page; both ed.gov OCR documents; the Census CES working paper; both NAGC State
of the States reports; the NYC Mayor's Office release; the Nevada Legislature report; the Davidson Reno,
Davidson Online and Stanford OHS school profiles; both Duke Today articles; both `tip.duke.edu` redirects;
the Chalkbeat and ABC11 articles; the AdvancED Equity brief; mirman.org; roeper.org; the JBHE article; and
archive.tipwiki.net.

| URL | Status | What it means |
| --- | --- | --- |
| `eric.ed.gov/?id=EJ694780` | connection error, then **200 on retry** | Transient. On retry I confirmed the page contains the quoted string "80,000 students each year." Resolved. |
| `bbk12e1-cdn.myschoolcdn.com/ftpimages/27/misc/misc_238607.pdf` | 403 on HEAD, **200 on GET** | The CDN rejects HEAD but serves the file. I downloaded the 137,569-byte PDF and read all of it. Resolved. |
| `doi.org/10.25394/pgs.12543710.v1` | 202 | Figshare's accepted-and-redirecting response. The DOI resolves and DataCite confirms every field. Resolved. |
| `doi.org/10.1177/00420859221095000` | 403 at the SAGE endpoint | Standard SAGE Cloudflare block on command-line requests, not a dead DOI. Crossref confirms every field. Resolved. |
| `cty.jhu.edu/…/cty-celebrates-top-students-academic-excellence` | **403** | Cloudflare bot-blocking. **This is the one genuine retrieval failure in the document.** I could not fetch the page and read its text through search-engine extraction of the live page instead. **Flagged as item 9 below.** |

### Government data — table and page references confirmed

Every federal figure in this document is tied to a named table, worksheet, or record, and I opened each one:

| Source | What I confirmed |
| --- | --- |
| NCES Digest 2023 Table 204.90 | Page `<title>` matches the cited table title exactly; US row and all 52 jurisdiction rows parsed; SOURCE and NOTE lines quoted verbatim |
| NCES Digest 2022 Table 204.80 | Page `<title>` matches; US row parsed; sex split and race split each sum exactly to the published total 3,329,540 |
| NCES Digest 2023 table index | Confirmed by retrieval that the 204.x series contains **no** 204.80 in Digest 2023; `dt23_204.80.asp` returns HTTP 404 |
| NCES Digest 2024 Table 203.10 | Page `<title>` matches; fall 2023 row parsed grade by grade; my K-8 sum cross-checks against the published PK-8 total to within one thousand |
| NCES Digest 2023 Table 205.20 | Page `<title>` matches; "Kindergarten through grade 8" panel, 2021 row read directly with its standard error |
| CRDC 2020-21 PUF, gifted table | Workbook downloaded (39,852 bytes); title cell B2, the NOTE row containing 2,955,610, the 98.62% coverage note, and the SOURCE line all quoted verbatim from the file |
| CRDC 2020-21 PUF, enrollment table | Workbook downloaded (37,276 bytes); title cell B2 and the national row read directly |
| CRDC 2015-16 PUF | Both workbooks downloaded and parsed; 51 jurisdictions matched between the two files |
| NCES PSS records ×4 | Each record retrieved individually; each carries its own line "Source: PSS Private School Universe Survey data for the 2023-24 school year" |
| NCES CCD record (Brooklyn Tech) | Retrieved; page states "School Details (2024-2025 school year)" |
| NAGC 2022-23 State of the States | 4,091,083-byte PDF downloaded, 227 pages, text extracted; every figure number quoted with its report page number and question number |
| Nevada Legislature NRS 388C.120 report | 423,046-byte PDF downloaded and read |

### Internal consistency checks I ran

- 2017-18 gifted: male + female = 1,661,573 + 1,667,967 = 3,329,540 ✅ equals published total.
- 2017-18 gifted: the seven race categories sum to 3,329,540 ✅ equals published total.
- My 52 computed state rates for 2020-21 each round to the value NCES independently prints in Table 204.90 ✅.
- My K-8 sum for fall 2023 (32,331 thousand) vs. published PK-8 total minus PK minus ungraded (32,330
  thousand) ✅ agree to one thousand, i.e. to rounding.
- Gentry's published "276,840 Black students identified in 2015-2016" vs. the CRDC 2015-16 file I downloaded
  myself (276,838) ✅ agree to two students.

---

## What I searched for and could NOT verify

Numbered, as requested.

1. **A national gifted count for the 2021-22 CRDC wave.** The wave exists and was released January 2025. The
   OCR state/national estimation endpoint for it (`survey_Year_Key=11&Report_Id=34`) returns HTTP 200 and a
   valid `.xlsx`, but **the workbook contains only a title cell and no data**. I tested this on both
   `civilrightsdata.ed.gov` and `ocrdata.ed.gov` with the same result. The January 2025 OCR data snapshot
   PDF lists gifted and talented as a topic but publishes no count. **Not obtained.**

2. **Anything at all from the 2023-24 CRDC wave.** `ocrdata.ed.gov/data` lists 2023-24 in its downloads
   table. I could not locate a working file URL for it. **Not obtained.**

3. **NCES's exact denominator for the 6.1% figure in Table 204.90.** Dividing the two published CRDC totals
   gives 6.01%, not 6.1%. I could find no NCES documentation stating what denominator produces 6.1%. I
   offered an arithmetic conjecture in §1.4 and explicitly declined to assert it. **Unresolved.**

4. **The number of children newly identified as gifted per year in the US.** Not published by any source I
   could find, and structurally not collected — the CRDC data element is "number of students *enrolled in*
   gifted & talented programs," a stock. My two inference models in §3.4 disagree by about 35%. **This is an
   estimate, not a figure.**

5. **The modal national grade of gifted identification.** NAGC gives "screening of all second graders" only
   as an illustrative example in a survey question; it does not tabulate which grades the 12 mandatory-
   screening states actually name. NYC uses grade 3 entry screened from grade 2. **No national statistic
   exists.**

6. **How many states have no gifted requirement at all.** The NAGC report publishes the identification
   marginal (35 yes / 15 no, n=50) and the services marginal (25 yes / 23 no, n=48) but not the
   cross-tabulation, and the two items have different denominators. Computing it would require a
   state-by-state read of Appendix Tables 6 and 20. **Not established.**

7. **The claim "more than one-third of children in the U.S. do not attend schools that have gifted education
   programs."** This appears in press coverage of the Purdue/Gentry work (*Journal of Blacks in Higher
   Education*, June 2022, Tier 5). I could not locate the figure in the primary Gentry report text or in the
   *Urban Education* abstract. **Quoted with its source, not treated as verified.**

8. **A like-for-like CTY participation time series.** The 2005 peer-reviewed figure ("approximately 80,000
   students each year") counts talent search plus all academic programs. The 2019-20 and 2021-22 figures
   ("more than 15,000," "nearly 15,300") count talent search testers only. **These are different measures.
   I am not asserting a decline in CTY participation, and no consistent series was found.**

9. **Direct machine retrieval of the February 2023 CTY article.** `cty.jhu.edu` returns HTTP 403 to
   command-line requests. I read its text through search-engine extraction of the live page rather than
   fetching it myself. The two figures I take from it (15,300 talent search participants in 2021-22; 27
   percent qualifying) should be re-checked in a browser before being relied on.

10. **The Duke TIP closure statement on a duke.edu domain.** `tip.duke.edu/message` and
    `tip.duke.edu/updates/suspension-duke-tip-programs-questions-and-answers` both return HTTP 200 but
    redirect to `provost.duke.edu/pre-college-programs/`, which says nothing about TIP or the closure. The
    statement text survives only on `archive.tipwiki.net` (an unofficial community archive) and in a
    third-party repost. **The wording is corroborated by a named Duke communications officer quoted in
    ABC11 and by an Internet Archive capture of tip.duke.edu, but the primary document is not retrievable
    from Duke.**

11. **Duke TIP annual participation for its final years.** The "nearly 100,000 gifted students" figure is
    from a 2016 Duke Today article. I found no year-by-year series and no figure for 2018, 2019, or 2020.
    **The only specific late-period number I could verify is 10,576 students invited to recognition
    ceremonies in spring 2020, which is a subset (benchmark-qualifiers in the 7th-grade search), not total
    participation.**

12. **Any full-time school anywhere serving 10,000 highly gifted children.** I searched and found none. The
    largest dedicated school I located enrolls 1,073 (Stanford OHS, of whom only 44% are full-time). The
    largest US selective-admission public secondary school of any kind enrolls 5,848 (Brooklyn Tech).
    **Absence of evidence here is reasonably strong evidence of absence, given that both PSS and CCD are
    federal censuses that would capture such a school — but I did not run an exhaustive census query, so I
    state it as "found none," not "none exists."**

13. **A definitive reconciliation of the three Mirman School enrollment figures** (375 for 2022-23 per its
    Form 990 narrative, 417 for 2023-24 per federal PSS, 430 currently per its own homepage). These are
    three different years reported by two different reporters. **I did not resolve them; I report the
    federal figure as authoritative for its year.**

14. **Private school K–8 enrollment more recent than fall 2021.** Digest 2024 contains no Table 205.20 or
    205.10 (both return HTTP 404, verified). The K–8 total in §4.3 therefore mixes a fall-2021 private
    figure with a fall-2021 public figure — a matched year, but two years older than the best public data.
    **A fall-2023 private figure was not available.**

15. **The Renzulli Learning "Gifted & Talented Alignment by State" page** claims "According to the NAGC
    State of the States 2022–23 report, 32 states have some form of G&T mandate" and enumerates 33 full
    mandates, 10 partial, and 8 with none. **These numbers do not match the NAGC report I read** (35 require
    identification, 25 mandate services). It is a vendor marketing page. **I excluded it entirely and did
    not use any figure from it.**

16. **Which specific US districts eliminated universal screening or gifted programs outright.** The
    best-known case, New York City, turned out to be a reversal rather than an elimination (§6.4), and I
    corrected the record accordingly. I did not find a documented case of a large district permanently
    eliminating gifted programming, and I did not search district-by-district. **Not established beyond the
    NYC case.**
