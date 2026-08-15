# DOK 1 — Population Arithmetic: How Large Is the Qualifying Population?

**Research question.** A private school for highly able children states a goal of enrolling 100,000 students who
reach advanced coursework by age 14, admitting at the 95th percentile or above on a cognitive abilities test.
How large is the qualifying population, so that 100,000 can be expressed as a share of it?

Fact extraction only. No interpretation, no editorializing. Every number and every quoted phrase below was read
out of the source named beside it. Exact quotes are in quotation marks. Anything I could not verify is flagged
inline **and** listed again in the final section.

**STATUS: COMPLETE.** All seven questions answered. Verification log and the list of things I could not verify
are at the end.

**Headline denominators, for reference:**

| Figure | Value | Basis |
| --- | --- | --- |
| Public K–8 enrollment, fall 2024 | 32,232,000 | [MY COMPUTATION] sum of published grade columns, Digest 2025 Table 203.10 |
| Private K–8 enrollment, 2023–24 | 3,514,725 | [MY COMPUTATION] sum of published grade columns, PSS 2023–24 Table C-6 |
| **Combined K–8 denominator** | **35,746,725** | [MY COMPUTATION] sum of the two above (different reference years) |
| **K–8 children at or above the 95th percentile** | **1,787,336** | [MY COMPUTATION] 5% of the combined denominator |
| **100,000 as a share of that band** | **5.59%** | [MY COMPUTATION] |

---

## Citation verification method

Every DOI cited in this document was resolved against the Crossref REST API
(`https://api.crossref.org/works/<DOI>`) and the returned title, container-title and issued year were compared
against the citation as written. DOIs that did not match were discarded, not "fixed." Every government data URL
was fetched and confirmed to return the document, and the exact table number or page is named at the fact.

Verification log is at the end of this document.

## Source tier labels

- **TIER 1 — US federal statistical / administrative data.** NCES (Digest of Education Statistics, Common Core
  of Data, Private School Universe Survey), CDC/NCHS (National Vital Statistics System), US Census Bureau, US
  Department of Education Office for Civil Rights (CRDC). Censuses or federally mandated collections.
- **TIER 1b — US state or district administrative data.** A state education department or school district
  reporting its own enrollment through a mandated collection (e.g. the NYC DOE Demographic Snapshot, NYSED
  SIRS). Same collection discipline as Tier 1 but narrower coverage and no federal editorial review.
- **TIER 2 — Multilateral statistical agency.** UNESCO Institute for Statistics, World Bank, OECD, UN
  Population Division. Compiled from national reporting; comparability caveats noted at the fact.
- **TIER 3 — Peer-reviewed research.** Journal articles with DOIs, resolved against Crossref.
- **TIER 4 — Government agency (non-US) / official national statistics.** A national ministry of education
  reporting its own enrollment.
- **TIER 5 — Commercial market research.** ISC Research and similar. Proprietary methodology, not auditable.
- **TIER 6 — Institutional self-report / press.** A school or association reporting its own numbers; news
  articles. Used only where no better source exists.

## Computation labeling

Any number I calculated is written in a row or line beginning **[MY COMPUTATION]** and shows the arithmetic.
Published figures carry no such tag and name their source table.

---

## Question 1 — The US denominator, precisely (NCES Digest of Education Statistics)

### 1a. Public school enrollment, prekindergarten through grade 12

**TIER 1.** NCES, *Digest of Education Statistics 2025*, **Table 203.10**, "Enrollment in public elementary and
secondary schools, by level and grade: Selected years, fall 1980 through fall 2024." Most recent year in the
table is **fall 2024**. Table states it "was prepared March 2026."
URL: https://nces.ed.gov/programs/digest/d25/tables/dt25_203.10.asp — fetched, HTTP 200, title matches.
Figures are in thousands in the source; I have written them out in full below.

| Level, fall 2024 | Enrollment |
| --- | --- |
| All grades (prekindergarten through grade 12) | **49,387,000** |
| Prekindergarten through grade 8, total | **33,871,000** |
| Prekindergarten | 1,601,000 |
| Grades 9 through 12, total | 15,516,000 |
| Ungraded (prorated into PK–8) | 38,000 |

Source note verbatim: "SOURCE: U.S. Department of Education, National Center for Education Statistics, Statistics
of Public Elementary and Secondary School Systems, 1980–81; Common Core of Data (CCD), 'State Nonfiscal Survey
of Public Elementary/Secondary Education,' selected years, 1985–86 through 2024–25."

Footnote 1 verbatim: "Includes ungraded students as well as students whose grade was not specified. These
students were prorated into either the prekindergarten through grade 8 level or the grades 9 through 12 level
based on the known grade-level distribution of a state." Footnotes 3 and 4 on the 2024 row read "Includes
imputations for nonreported prekindergarten enrollment in California" and "…in Oregon."

### 1b. Public school enrollment, kindergarten through grade 8 specifically

**NCES does not publish a K–8 total in Table 203.10.** The published aggregate is "prekindergarten through grade
8." The grade-by-grade columns are published, so K–8 is obtained by summing them. Grade columns, fall 2024,
Table 203.10 (published):

| Grade, fall 2024 | Public enrollment |
| --- | --- |
| Kindergarten | 3,479,000 |
| 1st grade | 3,417,000 |
| 2nd grade | 3,513,000 |
| 3rd grade | **3,655,000** |
| 4th grade | 3,563,000 |
| 5th grade | 3,625,000 |
| 6th grade | 3,621,000 |
| 7th grade | 3,654,000 |
| 8th grade | 3,705,000 |

**[MY COMPUTATION]** Public K–8, fall 2024 = sum of the nine published grade columns above =
**32,232,000**.

**[MY COMPUTATION — internal consistency check]** 32,232,000 + 1,601,000 (prekindergarten) + 38,000 (ungraded)
= 33,871,000, which reproduces the published "prekindergarten through grade 8" total exactly. The K–8 sum is
therefore consistent with the published aggregate and is not a residual estimate.

### 1c. Private school enrollment, kindergarten through grade 8

**TIER 1.** NCES, *Characteristics of Private Schools in the United States: Results From the 2023–24 Private
School Universe Survey*, First Look report **NCES 2026-015**, publication date **May 2026**. Reference year
**school year 2023–24** — the most recent PSS collection (PSS is biennial).
URL: https://nces.ed.gov/use-work/resource-library/report/first-look-ed-tab/characteristics-private-schools-united-states-results-2023-24-private-school-universe-survey
— fetched, HTTP 200, title and publication number match.

Headline finding, verbatim from the report's bullet list (**Table C-1**): "In 2023–24, there were 30,553 private
elementary and secondary schools with 5,096,365 students and 517,780 private school full-time-equivalent (FTE)
teachers in the United States (table C-1)."

**Table C-6**, "Number and percentage distribution of private school students, by grade and private school
typology: United States, school year 2023–24" (published):

| Grade, 2023–24 | Private enrollment |
| --- | --- |
| Kindergarten¹ | 472,558 |
| First grade | 388,754 |
| Second grade | 388,286 |
| Third grade | **376,540** |
| Fourth grade | 369,774 |
| Fifth grade | 367,829 |
| Sixth grade | 382,998 |
| Seventh grade | 385,147 |
| Eighth grade | 382,839 |
| Ninth grade | 403,620 |
| Tenth grade | 386,827 |
| Eleventh grade | 375,231 |
| Twelfth grade | 361,275 |
| Ungraded | 54,687 |

¹ Table C-6 footnote verbatim: "The count for kindergarten students also includes transitional kindergarten and
transitional first grade students."

**[MY COMPUTATION]** Private K–8, 2023–24 = sum of the nine published K-through-8 columns =
**3,514,725**.

**[MY COMPUTATION — internal consistency check]** The K–12 columns plus ungraded sum to exactly 5,096,365, the
published total. This means the 2023–24 PSS total of 5,096,365 **excludes prekindergarten**. Confirmed against
the PSS target-population definition, quoted verbatim from the report: "The target population for the PSS is
all schools in the 50 states and the District of Columbia that are not supported primarily by public funds,
provide classroom instruction for one or more of grades kindergarten through 12 (or comparable ungraded levels),
and have one or more teachers." This differs from the older Digest private-school tables, which do include
prekindergarten in their totals — see the next item.

### 1d. Private K–8, the most recent *published* (not computed) K–8 figure

**TIER 1.** NCES, *Digest of Education Statistics 2023*, **Table 205.20**, "Enrollment and percentage
distribution of students enrolled in private elementary and secondary schools, by school orientation and grade
level: Selected years, fall 2009 through fall 2021." Table states it "was prepared June 2023."
URL: https://nces.ed.gov/programs/digest/d23/tables/dt23_205.20.asp — fetched, HTTP 200, title matches.

This table publishes an explicit "Kindergarten through grade 8" row. Fall 2021 (most recent in table):

| Fall 2021, private schools | Enrollment (standard error) |
| --- | --- |
| Total, all grades (includes prekindergarten) | 5,473,540 (16,721) |
| Prekindergarten | 742,240 (4,971) |
| **Kindergarten through grade 8** | **3,329,190 (11,595)** |
| Grades 9 through 12 | 1,402,110 (3,567) |

So the published private K–8 figure is 3,329,190 for fall 2021, and my computed figure from the newer PSS is
3,514,725 for 2023–24. Both are reported here; the 2023–24 figure is the more recent and is the one used in the
arithmetic below.

**TIER 1.** NCES, *Digest of Education Statistics 2023*, **Table 205.10**, "Private elementary and secondary
school enrollment and private enrollment as a percentage of total enrollment in public and private schools, by
region and grade level: Selected years, fall 1995 through fall 2021." Prepared July 2023.
URL: https://nces.ed.gov/programs/digest/d23/tables/dt23_205.10.asp — fetched, HTTP 200, title matches.
Fall 2021: private **prekindergarten through grade 8** enrollment = 4,071,000 (SE 13,700), which was
**10.8 percent** (SE 0.03) of total public-plus-private PK–8 enrollment. Private enrollment across all grades
was 5,474,000, or 10.0 percent of total enrollment.

### 1e. The combined K–8 denominator

**[MY COMPUTATION]** Public K–8 (fall 2024, Table 203.10) 32,232,000 + private K–8 (2023–24, PSS Table C-6)
3,514,725 = **35,746,725**.

Caveat stated plainly: the two components are from **different reference years** (fall 2024 public, school year
2023–24 private) because the CCD is annual and the PSS is biennial. There is no single federal table that
reports a combined public-plus-private K–8 total for one common year more recent than fall 2021. Neither figure
includes home-schooled children.

### 1f. A single typical grade cohort — grade 3

| Grade 3 | Enrollment | Source |
| --- | --- | --- |
| Public, fall 2024 | 3,655,000 | Digest 2025 Table 203.10 |
| Private, 2023–24 | 376,540 | PSS 2023–24 Table C-6 |
| **[MY COMPUTATION]** Public + private | **4,031,540** | sum of the two above |

Note on grade-to-grade variation: in fall 2024 the public grade cohorts range from 3,417,000 (1st grade) to
3,705,000 (8th grade), a spread of about 8 percent, so "a typical grade cohort" is roughly 3.4–3.7 million in
public schools and roughly 3.8–4.1 million including private schools.

---

## Question 2 — Size of each ability band in the US

**Everything in this section is [MY COMPUTATION].** It is arithmetic applied to the published enrollment
figures in Question 1. It is not a published statistic, and no federal source publishes counts of children by
ability percentile.

**Method, stated explicitly.** A percentile is by construction a share of the reference population: by
definition 5 percent of a norm group scores at or above the 95th percentile, 1 percent at or above the 99th,
and 0.1 percent at or above the 99.9th. I multiply the K–8 enrollment denominator by those shares. This
assumes the enrolled K–8 population is the norm group, which is an assumption, not a finding — see the
limitations note below.

### 2a. Using the combined public + private K–8 denominator of 35,746,725

| Band | Share of cohort | **[MY COMPUTATION]** number of K–8 children | 100,000 as a share of that band |
| --- | --- | --- | --- |
| At or above 95th percentile | 5% | **1,787,336** | **5.59%** |
| At or above 99th percentile | 1% | **357,467** | **27.97%** |
| At or above 99.9th percentile | 0.1% | **35,747** | 100,000 exceeds the entire band (279.8% of it) |

### 2b. Using the public-only K–8 denominator of 32,232,000

| Band | Share of cohort | **[MY COMPUTATION]** number of K–8 children | 100,000 as a share of that band |
| --- | --- | --- | --- |
| At or above 95th percentile | 5% | **1,611,600** | **6.21%** |
| At or above 99th percentile | 1% | **322,320** | **31.03%** |
| At or above 99.9th percentile | 0.1% | **32,232** | 100,000 exceeds the entire band (310.3% of it) |

### 2c. Per single grade cohort (grade 3, public + private, 4,031,540)

| Band | **[MY COMPUTATION]** number of grade-3 children |
| --- | --- |
| At or above 95th percentile | **201,577** |
| At or above 99th percentile | **40,315** |
| At or above 99.9th percentile | **4,032** |

### 2d. Stated limitations of this arithmetic

1. A cognitive test's percentile ranks are defined against that test's **norm sample**, not against enrolled
   K–8 children. The two coincide only if the norm sample is representative of the enrolled population.
2. K–8 enrollment excludes home-schooled children entirely; no federal enrollment table counts them.
3. The two components of the denominator are from different reference years (see 1e).
4. Percentile shares are exact by definition and carry no sampling error; the **denominators** carry the error
   of their source collections (CCD is a universe collection; PSS is a universe survey with nonresponse and
   publishes standard errors, reproduced in 1d).

---

## Question 3 — Birth cohort size (CDC/NCHS) and single-age-year population

### 3a. US annual births, most recent final year

**TIER 1.** Osterman MJK, Hamilton BE, Martin JA, Driscoll AK, Valenzuela CP. *Births: Final Data for 2024*.
National Vital Statistics Reports, **Vol. 75, No. 2**, National Center for Health Statistics, published
**June 9, 2026**. URL: https://www.cdc.gov/nchs/data/nvsr/nvsr75/nvsr75-02.pdf — fetched, HTTP 200, 48-page PDF,
title and volume/number confirmed on the page header.

Verbatim from the Abstract, Results: "A total of **3,628,934** births occurred in the United States in 2024, an
increase of 1% from the record low reported for 2023."

Verbatim from Methods: "Data shown in this report are based on 100% of the birth certificates registered in all
states and the District of Columbia (D.C.) to U.S. residents. More than 99% of births occurring in the United
States are registered."

Prior year for comparison, from NCHS Data Brief No. 535, *Births in the United States, 2024* (DOI
10.15620/cdc/174613): "In 2024, 3,628,934 births were registered in the United States, an increase of 1% from
2023 (**3,596,017**) (Figure 1, Table 1)."

**[MY COMPUTATION]** Ability bands within one annual US birth cohort of 3,628,934:
at or above the 95th percentile, **181,447**; at or above the 99th, **36,289**; at or above the 99.9th,
**3,629**.

### 3b. Children in a single age year

**TIER 1.** US Census Bureau, Population Estimates Program, **Vintage 2025 national population estimates by
single year of age and sex** (resident population). File
`nc-est2025-agesex-res.csv`, URL:
https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/national/asrh/nc-est2025-agesex-res.csv
— fetched, HTTP 200, header row confirms columns `SEX,AGE,ESTIMATESBASE2020,POPESTIMATE2020 … POPESTIMATE2025`.
Rows below are `SEX=0` (both sexes), estimates as of July 1.

| Age | Population, July 1 2025 | Population, July 1 2024 |
| --- | --- | --- |
| 5 | 3,833,003 | 3,866,199 |
| 6 | 3,887,513 | 3,938,295 |
| 7 | 3,958,385 | 3,994,511 |
| 8 (typical grade 3) | **4,013,109** | 4,077,472 |
| 9 | 4,095,711 | 4,102,138 |
| 10 | 4,119,512 | 4,086,091 |
| 11 | 4,102,351 | 4,091,663 |
| 12 | 4,106,943 | 4,101,411 |
| 13 | 4,116,277 | 4,159,743 |
| 14 (the age in the stated goal) | **4,175,022** | 4,253,364 |
| All ages (total US resident population) | 341,784,857 | — |

**[MY COMPUTATION]** Sum of ages 5 through 13 (the approximate K–8 age band), July 1 2025 = **36,232,804**.
Sum of ages 6 through 14, July 1 2025 = **32,399,801**.

Note on why single-age counts exceed births: the birth cohorts now aged 8–14 were born in years with higher
birth counts than 2024, and the resident population at a given age also includes net international migration.
The two series are not directly comparable and I have not netted them.

---

## Question 4 — How many US children are currently identified as gifted (CRDC)

Framing that the sources themselves require: the CRDC counts **students whom schools report as enrolled in
gifted and talented programs**. It is a count of school-reported program participation, not a count of children
who would qualify on any test. The CRDC form's own instruction, quoted verbatim from the *2021–22 CRDC School
Form*, item PENR-2: "For the Fall 2021 snapshot date, enter the number of students in preschool and in grades
K-12 (or the ungraded equivalent) who were enrolled in gifted and talented programs." The definition of the
program, verbatim from the same form: "Gifted and talented programs are programs during regular school hours
that provide special educational opportunities including accelerated promotion through grades and classes and
an enriched curriculum for students who give evidence of high achievement capability in areas such as
intellectual, creative, artistic, or leadership capacity, or in specific academic fields." The form also
instructs that "Gifted and talented programs do not include the Advanced Placement (AP) program" or the IB
programme.

### 4a. The most recent published federal *count*

**TIER 1.** NCES, *Digest of Education Statistics 2022*, **Table 204.80**, "Number of public school students
enrolled in gifted and talented programs, by sex, race/ethnicity, and state: Selected years, 2004 through
2017–18." Table states it "was prepared March 2022."
URL: https://nces.ed.gov/programs/digest/d22/tables/dt22_204.80.asp — fetched, HTTP 200, title matches.
Requesting the "current" version of this table (`?current=yes`) returns this same 2022 edition, so **2017–18 is
the most recent year for which NCES publishes a national gifted headcount.**

| Year (CRDC collection) | US total students enrolled in gifted and talented programs |
| --- | --- |
| 2004 | 3,202,760 (SE 24,248) |
| 2006 | 3,236,990 (SE 21,177) |
| 2011–12 | 3,189,757 |
| 2013–14 | 3,329,544 |
| **2017–18** | **3,329,540** |

2017–18 disaggregation from the same row: male 1,661,573; female 1,667,967. By race/ethnicity: White
1,944,410; Black 273,280; Hispanic 610,225; Asian 329,947; Pacific Islander 7,163; American Indian/Alaska
Native 24,760; two or more races 139,755. **[MY COMPUTATION — check]** Both the sex split and the
race/ethnicity split each sum to exactly 3,329,540.

Table note verbatim: "Detail may not sum to totals because of rounding and because of privacy protection
routines applied to universe data."

### 4b. The most recent published federal *share of enrollment*

**TIER 1.** NCES, *Digest of Education Statistics 2023*, **Table 204.90**, "Percentage of public school students
enrolled in gifted and talented programs, by sex, race/ethnicity, and state or jurisdiction: Selected school
years, 2004 through 2020-21." Table states it "was prepared February 2024."
URL: https://nces.ed.gov/programs/digest/d23/tables/dt23_204.90.asp — fetched, HTTP 200, title matches. I also
downloaded the underlying spreadsheet (`.../d23/tables/xls/tabn204.90.xlsx`, HTTP 200) to read the unrounded
values, because the on-page rounding made the column alignment ambiguous.

US row, unrounded values from the spreadsheet, rounded as the table displays them:

| Year | US percentage of public school students in gifted and talented programs |
| --- | --- |
| 2004 | 6.7 (6.6530) |
| 2006 | 6.7 (6.6745) |
| 2011–12 | 6.4 (6.4302) |
| 2013–14 | 6.7 (6.6701) |
| 2017–18 | 6.6 (6.5835) |
| **2020–21** | **6.1 (6.1231)** |

2020–21 disaggregation, same row: male 6.0 (5.9997); female 6.3 (6.2533); American Indian/Alaska Native 4.4
(4.4414); Asian 12.4 (12.3552); Black 3.4 (3.4082); Hispanic 4.3 (4.3250); Pacific Islander 3.7 (3.7096);
White 7.7 (7.6981); two or more races 6.7 (6.6711).

Table note verbatim: "Data for 2011-12 through 2020-21 are based on universe counts of schools and school
districts; therefore, these figures do not have standard errors."

**[MY COMPUTATION]** Applying the published 2020–21 rate of 6.1231 percent to fall 2020 public
prekindergarten-through-grade-12 enrollment of 49,375,000 (Digest 2025 Table 203.10) gives approximately
**3,023,000** students. This is an implied figure, not a published count, and the CRDC's own enrollment
denominator differs slightly from the CCD's (the CRDC includes Puerto Rico; the CCD table does not).

### 4c. What I could not obtain

The **2021–22 CRDC** is the most recent released collection (released January 2025; "the 2021-22 CRDC includes
data from more than 17,000 school districts and 97,000 schools nationwide," per the OCR *2021-22 Civil Rights
Data Collection Data Snapshot*, January 2025). **No federal summary table publishes a national gifted headcount
for 2021–22**, the OCR *A First Look* report for 2021–22 does not report one, and NCES dropped Table 204.80
after the 2022 Digest. I attempted to download the public-use file to compute the total myself; the download URL
on the CRDC site returns the site's application shell rather than the archive, so I could not. Logged in the
final section.

---

## Question 5 — International scope

### 5a. School-age children worldwide

**TIER 2.** UNESCO Institute for Statistics (UIS), retrieved from the UIS public API
(`https://api.uis.unesco.org/api/public/data/indicators`), data version `20260507-91260335`, published
2026-05-08, education theme last updated February 2026 ("February 2026 Data Release"). Geographic unit
`UIS: World`. Indicator codes and their official UIS names:

| UIS indicator | Name as published by UIS | 2024 value |
| --- | --- | --- |
| SAP.1 | School age population, primary education, both sexes (number) | **764,350,528** |
| SAP.2 | School age population, lower secondary education, both sexes (number) | **430,529,056** |
| SAP.3 | School age population, upper secondary education, both sexes (number) | 412,759,968 |
| SAP.2T3 | School age population, secondary education, both sexes (number) | 843,289,024 |

**[MY COMPUTATION]** Primary + lower secondary school-age population worldwide, 2024 = 764,350,528 +
430,529,056 = **1,194,879,584**, i.e. roughly **1.19 billion** children. This band (primary plus lower
secondary) is the closest international analogue to US K–8.

Precision caveat, stated because it matters: the API returns these as single-precision floating point values,
so the last two or three digits are an artifact of storage, not measured precision. These figures should be
read as "approximately 764.4 million" and "approximately 430.5 million." Comparability caveat: each country's
"primary" and "lower secondary" age ranges are set by that country's own system, so the global aggregate spans
different age bands in different countries.

**TIER 2 — cross-check from a second multilateral source.** World Bank Open Data API
(`https://api.worldbank.org/v2/country/WLD/indicator/...`), `lastupdated` 2026-07-13:

| World Bank indicator | 2024 value | 2025 value |
| --- | --- | --- |
| SP.POP.0014.TO — Population ages 0-14, total | 2,012,895,582 | 2,005,307,782 |
| SE.PRM.ENRL — Primary education, pupils | ~780,852,608 | not yet reported |
| SE.SEC.ENRL — Secondary education, pupils | ~651,678,720 | not yet reported |

The World Bank enrollment series is itself sourced from UIS. The 0-14 figure spans fifteen single-year cohorts
and is therefore **not** the same thing as school-age population; I report it as published and do not rescale
it.

### 5b. School-age children in English-medium countries

**No multilateral statistical agency publishes an "Anglophone" or "English-medium" country aggregate.** The
country groupings available in the UIS API are geographic (SDG regions, UIS regions) and economic (World Bank
income groups). The two groupings below are **my own country selections**, stated explicitly so they can be
challenged, with per-country UIS figures that are individually published.

**Group A — six countries where English is the dominant national language of instruction.** UIS SAP.1 +
SAP.2, 2024:

| Country | Primary school-age | Lower secondary school-age | Sum |
| --- | --- | --- | --- |
| United States | 24,704,792 | 12,957,314 | 37,662,106 |
| United Kingdom | 4,783,517 | 2,531,683 | 7,315,200 |
| Canada | 2,610,939 | 1,330,840 | 3,941,779 |
| Australia | 2,279,196 | 1,339,461 | 3,618,657 |
| New Zealand | 396,110 | 281,170 | 677,280 |
| Ireland | 562,836 | 231,378 | 794,214 |
| **[MY COMPUTATION] Group A total** | | | **54,009,236** |

**Group B — thirteen additional countries where English is an official language and is widely used as a medium
of instruction.** This selection is mine; the countries are India, Nigeria, Philippines, Pakistan, Kenya,
Ghana, South Africa, Singapore, Malaysia, Uganda, Tanzania, Zambia, Zimbabwe. UIS SAP.1 + SAP.2, 2024:

| Country | Primary school-age | Lower secondary school-age | Sum |
| --- | --- | --- | --- |
| India | 114,808,872 | 72,151,520 | 186,960,392 |
| Nigeria | 37,563,564 | 17,347,944 | 54,911,508 |
| Pakistan | 30,308,612 | 18,045,132 | 48,353,744 |
| Philippines | 13,890,273 | 9,405,514 | 23,295,787 |
| Tanzania | 12,289,516 | 6,112,445 | 18,401,961 |
| Uganda | 9,569,962 | 4,895,695 | 14,465,657 |
| Kenya | 8,163,819 | 2,769,630 | 10,933,449 |
| South Africa | 7,343,350 | 2,176,283 | 9,519,633 |
| Ghana | 4,936,390 | 2,280,018 | 7,216,408 |
| Malaysia | 3,381,256 | 1,650,665 | 5,031,921 |
| Zambia | 3,884,870 | 1,021,053 | 4,905,923 |
| Zimbabwe | 3,157,528 | 864,223 | 4,021,751 |
| Singapore | 269,108 | 87,389 | 356,497 |
| **[MY COMPUTATION] Group B total** | | | **388,374,631** |

**[MY COMPUTATION] Group A + Group B = 442,383,867.**

**[MY COMPUTATION] Ability bands within these groupings** (5% / 1% / 0.1% of the primary-plus-lower-secondary
school-age population):

| Population | At/above 95th pct | At/above 99th pct | At/above 99.9th pct |
| --- | --- | --- | --- |
| World, 1,194,879,584 | 59,743,979 | 11,948,796 | 1,194,880 |
| Group A (core Anglophone), 54,009,236 | 2,700,462 | 540,092 | 54,009 |
| Group A + B, 442,383,867 | 22,119,193 | 4,423,839 | 442,384 |

### 5c. The international / English-medium private school market

**TIER 5 — COMMERCIAL MARKET RESEARCH. ISC Research is a private company selling market intelligence; its
underlying school-by-school database is proprietary and its methodology is not independently auditable.
Labeled accordingly.**

ISC Research, *Global International Schools Snapshot 2026*, a white paper published February 2026. Figures as
displayed on ISC Research's own report page
(https://iscresearch.com/reports/global-international-schools-snapshot-2026/ — fetched, HTTP 200):

- "15,000+" international schools
- "7.7 million" students
- "730k" staff
- "$69bn USD" in annual fee income

Trade-press coverage of the same white paper reports the unrounded school count and fee income: 15,075
international schools, US$69.3 billion in annual fee income, 7.7 million students, 730,000 staff, described as
a "+2% year-on-year increase in 2026," with Asia accounting for 58 percent of schools. Those unrounded figures
come from coverage rather than from ISC's own public page, and are flagged as such.

ISC Research's own earlier public page, *The International Schools Market in 2025*
(https://iscresearch.com/the-international-schools-market-in-2025/), states: "ISC Research now records 14,833
K-12 international schools" and "The world's international schools are serving a total of 7.4 million students
worldwide," with "$67.3 billion USD in total annual fee income" as of January 2025.

**[MY COMPUTATION]** 100,000 students would be **1.30 percent** of the 7.7 million students ISC Research
counts in the entire global English-medium international school sector (100,000 ÷ 7,700,000).

**[MY COMPUTATION]** 7.7 million students across 15,075 schools is an average of **511 students per school**.
A single institution of 100,000 would be roughly **196 times** the average international school.

---

## Question 6 — Precedent for selective programs at six figures

### The direct answer to the question as asked

**Yes — academically selective systems above 100,000 students exist, but every one I could verify is a
government school system spanning hundreds of separate campuses, not a single school or a single private
institution.** Two verified cases clear 100,000 today (England's grammar schools; India's Jawahar Navodaya
Vidyalayas) and one cleared 100,000 and has since fallen below it (South Korea's national gifted education
system). The largest single school of any kind on earth, selective or not, is 61,345 pupils.

### 6a. England's grammar schools — 193,747 pupils, admission by examination

**TIER 4 — official national statistics (accredited official statistics).** UK Department for Education,
*Schools, pupils and their characteristics*, data set "School characteristics by age, sex and attendance
pattern," latest version 1.0 published **2026-06-04**, time period **2025/26** (the January 2026 school
census). Retrieved via the DfE Explore Education Statistics public API
(`https://api.education.gov.uk/statistics/v1/data-sets/019e7401-bedb-711a-ae3d-836fbca519f3/query`),
publication id `a91d9e05-be82-474c-85ae-4913158406d0`. Query pinned to geographic level National (England),
with every other filter dimension set to its published "Total" option so there is no double counting.

| England, January 2026 (2025/26) | Number of schools | Pupils, all ages |
| --- | --- | --- |
| **State-funded secondary, admissions policy = Selective** | **163** | **193,747** |
| Independent schools, admissions policy = Selective | 376 | 156,491 |
| All school types, admissions policy = Selective | 540 | 350,478 |
| State-funded secondary, admissions policy = Non-selective | 2,875 | 3,139,747 |
| All school types, all admissions policies (total) | 24,499 | 8,920,227 |

The 163 state-funded selective secondary schools are England's grammar schools; the count of 163 matches the
number consistently cited for England's grammar schools, which is a useful external check that the filter is
capturing the right set. Comparison year, same query, 2024/25: all selective schools 522 schools and 349,324
pupils.

**[MY COMPUTATION]** Selective state-funded secondary pupils as a share of all state-funded secondary pupils in
England = 193,747 ÷ (193,747 + 3,139,747) = **5.81 percent**.

**[MY COMPUTATION]** 100,000 students would be **51.6 percent** of the entire English grammar school system's
current enrollment.

Two caveats that matter for using this as a precedent. First, grammar schools are secondary schools, ages
roughly 11–18, not K–8. Second, "163 schools" is 163 separately governed institutions in a national system, not
one organization enrolling 193,747 students.

### 6b. India's Jawahar Navodaya Vidyalayas — roughly 291,000 students, admission by selection test

**TIER 4 — official government of India source.** Press Information Bureau, Ministry of Education, "Cabinet
approves setting up of 28 new Navodaya Vidyalayas in the uncovered districts of the country," dated
**06 DEC 2024**. URL: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2081690 — fetched, HTTP 200, headline
and ministry attribution confirmed on the page.

Verbatim: "The NVs are fully residential, co-educational schools providing good quality modern education from
Class VI to XII to the talented children, predominantly from the rural areas without regard to their family's
socio-economic condition. **Admissions to these schools are done on the basis of a Selection Test. Approx.
49,640 students are admitted in NVs to class VI every year.**"

Verbatim: "As on date, there are **661 sanctioned NVs** across the country [including 2nd NVs in 20 districts
having large concentration of SC/ST population and 3 special NVs]. Out of these, **653 NVs are functional**."

Verbatim on the norm capacity per school: "The administrative structure for implementing the project will
require creation of posts at par with the norms fixed by the Samiti for running of one full fledged NV with a
capacity of 560 students."

Verbatim on composition: "Navodaya Vidyalayas have witnessed increasing enrolment of girls (42%), as well as SC
(24%), ST (20%) and OBC (39%) children."

**[MY COMPUTATION]** 653 functional schools × the Samiti's norm capacity of 560 students = **365,680** places
at full capacity. Separately, 49,640 admitted per year × 7 year-groups (Class VI through XII) = **347,480**
students at steady state with no attrition. Both are implied capacity figures, not reported enrollment.

**Reported enrollment, TIER 4 but at one remove.** UDISE+ (Unified District Information System for Education
Plus, the Ministry of Education's official school statistics system), 2024–25: JNV enrolment reported as
**167,747 boys + 123,517 girls = 291,264** students across 653 JNVs. I read these figures from a data
aggregator (dataful.in) reproducing the Ministry of Education UDISE+ management-type tables, and from a
secondary compilation of UDISE+ national tables, **not** from the UDISE+ report itself, which I could not
retrieve directly. A separate document, *Perspective Academic Planning 2024-25* attributed to Navodaya
Vidyalaya Samiti, states "No of students 289186" and "No of candidates Registered for Class VI admission test
JNVST-2024 250087," but I read it from an unofficial mirror. **Flagged: the ~291,000 enrollment figure is not
directly verified at its official source.** Logged in the final section. The Ministry-verified facts are the
653 functional schools, the selection-test admission mechanism, and the ~49,640 annual Class VI intake.

**[MY COMPUTATION]** If the ~291,000 figure is right, 100,000 students would be **34.3 percent** of the entire
Navodaya system.

### 6c. South Korea's national gifted education system — peaked at 121,421, now 63,167

**TIER 4 — official national statistics.** Republic of Korea, Gifted Education Database (영재교육종합데이터베이스,
"GED"), operated by the Korean Educational Development Institute (KEDI) under the Ministry of Education. Page:
"영재교육 기본현황" (Gifted Education Basic Status), national gifted education statistics.
URL: https://ged.kedi.re.kr/stss/main.do — fetched, HTTP 200, page title confirmed as
"영재교육 기본현황 < 영재교육 국가통계 < 성과 < GED(2)".

| Year | Students in gifted education | National elementary + secondary students | Share |
| --- | --- | --- | --- |
| **2013** | **121,421** | 6,481,492 | 1.87% |
| 2014 | 117,949 | 6,285,792 | 1.88% |
| 2015 | 110,053 | 6,088,827 | 1.81% |
| 2016 | 108,253 | 5,882,790 | 1.84% |
| 2017 | 109,266 | 5,725,260 | 1.91% |
| 2018 | 106,138 | 5,584,249 | 1.90% |
| 2019 | 99,998 | 5,452,805 | 1.83% |
| 2020 | 82,012 | 5,346,874 | 1.53% |
| 2021 | 79,048 | 5,323,075 | 1.49% |
| 2022 | 72,518 | 5,275,054 | 1.37% |
| 2023 | 70,627 | 5,209,029 | 1.36% |
| 2024 | 65,410 | 5,132,180 | 1.27% |
| **2025** | **63,167** | 5,015,310 | **1.26%** |

Number of gifted education institutions in the same series: 3,011 (2013) falling to 1,267 (2025). Gifted
education teaching staff: 26,814 (2013) falling to 16,611 (2025).

**Composition matters here, and it cuts against reading this as a precedent for a full-time school.** From the
GED page "영재교육 대상자" (gifted education participants), 2025 breakdown by institution type:

| Institution type (2025) | Students | Share |
| --- | --- | --- |
| 영재학교·과학고 — gifted schools and science high schools (full-time schools) | **6,895** | 10.9% |
| 영재교육원, 교육청 — office-of-education gifted institutes (part-time/pull-out) | 27,009 | 42.8% |
| 영재교육원, 대학부설 — university-affiliated gifted institutes (part-time) | 11,027 | 17.5% |
| 영재학급 — gifted classes within regular schools (part-time) | 18,245 | 28.9% |
| Total | 63,167 | 100.0% |

So even at its 2013 peak of 121,421, the great majority of Korea's gifted enrollment was part-time pull-out
programming. Only about 6,900 students, roughly 0.14 percent of Korean elementary and secondary enrollment, are
in full-time gifted schools and science high schools, and that number has been essentially flat at 6,800–6,900
since 2017. Korea's admission bar is also far above the 95th percentile: 1.26 percent of the cohort in
2025 corresponds to roughly the 98.7th percentile if participation tracked ability rank.

### 6d. New York City's specialized high schools — 18,281 students across nine schools

**TIER 1b — district administrative data.** New York City Department of Education, *Demographic Snapshot*
(2017-18 through 2021-22), retrieved via NYC Open Data, dataset `c7ru-d68s`
(`https://data.cityofnewyork.us/resource/c7ru-d68s.json`). School year **2021-22** — the most recent year in
this published snapshot series.

| DBN | School | Total enrollment, 2021-22 |
| --- | --- | --- |
| 13K430 | Brooklyn Technical High School | 5,958 |
| 02M475 | Stuyvesant High School | 3,319 |
| 10X445 | The Bronx High School of Science | 2,983 |
| 03M485 | Fiorello H. LaGuardia High School of Music & Art and Performing Arts | 2,372 |
| 31R605 | Staten Island Technical High School | 1,355 |
| 14K449 | Brooklyn Latin School, The | 843 |
| 05M692 | High School for Mathematics, Science and Engineering at CCNY | 524 |
| 28Q687 | Queens High School for the Sciences at York College | 520 |
| 10X696 | High School of American Studies at Lehman College | 407 |
| **[MY COMPUTATION]** All nine specialized high schools | | **18,281** |
| **[MY COMPUTATION]** The eight SHSAT test-in schools (excluding LaGuardia, which admits by audition) | | **15,909** |

The admission mechanism, verbatim from the NYC Public Schools "Specialized High Schools" enrollment page
(https://www.schools.nyc.gov/enrollment/enroll-grade-by-grade/specialized-high-schools): "Eight Specialized
High Schools use the Specialized High Schools Admissions Test (SHSAT) to determine who can attend." And:
"The nine Specialized High Schools are one way that New York City supports the educational needs of students
who excel academically and/or artistically."

Context from the same NYSED source family: NYC Public Schools K-12 enrollment was 946,747 in 2024-25. So the
United States' single largest and best-known exam-admission school system serves fewer than 19,000 students in
a district of nearly a million.

**[MY COMPUTATION]** 100,000 students would be **5.5 times** the combined enrollment of all nine NYC
specialized high schools.

### 6e. The largest single school of any kind, selective or not — 61,345 pupils

**TIER 6 — records body / institutional self-report, but the primary claim is adjudicated by a third party.**
Guinness World Records, record title "Largest school by pupils."
URL: https://www.guinnessworldrecords.com/world-records/largest-school-by-pupils — fetched, HTTP 200.

Verbatim: "The largest school in terms of pupils is the City Montessori School in Lucknow, Uttar Pradesh, India,
which had a total enrolment of **61,345 pupils as of 10 August 2023 across 21 campuses in the city.**"
Record fields as published: Who — City Montessori School; What — 61,345 people; Where — India (Lucknow); When —
10 August 2023.

Also verbatim from the same record entry, which is decisive on selectivity: "The school admits children from the
age of three, who can then follow through their education all the way to senior secondary level." This is an
open-admission school, not an academically selective one.

Historical series from the school's own awards page (institutional self-report): 22,612 pupils (1999); 39,437
(9 August 2010); 55,547 (16 January 2019); 61,345 (10 August 2023). The school currently claims "65,100
students from pre-primary to Grade XII studying across 22 campuses."

**[MY COMPUTATION]** 100,000 students would be **1.63 times** the largest school ever recorded by Guinness
World Records, and it would have to be assembled from a population screened at the 95th percentile rather than
from a whole city's open-entry demand.

### 6f. Summary table of the precedent evidence

| System | Enrollment | Year | Selective? | Single institution? |
| --- | --- | --- | --- | --- |
| India, Jawahar Navodaya Vidyalayas (653 schools) | ~291,264 (not directly verified) | 2024–25 | Yes — Selection Test | No, 653 schools |
| England, grammar schools (163 schools) | 193,747 | Jan 2026 | Yes — 11-plus selection | No, 163 schools |
| South Korea, all gifted education | 121,421 at peak; 63,167 now | 2013; 2025 | Yes | No, 1,267–3,011 institutions |
| South Korea, full-time gifted/science high schools only | 6,895 | 2025 | Yes | No, 28 schools |
| City Montessori School, Lucknow | 61,345 | Aug 2023 | **No** — admits from age 3 | Yes (21 campuses, one school) |
| NYC specialized high schools (9 schools) | 18,281 | 2021–22 | Yes — SHSAT / audition | No, 9 schools |

**Explicit statement of the finding, since the question asked for it:** I found **no single academically
selective school or institution anywhere that has ever enrolled 100,000 students at once.** The systems that
exceed 100,000 are national or state systems of hundreds of separate schools, funded by governments, with
admission run centrally. The largest single school ever recorded at any level of selectivity is 61,345 pupils
and it is explicitly non-selective.

---

## Question 7 — Attrition and yield in selective admissions

### 7a. Yield: what share of admitted students actually enroll

**TIER 6 — association self-report from a member survey.** National Association of Independent Schools (NAIS),
*Facts at a Glance*, "Data Entry Year: 2024-25," comparison group "All NAIS Member Schools." Retrieved as a
7-page PDF from nais.org (HTTP 200); the document's own header reads "2025 Facts at a Glance / Data Entry Year:
2024-25 / Comparison Group: All NAIS Member Schools." Underlying collection is NAIS's DASL (Data and Analysis
for School Leadership) survey of member schools.

| NAIS member schools, 2024-25 | Value |
| --- | --- |
| School Count | 1,331 |
| Total Enrollment | 631,672 |
| Average Enrollment | 475 |
| Median Enrollment | 364 |
| Inquiries (per school) | 385 |
| Completed Applications (per school) | 180 |
| Students Accepted (per school) | 113 |
| Newly Enrolled Students (per school) | 79 |
| Completed Applications to Inquiries Rate | 46.6% |
| Acceptances to Completed Applications Rate | 66.0% |
| **Newly Enrolled to Acceptances Rate (yield)** | **71.4%** |
| Average Student Attrition Rate | 10.18 |
| Median Student Attrition Rate | 8.10 |

Two things to note about how to read that table, both of which I checked rather than assumed. First, the two
attrition figures are percentages; the NAIS report prints them without a percent sign. Second, the four
conversion rates are **not** the ratios of the four counts above them — 180 ÷ 385 is 46.75 percent, 113 ÷ 180 is
62.8 percent and 79 ÷ 113 is 69.9 percent, none of which equals the published 46.6 / 66.0 / 71.4 percent. The
counts are per-school central-tendency values and the rates are computed separately across schools. My
arithmetic below uses the **published rates**, not ratios derived from the counts.

NAIS's own definition of yield, verbatim from the *DASL Core Question Definitions*: "Yield (enrollments as a %
of acceptances) … Calculation: ((Newly enrolled students in 2026-27 ÷ Number of New Students Accepted for
2026-27) x 100)." And of attrition: "Number of students electing not to return to school out of the total
number of students likely to return … Calculation: ((i. Students Electing Not to Return / h. # Possible
Returning Students …) x 100)."

Comparison groups from other association-specific editions of the same NAIS report, which bracket the range:

| NAIS report edition | Yield (newly enrolled ÷ acceptances) | Average attrition | Median attrition |
| --- | --- | --- | --- |
| All NAIS Members, 2024-25 | 71.4% | 10.18 | 8.10 |
| ATLIS, 2025-26 (350 schools, 238,216 students) | 70.2% | 7.10 | 5.95 |
| AISNE, 2025-26 (98 schools, 31,926 students) | 67.7% | 10.05 | 8.00 |
| ACCIS, 2023-24 (387,740 students) | 67.7% | 6.74 | 5.90 |

So published independent-school yield sits in a **67.7 to 71.4 percent** band, and annual attrition in a
**5.9 to 10.2 percent** band depending on whether the average or the median is used and on which member group
is measured.

### 7b. What 100,000 enrolled students implies, as arithmetic

**All of this section is [MY COMPUTATION]**, applying the NAIS All-Members 2024-25 rates above.

To seat 100,000 students in a single intake at a 71.4 percent yield:
100,000 ÷ 0.714 = **140,056 offers of admission**. At the ACCIS/AISNE yield of 67.7 percent:
100,000 ÷ 0.677 = **147,710 offers**.

Working the whole funnel backwards from 100,000 enrolled, using the NAIS All-Members conversion rates
(acceptances ÷ completed applications = 66.0 percent, completed applications ÷ inquiries = 46.6 percent):

| Funnel stage | **[MY COMPUTATION]** count needed for 100,000 enrolled |
| --- | --- |
| Newly enrolled students | 100,000 |
| Offers of admission (÷ 0.714) | 140,056 |
| Completed applications (÷ 0.660) | 212,206 |
| Inquiries (÷ 0.466) | 455,378 |

Cross-check against the qualifying population from Question 2: 212,206 completed applications is **11.9
percent** of the entire US K–8 above-95th-percentile population of 1,787,336, and 455,378 inquiries is
**25.5 percent** of it.

Steady-state replacement from attrition, once 100,000 are enrolled:

| Attrition rate used | **[MY COMPUTATION]** students lost per year | Offers per year to replace them (÷ 0.714) |
| --- | --- | --- |
| 5.90% (ACCIS median) | 5,900 | 8,263 |
| 8.10% (NAIS median) | 8,100 | 11,345 |
| 10.18% (NAIS average) | 10,180 | 14,258 |

**[MY COMPUTATION]** Adding graduation-driven turnover: a K–8 program of 100,000 spread over nine grade levels
averages 11,111 per grade, so roughly 11,111 students exit at the top of the program each year in addition to
attrition, requiring another 15,562 offers per year at a 71.4 percent yield. Combined steady-state
replacement at the 8.10 percent median attrition rate is therefore about **19,211 enrolled students per year**,
requiring about **26,906 offers per year**.

### 7c. What is not available

I found **no published yield figure specific to academically selective private schools** as a distinct
category, and **no published attrition figure specific to K-12 virtual or online private schools** from a
federal or association source. NAIS reports yield and attrition for its member schools as a whole and by
member association, not by selectivity or by instructional modality. Both gaps are logged in the final section.

---

## Verification log

Every URL below was fetched during this work. HTTP status and the identifying detail I checked are recorded.
Where the on-page rendering was ambiguous I went to the machine-readable source (spreadsheet, API, or PDF) and
say so.

### Government statistical tables — fetched and confirmed

| Source | URL | Status | What I confirmed |
| --- | --- | --- | --- |
| NCES Digest 2025, Table 203.10 | `nces.ed.gov/programs/digest/d25/tables/dt25_203.10.asp` | HTTP 200 | Page title reads "…fall 1980 through fall 2024"; fall 2024 row read cell by cell; nine grade columns sum to 32,232 (thousands) and reconcile exactly to the published PK–8 total of 33,871 plus PK 1,601 plus ungraded 38; source line names CCD State Nonfiscal Survey through 2024–25, "prepared March 2026" |
| NCES Digest 2023, Table 205.10 | `nces.ed.gov/programs/digest/d23/tables/dt23_205.10.asp` | HTTP 200 | Title confirms "fall 1995 through fall 2021"; fall 2021 private PK–8 = 4,071 thousand at 10.8% of total; source line names PSS 1995-96 through 2021-22, "prepared July 2023" |
| NCES Digest 2023, Table 205.20 | `nces.ed.gov/programs/digest/d23/tables/dt23_205.20.asp` | HTTP 200 | Title confirms "fall 2009 through fall 2021"; explicit "Kindergarten through grade 8" row, fall 2021 = 3,329,190 (SE 11,595); PK 742,240 + K–8 3,329,190 + 9–12 1,402,110 = 5,473,540 published total; "prepared June 2023" |
| NCES Digest 2022, Table 204.80 | `nces.ed.gov/programs/digest/d22/tables/dt22_204.80.asp` | HTTP 200 | Title confirms "2004 through 2017–18"; US 2017–18 total 3,329,540; sex split and race split each sum to that total; `?current=yes` returns this same edition, confirming it is the most recent version of the table |
| NCES Digest 2023, Table 204.90 | `nces.ed.gov/programs/digest/d23/tables/dt23_204.90.asp` | HTTP 200 | Title confirms "2004 through 2020-21"; **on-page rounding made column alignment ambiguous, so I downloaded the spreadsheet** `d23/tables/xls/tabn204.90.xlsx` (HTTP 200) and read the header rows and the unrounded US values, confirming the 2020-21 total is 6.1231 percent, **not** 6.7 percent as a rounded reading of adjacent columns might suggest; "prepared February 2024" |
| NCES PSS 2023–24 First Look (NCES 2026-015) | `nces.ed.gov/use-work/resource-library/report/first-look-ed-tab/characteristics-private-schools-united-states-results-2023-24-private-school-universe-survey` | HTTP 200 | Publication number NCES 2026-015 and publication date May 2026 confirmed on the record page; Table C-1 bullet and Table C-6 grade columns read from the report text; C-6 K–12 columns plus ungraded sum to exactly 5,096,365, confirming the total excludes prekindergarten |
| CDC/NCHS, *Births: Final Data for 2024* | `cdc.gov/nchs/data/nvsr/nvsr75/nvsr75-02.pdf` | HTTP 200, 48-page PDF | Page header reads "National Vital Statistics Reports, Vol. 75, No. 2, June 9, 2026"; abstract sentence containing 3,628,934 read verbatim from page 1; Methods paragraph read verbatim from page 2 |
| Census Bureau Vintage 2025 population estimates by single year of age | `www2.census.gov/programs-surveys/popest/datasets/2020-2025/national/asrh/nc-est2025-agesex-res.csv` | HTTP 200 | Header row confirms `SEX,AGE,ESTIMATESBASE2020,POPESTIMATE2020…POPESTIMATE2025`; SEX=0 rows for ages 0–18 and AGE=999 read directly from the CSV |
| UK DfE, *Schools, pupils and their characteristics* | `api.education.gov.uk/statistics/v1/data-sets/019e7401-bedb-711a-ae3d-836fbca519f3` | HTTP 200 | Data set title, version 1.0, published 2026-06-04, time periods 2015/16 to 2025/26 confirmed from the API; **first query attempt was wrong** — using `filters: {in: [...]}` returns an OR across filter values and produced 179 schools / 49,820 pupils, which did not match the known 163 grammar schools; re-ran with one `filters: {eq: ...}` clause per dimension and every other dimension pinned to its published "Total" option, which returned 163 schools / 193,747 pupils |
| Government of India, Press Information Bureau (Ministry of Education) | `pib.gov.in/PressReleasePage.aspx?PRID=2081690` | HTTP 200 | Headline, ministry attribution ("Ministry of Education") and date (06 DEC 2024) read from the page; all quoted sentences read verbatim from the page body |
| Republic of Korea, KEDI Gifted Education Database | `ged.kedi.re.kr/stss/main.do` and `ged.kedi.re.kr/stss/statPeople.do` | HTTP 200 both | Page title confirmed as "영재교육 기본현황 < 영재교육 국가통계 < 성과 < GED(2)"; the 2012–2025 series and the 2025 institution-type breakdown read from the rendered tables |
| NYC DOE Demographic Snapshot via NYC Open Data | `data.cityofnewyork.us/resource/c7ru-d68s.json` | HTTP 200 | Queried by DBN for the nine specialized high schools, school year 2021-22; school names returned by the API match the DBNs |
| NYC Public Schools, Specialized High Schools page | `schools.nyc.gov/enrollment/enroll-grade-by-grade/specialized-high-schools` | HTTP 200 | The eight SHSAT schools are listed by name on the page; quoted sentences read verbatim |
| Guinness World Records, "Largest school by pupils" | `guinnessworldrecords.com/world-records/largest-school-by-pupils` | HTTP 200 | Record fields (Who / What / Where / When) and the descriptive paragraph read verbatim |

### Multilateral APIs — queried and confirmed

| Source | Endpoint | What I confirmed |
| --- | --- | --- |
| UNESCO Institute for Statistics | `api.uis.unesco.org/api/public/data/indicators` | Data version `20260507-91260335`, published 2026-05-08, education theme "February 2026 Data Release", confirmed from `/api/public/versions/default`. Indicator names SAP.1/SAP.2/SAP.3/SAP.2T3 confirmed against `/api/public/definitions/indicators`. **`geoUnit=WLD` returns "The geoUnit could not be found"**; the correct world aggregate identifier is `UIS: World`, confirmed against `/api/public/definitions/geounits`. Precision caveat recorded at the fact: values are returned as single-precision floats, so trailing digits are storage artifacts |
| World Bank Open Data | `api.worldbank.org/v2/country/WLD/indicator/{SP.POP.0014.TO, SE.PRM.ENRL, SE.SEC.ENRL}` | `lastupdated: 2026-07-13` returned in the response metadata; same float-precision caveat applies to the enrollment series |

### DOI checked against Crossref

One DOI appears in this document. Checked at `https://api.crossref.org/works/10.15620/cdc/174613`:

| As cited | Crossref returns | Verdict |
| --- | --- | --- |
| NCHS Data Brief No. 535, *Births in the United States, 2024*, DOI 10.15620/cdc/174613 | title "Births in the United States, 2024"; publisher "National Center for Health Statistics (U.S.)"; issued 2025-07-24; type report | **Match.** Also resolves via `doi.org` to `stacks.cdc.gov/view/cdc/174613`, HTTP 200 |

### Reading errors I caught and corrected

Recorded because they are the failure mode this document is meant to guard against.

1. A search-result summary reported the 2020-21 CRDC gifted rate as 6.7 percent. Reading the Digest 2023
   Table 204.90 **spreadsheet** shows 6.7 percent is the 2004, 2006 and 2013-14 figure and also the
   "two or more races" figure for 2020-21. The 2020-21 US total is **6.1** percent (6.1231 unrounded). The
   document uses 6.1.
2. A first DfE API query using an `in` list across filter values returned 179 schools and 49,820 pupils, which
   is not the grammar school population. The `in` operator ORs across dimensions. Corrected to per-dimension
   `eq` clauses with all other dimensions pinned to "Total," which returns 163 schools and 193,747 pupils.
3. The 2023–24 PSS total of 5,096,365 was initially assumed to include prekindergarten, by analogy with the
   older Digest private-school tables. Summing Table C-6's published grade columns showed K–12 plus ungraded
   equals the total exactly, so the 2023–24 PSS total **excludes** prekindergarten. This is a definitional break
   from Digest Tables 205.10 and 205.20, and it is noted at the fact.
4. NCES Digest editions d24 and d25 are **partial releases** (55 and 34 tables respectively) rather than full
   editions. Private-school and gifted-and-talented tables are not in them, so those facts are cited to the last
   edition that carries them (d22 for Table 204.80, d23 for Tables 204.90, 205.10 and 205.20). Each citation
   names its edition year.

---

## What I searched for and could NOT verify

1. **The national count of students in gifted and talented programs from the 2021–22 CRDC.** No federal
   summary table publishes it. NCES's Table 204.80 (counts) was last published in the 2022 Digest with 2017–18
   as its final year and was dropped from the 2023 Digest; Table 204.90 (percentages) carries 2020–21 but no
   counts. The OCR *A First Look* report for 2021–22 lists "Gifted & Talented Programs" as a collected topic but
   reports no national total. I tried to download the public-use file to compute the total myself; the
   documented URL `civilrightsdata.ed.gov/assets/downloads/2021-22-crdc-data.zip` returns the site's Angular
   application shell (`content-type: text/html`, 62,015 bytes) rather than the 790 MB archive, and I could not
   locate the real asset path in the site's JavaScript bundles or via `/api/v1.0/` probes. The most recent
   federally published count remains **3,329,540 for 2017–18**.
2. **A single federal table giving a combined public-plus-private K–8 enrollment total for one common recent
   year.** The CCD is annual and the PSS is biennial, so the most recent year in which both are published is
   fall 2021. My combined denominator of 35,746,725 mixes fall 2024 public with 2023–24 private and is labeled
   as such.
3. **The Jawahar Navodaya Vidyalaya total enrollment figure of ~291,264 at its official source.** I could not
   retrieve the UDISE+ 2024-25 report tables directly from `udiseplus.gov.in`. The figure comes from a data
   aggregator (dataful.in) reproducing Ministry of Education UDISE+ management-type tables, and from a secondary
   compilation. The Ministry-verified facts (653 functional schools, admission by Selection Test, ~49,640
   admitted to Class VI per year, 560-student norm capacity) are from the PIB release and are solid; the
   enrollment total is not.
4. **The Navodaya Vidyalaya Samiti annual report or *Perspective Academic Planning 2024-25* at an official
   `navodaya.gov.in` URL.** The figures "No of students 289186" and "No of candidates Registered for Class VI
   admission test JNVST-2024 250087" were read from an unofficial WordPress mirror. Not used as a primary fact.
5. **Unrounded ISC Research figures from ISC Research's own publication.** ISC's public report page shows only
   rounded values ("15,000+", "7.7 million", "730k", "$69bn USD"). The precise 15,075 schools and $69.3 billion
   come from trade-press coverage of the same white paper, not from ISC directly. The full white paper is behind
   a lead-capture form. In any case this is TIER 5 commercial market research with a proprietary,
   non-auditable methodology.
6. **A published "English-medium" or "Anglophone" school-age population aggregate.** No multilateral statistical
   agency publishes one. UIS and World Bank groupings are geographic or income-based. My Group A and Group B
   totals are my own country selections summed from individually published per-country UIS figures.
7. **Turkey's BİLSEM (Science and Art Centers) national enrollment.** I could not find a Ministry of National
   Education (MEB) statistical table giving the total number of students in BİLSEM. Only peer-reviewed
   literature referencing BİLSEM programs was returned, with no national headcount.
8. **Vietnam's system of gifted high schools (trường chuyên) enrollment.** No official Ministry of Education and
   Training total located.
9. **The former Soviet specialised school system's enrollment.** No archival statistical source located; any
   figure would be a secondary estimate.
10. **China's gifted/experimental class enrollment.** No Ministry of Education statistical table located.
11. **Israel's national gifted programme enrollment.** No Ministry of Education (מנהל חברה ונוער / division for
    gifted students) statistical table located.
12. **Singapore's Gifted Education Programme enrollment.** Singapore MOE announced the GEP would be replaced
    from 2024; I did not locate a current official enrollment count, and in any case the historical GEP served
    roughly the top 1 percent of a cohort of about 40,000, so it is two orders of magnitude below 100,000.
13. **NYC specialized high school enrollment more recent than 2021-22 from a single official file.** The NYC
    Open Data Demographic Snapshot series ends at 2021-22. Per-school 2024-25 figures exist on the NYSED data
    site but only as nine separate institution pages, which I did not compile.
14. **A yield rate specific to academically selective private schools**, as distinct from independent schools
    generally. NAIS reports yield for all member schools and by member association, not by selectivity.
15. **An attrition rate specific to K-12 virtual or online private schools.** No federal or association source
    publishes one. The NAIS attrition figures cover member schools generally, which are overwhelmingly
    brick-and-mortar.
16. **Any count of children by ability percentile from a federal source.** None exists. Every band figure in
    Question 2 is my arithmetic on published enrollment counts, and is labeled as such.
17. **Home-schooled children in any K–8 denominator.** Neither the CCD nor the PSS counts them, so every
    denominator in this document excludes them.
