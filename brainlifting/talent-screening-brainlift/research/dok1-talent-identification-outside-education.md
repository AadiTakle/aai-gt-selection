# DOK 1 — Talent Identification Outside Education

Fact extraction only. Every number below was read out of the source named beside it. Exact quotes are in
quotation marks. Anything I could not verify is flagged inline and listed again in the final section.

Every DOI in this document was checked against the Crossref API and returned a matching record (**28/28 HTTP
200**); the OSF/PsyArXiv preprint DOI and its OSF data link were additionally confirmed to resolve. Sage,
ScienceDirect, Taylor & Francis and AEA return HTTP 403 to command-line requests; that is bot-blocking, not a
dead link, and the content of those pages was retrieved by other means (publisher full-text, author-hosted
PDFs, institutional repositories, or PMC).

**Transfer warning, stated once and then flagged per item.** The bulk of Sections 1–4 is *athletic* talent,
where the selection signal at age 10–14 is substantially a maturation signal — height, mass, strength, and
months of extra practice. Cognitive ability does not have the same puberty-driven convergence curve, so the
*mechanism* behind the sport findings does not transfer to CogAT-based selection automatically. What does
transfer, and what is worth arguing about, is the *structural* finding: a selection system measuring current
performance in an age-banded cohort, at an age when the trait is still developing, produces a predictable
class of errors. Sections 5–8 are cognitive/occupational and transfer much more directly. Each section
carries an explicit `TRANSFER` note.

---

## 1. The relative age effect in youth sport selection

### 1.1 Musch & Grondin (2001) — the review that named the problem

**Source.** Musch, J., & Grondin, S. (2001). "Unequal Competition as an Impediment to Personal Development: A
Review of the Relative Age Effect in Sport." *Developmental Review*, 21(2), 147–167. DOI
[10.1006/drev.2000.0516](https://doi.org/10.1006/drev.2000.0516). Full text read from the author-hosted PDF
mirrored at [nytimes.com/freakonomics](https://graphics8.nytimes.com/images/blogs/freakonomics/pdf/RelativeAgeEffectSportsMusch2001.pdf).

**Type.** Narrative review, not a meta-analysis. No pooled effect size is computed. Figures below are the
first-half-versus-second-half birth splits the authors tabulate from the studies they review; the authors
state plainly that "in some cases these data are approximate percentages based on figures reported in the
reviewed articles."

**Abstract statement of the mechanism.** "Children born shortly before the cutoff date for age grouping in
youth sport programs suffer from being promoted to higher age groups earlier than their later-born peers.
Skewed birthdate distributions among participants in youth sport and professional sport leagues have been
interpreted as the result of this disadvantage."

**The effect grows with age level (Musch, 1998, Tennessee youth soccer, USA), first half vs second half of
the competition year:**

| Age group | Born 1st half / 2nd half |
| --- | --- |
| 7–8 | 51 / 49 |
| 17–18 | 68 / 32 |

**Cross-national professional soccer splits tabulated by the authors (Musch & Hay, 1999):** Australia 58/42
(1988/89, January 1 cutoff) and 60/40 (1995/96, August 1 cutoff); Brazil 57/43; Germany 56/44; Japan 66/34.
Verhulst (1992), Belgium professional: 55/45.

**The cutoff-date causal test.** The authors describe two natural experiments they treat as the strongest
evidence that the cutoff date, not season of birth, is causal. First, Germany and Brazil both use August 1,
and "since the periodicity of birthdates in the Southern Hemisphere is exactly the reverse of that of the
northern one," a seasonal explanation predicts opposite skews; the observed skews match the cutoff, not the
hemisphere. Second, Australian youth soccer changed its cutoff from January 1 to August 1 in 1988 following
a FIFA proposal, and "a corresponding shift in the birthdate distribution of professional players 10 years
after the change provided strong evidence that the cutoff date is indeed the causal factor underlying the
RAE."

**Position-specific effect, ice hockey, NHL (Grondin & Trudeau, 1991, as reported here).** "In the NHL, 55%
of forwards were born in the first half of the selection year, but more than two-thirds of goal keepers were
born during the same period." The authors read this as evidence for a physical-demand mechanism — goalkeepers
carry the heaviest equipment.

**The authors' own quantification of what 11 months buys a child.** "An 11-month difference in age represents,
of course, considerable advantages in terms of height, weight, strength, and cognitive development. However,
beyond these mere facts, this age difference represents almost 10% of total life experience. Maybe more
importantly, this difference represents an extra year of experience in a given sport itself, which means much
more training."

**⚑ HIGH-VALUE FOR THIS CAPSTONE — the review's own education citations.** Musch & Grondin explicitly contrast
sport with school, and the contrast cuts *against* a naive transfer of the sport findings:

- On gifted identification specifically: "Maddux, Stacy, and Scott (1981) observed that, in a group of
  children who were classified as gifted, 61% were advantaged by a late entry to Grade 1 and thus by a
  relative age advantage." This is a relative-age effect *inside a gifted-identification program*, reported
  in 1981. I have **not** independently retrieved the Maddux, Stacy & Scott (1981) primary source; see
  Section 10.
- On persistence in academics: relative-age differences in school achievement, "while significant in the
  early years... seem to level out in subsequent years (Hauck & Finch, 1993; Kinard & Reinherz, 1986; Langer,
  Kalk, & Searls, 1984)."
- And a reversal claim: "Russell and Startup (1986) even showed that difficulties younger pupils experience
  in mastering their academic work can eventually lead to superior performance at graduate level where
  success is determined by high motivation and persistent efforts rather than by a relative age advantage."

`TRANSFER`: physical/athletic for the sport numbers; the three bullets above are *academic* and are the
review's own hedge. Treat the Maddux and Russell & Startup claims as secondhand until the primaries are read.

---

### 1.2 Cobley, Baker, Wattie & McKenna (2009) — the meta-analysis, with odds ratios

**Source.** Cobley, S., Baker, J., Wattie, N., & McKenna, J. (2009). "Annual Age-Grouping and Athlete
Development: A Meta-Analytical Review of Relative Age Effects in Sport." *Sports Medicine*, 39(3), 235–256.
DOI [10.2165/00007256-200939030-00005](https://doi.org/10.2165/00007256-200939030-00005). PubMed
[19290678](https://pubmed.ncbi.nlm.nih.gov/19290678/). Full text read from
[fisioex.ufpr.br mirror](http://www.fisioex.ufpr.br/resources/BE711/BE711---Cobley-SpMed-2009.pdf).

**Sample.** "A total of 38 studies, spanning 1984–2007, containing 253 independent samples across 14 sports
and 16 countries." Analysis by odds ratios with DerSimonian–Laird random effects. Q1 = first quarter of the
selection year after the cutoff.

**Overall pooled effect.** Q1 vs Q4 **OR 1.65** (95% CI 1.54, 1.77; Z = 14.46, p < 0.001). Q2 vs Q4 OR 1.37
(1.30, 1.44). Q3 vs Q4 OR 1.13 (1.10, 1.16). First 6 months vs second 6 months OR 1.39 (1.32, 1.47).
Substantial heterogeneity throughout (Q = 1731.1, df = 245, p < 0.0001 for the Q1/Q4 comparison). Funnel
plots "did not suggest publication bias was evident."

**The authors' own characterization is deflationary and should be quoted alongside the numbers:** "Overall
results identified consistent prevalence of RAEs, but with small effect sizes."

**Moderator 1 — age category. The effect peaks in adolescence and then falls:**

| Age category | Q1 vs Q4 OR (95% CI) |
| --- | --- |
| Adolescent (15–18 y) | **2.36** (2.00, 2.79) |
| Senior (19 y +) | **1.44** (1.35, 1.53) |

The authors: "Risk progressively increased with age from the child category to the adolescent (15–18 years)
age range... before declining at the senior (19 years plus) age category."

**Moderator 2 — skill level. The effect peaks at the pre-elite selection stage, not at the elite stage:**

| Skill level | Q1 vs Q4 OR (95% CI) |
| --- | --- |
| Representative (pre-elite, regional/national) | **2.77** (2.36, 3.24) |
| Elite (professional / senior national) | **1.42** (1.34, 1.51) |

The authors: "risk increased with skill level, with the highest risk evident at the representative (pre-elite)
stage... Interestingly, summary ORs suggest that the risks of RAEs are lower at the elite stage than in the
representative stage."

**Moderator 3 — sex.** Males Q1 vs Q4 OR 1.65 (1.54, 1.77); females Q1 vs Q4 OR **1.21** (1.10, 1.33). The
effect is roughly half as large in females on the quarterly comparison.

**Selected individual samples from Table I, to show the range** (all male; OR is Q1 vs Q4):

| Study | Age | Sport | Level | n | Q1 vs Q4 OR (95% CI) |
| --- | --- | --- | --- | --- | --- |
| Brewer et al. | 16–17 | Soccer | Youth elite development | 59 | **34** (4.09, 281) |
| Baxter-Jones | 11–17 | Soccer | Elite junior | 65 | **7.40** (2.32, 23.5) |
| Grondin et al. | 10–11 | Ice hockey | Junior AA | 124 | 5.27 (2.33, 11.9) |
| Helsen et al. | 10–16 | Soccer | Junior elite national | 369 | 4.62 (2.92, 7.30) |
| Barnsley et al. | 16–20 | Ice hockey | WHL amateur developmental | 698 | 4.56 (3.23, 6.42) |
| Barnsley et al. | Senior | Ice hockey | NHL professional | 715 | 1.97 (1.45, 2.67) |
| Thompson et al. | 10–14 | Baseball | Lower level junior | 827 | 0.90 (0.69, 1.18) |

Note the last two rows deliberately: the effect is far weaker at senior professional level than in the
development squads, and in some sports and levels (US youth baseball) it is absent or reversed.

**The authors' stated limitations.** They call for confirmation of "whether RAEs exist in female and more
culturally diverse contexts" and note that researchers "need to understand the mechanisms by which RAEs
magnify and subside."

`TRANSFER`: physical/athletic. The age and skill-level moderator pattern — biggest at the selection gate,
smaller at the outcome — is the structurally interesting part.

---

### 1.3 Helsen, Van Winckel & Williams (2005) — European soccer, birth-quarter percentages

**Source.** Helsen, W. F., Van Winckel, J., & Williams, A. M. (2005). "The relative age effect in youth soccer
across Europe." *Journal of Sports Sciences*, 23(6), 629–636. DOI
[10.1080/02640410400021310](https://doi.org/10.1080/02640410400021310). Full text read from
[eduratio.be mirror](http://eduratio.be/raehelsen.pdf).

**Sample.** N = 2,175 players across **ten European countries**, 1999–2000 season. Three subsamples: national
youth selections U-15/U-16/U-17/U-18 (n = 763); UEFA tournament squads U-16, U-18, U-21 and women's U-18 plus
the Meridian Cup (n = 735); club teams at U-12 and U-14 international tournaments held in Belgium in 2000
(n = 677). Cutoff date: January 1 (FIFA imposed this for international competition in 1997). Method:
Kolmogorov–Smirnov one-sample tests against the Belgian population birth distribution, plus linear regression
of player count on birth month.

**Headline result, national youth selections (Table II), pooled across the ten countries:**

> **N = 331 (43.38%) born in months 1–3. N = 71 (9.31%) born in months 10–12.** p < 0.01.

That is a **4.66 : 1** ratio between the first and last quarter of the selection year, in the pooled national
youth squads of ten countries.

**By country (months 1–3 vs months 10–12, national youth selections):**

| Country | Q1 | Q4 |
| --- | --- | --- |
| Germany | 52 (50.49%) | 4 (3.89%) |
| England | 47 (50.00%) | 16 (17.02%) |
| Sweden | 17 (47.22%) | 1 (2.78%) |
| Italy | 36 (46.75%) | 3 (3.90%) |
| Portugal | 33 (45.83%) | 5 (6.94%) |
| France | 18 (43.90%) | 6 (14.63%) |
| Belgium | 37 (37.37%) | 10 (10.10%) |
| Denmark | 33 (36.67%) | 8 (8.89%) |
| The Netherlands | 14 (36.84%) | 6 (15.79%) |
| Spain | 18 (36.00%) | 5 (10.00%) |

Regression of number of players on month of birth: Belgium r = −0.93 (p < 0.0001), Germany r = −0.92
(p < 0.0001), Italy r = −0.89 (p < 0.0001), Portugal r = −0.81 (p < 0.001), Denmark r = −0.74 (p = 0.006),
England r = −0.67 (p = 0.016), Netherlands r = −0.56 (p = 0.058, n.s.).

**Where the effect was NOT found — the authors' own null results.** Significant effects were obtained for
UEFA U-16 (r = −0.90), U-18 (r = −0.84) and the Meridian Cup (r = −0.81). "The results were not significant
for the men's U-21 group or women's U-18 category." The authors' explanations, quoted: for the older men,
players born late in the *old* selection year "may already have dropped out of the sport by the time they
reached 16–18 years of age"; for the women, "it is well known that girls mature earlier than boys (Malina,
1994). At 18 years of age, most of the female players are fully mature physically, and consequently the
relative age differences are much less pronounced in this age group."

**Club-team tournaments (U-12 and U-14):** significant on both K-S and regression, r = −0.86, p = 0.0003.

**The authors' interpretive sentence, which is the one worth quoting:** "Players with a greater relative age
are more likely to be identified as 'talented' because of the likely physical advantages they have over their
'younger' peers."

**⚑ The paper's own education framing.** Helsen et al. open by noting the same banding exists in school ("In
many school systems, a 12-year-old is defined as a child whose twelfth birthday falls during the 'academic
year'") and cite academic RAE literature: "it has been shown that the relative age effect clearly persists
beyond the end of primary education (Bell & Daniels, 1990) and even has consequences for access to, and
success at, university (Azevedo, Pinto-do-O, & Borges, 1995)." Those are secondhand citations I have not
retrieved.

**Anthropometric magnitude the authors give for a 12-month gap at age 10:** a 10-year-old at the 5th
percentile is "1.26 m tall with a body mass of 22 kg," a nearly-11-year-old at the 95th percentile "1.54 m
tall and 49 kg" — "approximately 0.2 m shorter and 27 kg lighter."

`TRANSFER`: physical/athletic, and the authors attribute the effect specifically to physical advantage. The
female-U18 null is direct evidence that the effect tracks maturation timing.

---

## 2. Reversal at senior level — the "underdog effect"

### 2.1 Gibbs, Jarvis & Dufur (2012) — the paper that named the reversal

**Source.** Gibbs, B. G., Jarvis, J. A., & Dufur, M. J. (2012). "The rise of the underdog? The relative age
effect reversal among Canadian-born NHL hockey players: A reply to Nolan and Howell." *International Review
for the Sociology of Sport*, 47(5), 644–649. DOI
[10.1177/1012690211414343](https://doi.org/10.1177/1012690211414343).

**Sample and domain.** Publicly available roster data on Canadian-born hockey players, 2000–2009; Canadian
Major Junior Hockey rosters, NHL rosters (the paper reports drawing on over 1,100 NHL players' birth months),
NHL All-Star rosters 2007–2009, and Canadian Olympic team rosters 1998–2010.

**Abstract, verbatim.** "Using publically available data of hockey players from 2000–2009, we find that the
relative age effect, as described by Nolan and Howell (2010) and Gladwell (2008), is moderate for the average
Canadian National Hockey League player and reverses when examining the most elite professional players (i.e.
All-Star and Olympic Team rosters). We also find that the average career duration is longer for players born
later in the year. In sum, there is a surprising 'relative age effect reversal' that occurs from the junior
leagues to the most elite level of hockey play. This supports an 'underdog' hypothesis, where the relatively
younger players are thought to benefit by more competitive play with their older counterparts."

**Body text figure I was able to read directly** (from the Academia.edu repository copy of the article,
figure-caption block): "The 2010 gold medal-winning Canadian Olympic hockey team had a mere 13 percent of its
players born in the first three months. Previous years confirm the trend with 17 percent in 2006, 26 percent
in 2002, and 14 percent in 1998."

Against a ~25% chance baseline, three of those four Olympic rosters are *under*-represented in Q1.

**⚠️ NOT VERIFIED — do not cite.** Secondary aggregators report specific paired figures for this paper — "only
17% of All-Star and Olympic roster players were born in the first quarter, contrasting with 28% among average
NHL players," and a decline "from 40% in the first-round draft picks to 28% in the NHL," and a career-length
gap of "one season." Those numbers came from an **AI-generated summary widget** on Academia.edu, not from the
article body. The published article is paywalled at Sage and I could not read the results section directly.
Treat these as unverified. See Section 10.

`TRANSFER`: physical/athletic.

### 2.2 Fumarco, Gibbs, Jarvis & Rossi (2017) — the peer-reviewed, open-access version of the same claim

**Source.** Fumarco, L., Gibbs, B. G., Jarvis, J. A., & Rossi, G. (2017). "The relative age effect reversal
among the National Hockey League elite." *PLOS ONE*, 12(8), e0182827. DOI
[10.1371/journal.pone.0182827](https://doi.org/10.1371/journal.pone.0182827).

**Sample.** North American NHL players, 2008–09 through 2015–16 seasons.

**Abstract, verbatim.** "we document a RAE reversal—players born in the last quarter of the year
(October–December) score more and command higher salaries than those born in the first quarter of the year.
This reversal is even more pronounced among the NHL 'elite.' We find that among players in the 90th
percentile of scoring, those born in the last quarter of the year score about **9 more points per season**
than those born in the first quarter."

This is the stronger citation for the reversal claim: open access, peer reviewed, and it reports a magnitude.

`TRANSFER`: physical/athletic.

### 2.3 Deaner, Lowen & Cobley (2013) — the reversal reframed as *measurable evaluator error*

**Source.** Deaner, R. O., Lowen, A., & Cobley, S. (2013). "Born at the Wrong Time: Selection Bias in the NHL
Draft." *PLOS ONE*, 8(2), e57753. DOI
[10.1371/journal.pone.0057753](https://doi.org/10.1371/journal.pone.0057753). Open access.

**Sample.** NHL drafts 1980–2006, n = 2,736 drafted players.

**This is the single most useful sport study in this document**, because it does not merely show a skewed
intake — it prices the evaluators' mistake against realized outcomes.

**Abstract, verbatim.** "Compared to those born in the first quarter (i.e., January–March), those born in the
third and fourth quarters were drafted more than **40 slots later than their productivity warranted**, and
they were roughly **twice as likely** to reach career benchmarks, such as 400 games played or 200 points
scored. This selection bias in drafting did not decrease over time, apparently continues to occur, and
reduces the playing opportunities of relatively younger players. This bias is remarkable because it is
exhibited by professional decision makers evaluating adults in a context where RAEs have been widely
publicized. Thus, selection bias based on relative age may be pervasive."

**Results text, verbatim, with the full quarter-by-quarter table:**

> "across the sample (n = 2,736), 13% of those born in the first quarter reached 400 games, whereas the
> values for the other quarters were, respectively, 18%, 21%, and 25% (Odds-ratio [OR] compared to first
> quarter: 1.47, 1.78, 2.23). Furthermore, the percentages from each quarter reaching 200 points were 8%,
> 13%, 15%, and 17% (OR: 1.71, 2.02, 2.36). Although selection bias is also manifest in the basic benchmark
> of playing at least one NHL game, the effect was more modest; the percentages were 48%, 53%, 55%, and 65%
> (OR: 1.22, 1.32, 2.01)."

| Career benchmark | Q1 | Q2 | Q3 | Q4 |
| --- | --- | --- | --- | --- |
| 400 games played | 13% | 18% | 21% | 25% |
| 200 points scored | 8% | 13% | 15% | 17% |
| ≥1 NHL game | 48% | 53% | 55% | 65% |

The authors define selection bias operationally as "evaluators granting fewer opportunities to relatively
younger individuals than is warranted by their latent ability," and note the bias persisted despite the RAE
being "widely publicized" — i.e., awareness did not fix it.

`TRANSFER`: physical/athletic, but the *evaluator* is an adult professional judging adults, which weakens the
maturation explanation for this particular result and strengthens the "the selection signal became a
credential" explanation.

### 2.4 Bäumler (1996), as reported in Musch & Grondin (2001) — the fade-out curve

Reported secondhand in Musch & Grondin: "Whereas the proportion of players born in the first half of the
competition year was as high as 68% among young professionals ages 18–22 years, it monotonically decreased
thereafter and finally reached an even proportion (49%) among the 33- to 35-year-olds." Musch & Grondin
attribute Bäumler's own interpretation: "evidence for a gradual wearing-off of the physical advantage."

⚠️ Secondhand. I have not retrieved Bäumler (1996). See Section 10.

---

## 3. How poorly youth selection predicts senior success

### 3.1 Güllich (2014) — German football, the cleanest single-system dataset

**Source.** Güllich, A. (2014). "Selection, de-selection and progression in German football talent promotion."
*European Journal of Sport Science*, 14(6), 530–537. DOI
[10.1080/17461391.2013.858371](https://doi.org/10.1080/17461391.2013.858371). PubMed
[24245783](https://pubmed.ncbi.nlm.nih.gov/24245783/). Full text read from a
[trainertalk.de copy](https://www.trainertalk.de/attachment/958-guellich-2014-football-talent-promotion-selection-pdf/).

**Sample and domain.** German football (soccer). National junior team squads 2001–2013; Bundesliga club youth
elite academies U10–U19; all then-current first- and second-Bundesliga players analysed retrospectively.
Programme scale, in the paper's own description: DFB coaches "scout ~600,000 young footballers annually and
select ~14,000 players aged 11–14 years."

**Turnover.**

- Mean annual turnover, youth elite academies U10–U19: **24.5%**. By transition: U10/11 17.2%, U11/12 27.4%,
  U12/13 18.1%, U13/14 23.5%, U14/15 26.1%, U15/16 32.6%, U16/17 18.2%, U17/18 31.7%, U18/19 33.0%.
- Mean annual turnover, national U-teams: **41.0%** (U15/16 49.8%; U16/17 34.8%; U17/18 46.0%; U18/19 37.7%).
- "Among all national U-team players observed from U15 to U19, **44.3% played in a U-team in only one season**,
  23.4% in two, 15.0% in three, 11.4% for four seasons and **only 5.9% played in national U-teams continuously
  over the five age categories**."
- "Irrespective of the age category, the probability of not being in the programme anymore three years later
  was >50% and after five years >70%."

**Survival of the earliest-selected cohort (Table I, row U10, youth elite academies).** Of players in an
academy at U10, the percentage still in the programme at each later age category:

| Still present at | U11 | U12 | U13 | U14 | U15 | U16 | U17 | U18 | U19 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| % of U10 cohort | 82.8 | 60.1 | 49.2 | 37.6 | 27.8 | 18.7 | 15.3 | 10.5 | **7.0** |

**93% of the children selected at U10 were gone by U19.**

**Conversion to senior professional level.** "Roughly every fourth junior representative player achieved
playing in either of the first (**26.9%**) or the second Bundesliga (**22.3%**)."

**⚑ THE KEY INVERSION — earlier selection predicted WORSE outcomes.** Verbatim: "This rate strongly depended
on the age at which the athletes were first nominated: **The younger their debut in a representative U-team,
the lower was their probability to reach the first Bundesliga** and the more likely were they to play below
the second Bundesliga at a senior age. Conversely, the older they made their debut in a national U-team, the
more likely were they to play in the first Bundesliga later and the lower was their probability to play below
the second Bundesliga."

Supporting figures: among second-Bundesliga players with a national-team appearance, 76.4% had debuted by
U19; among first-Bundesliga players, 52.7%; and among those who reached the senior Germany team (n = 81),
"only a minority of **48.2%** made their debut until U19." Mean U-team debut age was 18.0 ± 1.7 years for
second-Bundesliga players versus 19.1 ± 2.3 for first-Bundesliga professionals.

**The false-negative side.** "Some 88.7% of all current Bundesliga players had been involved in a youth elite
academy for at least one season until age category U19... and **30.6% played at least one match in a national
U-team**." Read the second figure the other way: **69.4% of Bundesliga professionals never played a single
national U-team match as a junior.** And 11.3% were never in an academy at all.

**Base rate.** "the players nominated for the national U-teams amount to **0.06%** of all registered players
within the respective age categories."

**The author's conclusion, verbatim.** "Most young members did not reach adolescence within the programme, let
alone become professional senior players. At the same time, despite massive expansion of the programme most
professional senior players were not involved in TP at a particularly young age. Combining these observations
leads to the conclusion that the collective of successful senior players clearly emerges from frequently
repeated procedures of selection and de-selection across all age stages (collectivistic approach) rather than
from early TID and selection and a long-term nurture."

**⚑ THE QUOTE TO USE.** On why the system's scouts and tests fail: "the insufficient discriminative power of
available tests and of the integrative 'coach's eye' need not be regarded as their flaw; rather, **an accurate
early distinction of future high potentials from their peers may simply not be possible in German football**."

`TRANSFER`: physical/athletic. But note the argument's structure — Güllich is claiming the ceiling is on the
*prediction problem*, not on the evaluators. That claim is domain-general in form and needs to be tested, not
assumed, for academic ability.

### 3.2 Güllich, Barth, Macnamara & Hambrick (2023) — the systematic review that quantifies it across sports

**Source.** Güllich, A., Barth, M., Macnamara, B. N., & Hambrick, D. Z. (2023). "Quantifying the Extent to
Which Successful Juniors and Successful Seniors are Two Disparate Populations: A Systematic Review and
Synthesis of Findings." *Sports Medicine*, 53(6), 1201–1217. DOI
[10.1007/s40279-023-01840-1](https://doi.org/10.1007/s40279-023-01840-1). Open access, full text at
[PMC10185603](https://pmc.ncbi.nlm.nih.gov/articles/PMC10185603/).

**Sample.** Prospective studies: 110 samples, **38,383 junior athletes**. Retrospective studies: 79 samples,
**22,961 senior athletes**. Junior age bands labelled Junior A (oldest) through Junior D (youngest).

**Abstract findings, verbatim.** "(1) Few elite juniors later achieved an equivalent competition level at
senior age, and few elite seniors had previously achieved an equivalent competition level at junior age. For
example, **89.2% of international-level U17/18 juniors failed to reach international level as seniors** and
**82.0% of international-level seniors had not reached international level as U17/18 juniors**. (2) Successful
juniors and successful seniors are largely two disparate populations. For example, international-level U17/18
juniors and international-level seniors were **7.2% identical and 92.8% disparate**. (3) Percentages of
athletes achieving equivalent junior and senior competition levels were the smallest among the highest
competition levels and the youngest junior age categories. (4) The quality of evidence was generally high."

**Forward direction — what happens to elite juniors (verbatim):** "only **16.3% of junior international
medalists at Junior A age became senior international medalists**, whereas 83.7% did not; **6.0%, 10.8%, and
25.3% of international-level juniors at Junior C, B, and A age**, respectively, became international-level
seniors, whereas 94.0%, 89.2%, and 74.7% did not; and 7.5%, 24.2%, and 40.5% of national-level juniors at
Junior C, B, and A age, respectively, became national-level seniors."

**Backward direction — where senior elites came from (verbatim):** "Only **2.5%, 16.0%, and 31.4% of all
senior international medalists had been junior international medalists** at Junior C, B, and A age,
respectively, whereas 97.5%, 84.0%, and 68.6% had not; **10.3%, 18.0%, and 32.5% of all international-level
seniors had been international-level juniors** at Junior C, B, and A age... and 6.1%, 24.6%, 37.2%, and 60.2%
of all national-level seniors had been national-level juniors at Junior D, C, B, and A age."

**Overlap bounds (verbatim):** "the groups with the smallest overlap, international-level athletes at Junior C
and international-level athletes at senior age, were **3.9% identical and 96.1% disparate**. The groups with
the largest overlap, national-level athletes at Junior A and national-level athletes at senior age, were
**32.0% identical and 68.0% disparate**."

**The load-bearing pattern:** the younger the age of selection and the higher the bar, the *less* the junior
and senior populations overlap. At Junior C, the identification is 96% wrong about who the senior elites will
be.

`TRANSFER`: physical/athletic, pooled across many sports and countries.

### 3.3 Barreiros, Côté & Fonseca (2014) — Portugal, four sports

**Source.** Barreiros, A., Côté, J., & Fonseca, A. M. (2014). "From early to adult sport success: Analysing
athletes' progression in national squads." *European Journal of Sport Science*, 14(sup1), S178–S182. DOI
[10.1080/17461391.2012.671368](https://doi.org/10.1080/17461391.2012.671368).

**Sample.** **395 athletes** in soccer, volleyball, swimming and judo, born **1974–1981**, who could have
competed in Portuguese national squads between **1988 and 2008**. Prospective design following athletes from
their competitive debut.

**Result, abstract verbatim.** "Results showed that **only a third of international pre-junior athletes
reappeared as senior athletes**, confirming the difficulties of predicting late success based on early
identification and selection."

**Companion retrospective study, same group.** Barreiros, A., & Fonseca, A. M. (2012). "A Retrospective
Analysis of Portuguese Elite Athletes' Involvement in International Competitions." *International Journal of
Sports Science & Coaching*, 7(3), 593–600. DOI
[10.1260/1747-9541.7.3.593](https://doi.org/10.1260/1747-9541.7.3.593). Sample: **532 international senior
athletes**, same four sports, born 1974–1983. Abstract verbatim: "The results showed, particularly at team
sports, that **a significant number of athletes did not have any international experience during their
development as a youth**. Overall, results suggest that early involvement in international events and
selection of talent during early ages is not a prerequisite of success, particularly in team and male sports."

Barreiros' doctoral thesis summarises both: "from the early selected athletes only around a third of these
athletes achieve an international status at a senior level, and... particularly in team sports, many of them
are replaced by others who start their international involvement later, inclusively only when they reach
adulthood."
([Repository copy](https://repositorio-aberto.up.pt/bitstream/10216/63665/2/Doutoramento%20%20Andr%20Barreiros.pdf))

`TRANSFER`: physical/athletic.

### 3.4 Two academy-level longitudinal studies worth having

**Source A.** "Progression from youth to professional soccer: A longitudinal study of successful and
unsuccessful academy graduates." *Scandinavian Journal of Medicine & Science in Sports* (2020). DOI
[10.1111/sms.13701](https://doi.org/10.1111/sms.13701). Sample: **537 youth players**, one professional
academy, 12 years of biannual fitness testing. Result, verbatim: "**Only 53 (10%) of players were successful
in obtaining a professional contract**, with 68% of players who became professional being recruited at
12 years of age or older. **Individuals recruited at an earlier age did not display a higher probability of
success** in attaining a professional contract... 'successful' academy graduates only physically outperformed
their 'unsuccessful' counterparts from age ~13-14 years onward, with either no differences in performance, or
**performance on physical fitness tests favoring 'unsuccessful' players prior to this age**. Findings suggest
that high achievers during childhood and early adolescence may not develop into successful senior
professionals, raising concerns about the predictive utility of talent identification models."

That middle clause is unusually strong: before ~13, the eventual *non*-professionals tested *better*.

**Source B.** "The identification and development of young talent in Spanish soccer academies: A 10-year
multi-study follow-up." *International Journal of Sports Science & Coaching* (2024). DOI
[10.1177/17479541241254767](https://doi.org/10.1177/17479541241254767). Sample: **198 male academy players**
aged 13.5–17.9, two Madrid professional clubs, 2009–2021. Result, verbatim: "**12 players (6.1%) progressed to
full-time professional soccer. Of these 12, just 7 reached Spain's highest professional league** within
10 years of their final academy tests." Authors' recommendation: "providing more developmental opportunities
before deselection is crucial to maximise player potential."

`TRANSFER`: physical/athletic.

---

## 4. Early specialization and early selection predict worse long-term outcomes

### 4.1 Güllich, Macnamara & Hambrick (2022) — "What Makes a Champion?"

**Source.** Güllich, A., Macnamara, B. N., & Hambrick, D. Z. (2022). "What Makes a Champion? Early
Multidisciplinary Practice, Not Early Specialization, Predicts World-Class Performance." *Perspectives on
Psychological Science*, 17(1), 6–29. DOI
[10.1177/1745691620974772](https://doi.org/10.1177/1745691620974772). Full text read from the
[Sage full-text page](https://journals.sagepub.com/doi/full/10.1177/1745691620974772).

**Sample.** "51 international study reports with **477 effect sizes from 6,096 athletes**, including **772 of
the world's top performers**" — and more precisely, "404 adult international medalists and 209 gold
medalists."

**⚑ THE CENTRAL RESULT: predictors of junior and senior success are not merely different, they are OPPOSITE.**
All values are meta-analytic Cohen's d̄ with 95% CI.

| Predictor | Junior athletes | Senior athletes |
| --- | --- | --- |
| Starting age in main sport (world-class vs national-class) | d̄ = −0.14 [−0.35, 0.07], p = .191 (n.s.) | **d̄ = 0.33 [0.14, 0.51], p = .001** (started LATER) |
| Age reaching performance milestones (all levels) | **d̄ = −0.54 [−0.70, −0.39]**, p < .001 (EARLIER is better) | **d̄ = 0.43 [0.17, 0.69]**, p = .001 (LATER is better) |
| Age reaching milestones (world- vs national-class) | **d̄ = −0.63 [−0.82, −0.43]**, p < .001 | **d̄ = 0.45 [0.25, 0.64]**, p < .001 |
| Main-sport coach-led practice (world- vs national-class) | **d̄ = 0.38 [0.02, 0.75]**, p = .037 (MORE) | **d̄ = −0.27 [−0.46, −0.09]**, p = .004 (LESS) |
| Other-sports coach-led practice (world- vs national-class) | d̄ = −0.17 [−0.39, 0.06], p = .158 (n.s.) | **d̄ = 0.52 [0.36, 0.68]**, p < .001 (MORE) |
| Other-sports youth-led play (world- vs national-class) | d̄ = −0.16 [−0.39, 0.07], p = .180 (n.s.) | d̄ = 0.13 [−0.02, 0.28], p = .095 (n.s.) |

Moderation of age category on the milestone variable: Q(1) = 39.37, p < .001. On main-sport practice among
lower-level comparisons the sign flips again: Q(1) = 26.91, p < .001.

**Authors' summary of finding 1, verbatim.** "the amount of multisport practice was a critical factor in
discriminating between adult world-class athletes and their national-class counterparts. Senior world-class
performers engaged in more coach-led practice in sports other than their main sport during
childhood/adolescence and, relatedly, began playing their main sport later, accumulated less main-sport
practice, and reached performance milestones at a slower rate than national-class performers. That is,
**senior world-class athletes who began their main sport early and specialized are the exception, not the
rule**."

**Authors' summary of finding 2, verbatim.** "in most cases, predictors of junior-level performance were not
only different from, but **opposite to**, those of senior-level performance."

**⚑ THE PARAGRAPH ABOUT SELECTION PROGRAMS, verbatim and directly on point for GT admissions.** "Institutional
TDPs typically select young athletes around the age of puberty... They select the young athletes who show the
most advanced performance at this age. Before the time of selection, these athletes have typically invested
great amounts of time in sport-specific practice but have done little or no other-sports practice... Once
selected, the TDPs aim to further expand the young athletes' sport-specific practice. **The strategy likely
increases the probability of early junior success but compromises the sustainability of long-term development
of international senior success.**"

And: "senior world-class athletes in our meta-analysis were selected for TDPs at a later age than were their
national-class counterparts. That is, **early TDP involvement correlated negatively with senior world-class
performance, indicating that early selection and involvement in TDPs is neither necessary nor beneficial to
long-term senior success.** The detrimental effects of early TDPs may be mitigated by postponing selection to
later age ranges."

**⚑⚑ THE GIFTEDNESS PARAGRAPH — the single most transferable passage in the sport literature, verbatim.**
"traditional views of *giftedness*, or what is commonly referred to as 'innate talent,' have conceptualized a
fast rate of early progress in a domain as an indicator of giftedness and as a determinant of ultimate
performance (e.g., Gagné, 2015; Heller et al., 2005; Simonton, 2007; Von Károlyi & Winner, 2005). The notion
corresponds to our findings among junior-level athletes. However, **it is inconsistent with the empirical
evidence on the development of the highest senior performers.** Specifically, it is inconsistent with the
observation that world-class senior performers initially progressed more slowly than did less accomplished
senior performers. **This type of giftedness theory, which assumes that giftedness manifests in rapid initial
progress, thus does not have explanatory power for the highest senior performance levels either.**"

Plus the methodological warning: "**predictors of the highest senior performance level cannot be concluded by
extrapolating findings from junior athletes, moderate performance ranges, or extreme contrast comparisons.**"

**⚑ THE NON-SPORT PARALLEL THE AUTHORS THEMSELVES DRAW, verbatim.** "This research focused on sports, but
analogous findings have been reported for at least one nonathletic domain: science. Graf (2015) examined the
biographies of the **48 German Nobel laureates** in physics, chemistry, economy, and medicine/physiology since
1945. **Forty-two had multidisciplinary study and/or working experiences.** Compared with winners of the
Leibnitz prize—Germany's highest national science award—**Nobel laureates were less likely to have won a
scholarship as a student** and took significantly longer to earn full professorships and to achieve their
award."

⚠️ Graf (2015) is secondhand; I have not retrieved it. See Section 10. But note what it says: the Nobel
laureates were *less* likely to have been picked out for a scholarship as students. That is a false-negative
claim about an academic selection mechanism.

`TRANSFER`: sport for the meta-analysis; the giftedness paragraph and the Nobel paragraph are the authors'
own explicit bridge to non-athletic domains.

### 4.2 Güllich & Barth (2024) — the follow-up meta-analysis on talent-program entry age

**Source.** Güllich, A., & Barth, M. (2024). "Effects of Early Talent Promotion on Junior and Senior
Performance: A Systematic Review and Meta-Analysis." *Sports Medicine*, 54, 697–710. DOI
[10.1007/s40279-023-01957-3](https://doi.org/10.1007/s40279-023-01957-3).

**Sample.** "k = 51 effect sizes from **N = 6233 athletes** from a wide range of countries and sports, 82%
male and 18% female, from 2009 to 2022." 37% junior, 63% senior.

**Result, abstract verbatim.** "The central finding is that effects on short-term junior performance versus
long-term senior performance are opposite, whereby higher-performing junior athletes began TPP involvement at
younger ages than lower-performing junior athletes, **d̄ = −0.53**. In contrast, higher-performing senior
athletes began TPP involvement at older ages than lower-performing senior athletes, **d̄ = 0.56**. The findings
are robust across different TPPs (federation's junior squad/selection team, youth academy), individual and
team sports, and performance levels compared (international, national, regional). The quality of primary
studies was high."

Moderation tests were all null — the reversal did not depend on programme type (junior F = 0.615, p = 0.446;
senior F = 0.024, p = 0.877), performance level, or individual vs team sport. Age-category moderation:
F = 63.897, p < 0.001.

**By sport family** (junior d̄ / senior d̄): cgs sports −0.56 / 0.36; game sports −0.49 / 0.55; combat sports
−0.58 / 0.51; artistic composition sports −0.25 / **1.08**; soccer −0.53 / 0.57.

**Plain-language conclusion, verbatim.** "Consistent across different populations, **early TPP involvement is
positively correlated with short-term junior performance but is negatively correlated with long-term senior
performance.**"

**Programme-turnover figures the review compiles:** "annual athlete turnover of **25–47% among youth sport
academies and 28–55% among federations' junior squads**."

`TRANSFER`: physical/athletic.

---

## 5. Military selection — the largest validated selection system in existence

`TRANSFER`: **This section is cognitive, not physical.** The AFQT is a general cognitive composite. This is
the closest real-world analogue to CogAT-based selection that exists at scale, and the validity coefficients
here are the honest high-water mark for what early ability measurement can buy.

### 5.1 Project A — scale and design

**Source.** Campbell, J. P. (2010). "Project A: 12 Years of R&D." In J. L. Farr & N. T. Tippins (Eds.),
*Handbook of Employee Selection* (Ch. 40). Read from
[gwern.net copy](https://gwern.net/doc/iq/ses/2010-campbell.pdf). The canonical book-length report is
Campbell, J. P., & Knapp, D. J. (Eds.) (2001), *Exploring the Limits in Personnel Selection and
Classification*, Erlbaum.

**Origin.** "a 1980 Congressional mandate to conduct a more thorough validation of ASVAB for selection and
classification purposes." Triggered in part by "the fallout from the misnorming of forms 6/7 of the Armed
Services Vocational Aptitude Battery (ASVAB)" (see Section 9.1).

**Scale of the population and the sample.** "In 1982 the population of enlisted jobs included approximately
**275 different Military Occupational Specialties (MOS)**, and the entire enlisted force was approximately
**800,000**." 21 MOS were ultimately studied. The initial 19 MOS "included only 5% of Army jobs but
represented **44% of the soldiers recruited in FY81**."

**Sample sizes by data collection** (from the project timeline figure):

| Sample | N |
| --- | --- |
| Concurrent, first-tour performance (CVI) | 9,500 |
| Concurrent, second-tour performance (CVII) | 1,000 |
| Longitudinal predictor battery (LVP) | 45,000 |
| Longitudinal training performance (LVT) | 30,000 |
| Longitudinal first-tour performance (LVI) | 10,000 |
| Longitudinal second-tour performance (LVII) | 1,500 |

Data collection ran 1983–1993. Concurrent sample: soldiers who entered July 1983–June 1984, assessed at
18–24 months of service, at 13 US posts plus locations in Germany. Longitudinal sample: "Virtually all new
recruits who entered the Army into one of the sampled MOS from August 1986 through November 1987."

### 5.2 Project A — validity coefficients

**Verbatim.** "ASVAB validities were estimated twice for each major factor of first-tour performance and twice
for each major factor of second-tour performance. As shown in Table 40.4, the profiles of validity estimates
(i.e., across performance factors) were very similar for each of the samples (e.g., **.62 to .65, on the
average across MOS, for predicting the Core Technical Proficiency factor**). **Correcting for unreliability in
the criterion pushes the estimates (not shown) close to .70.** ASVAB predicts job performance in the Army as
well as it does training performance, and the estimated validities are quite high."

Important qualifier from the methods: "For comparative purposes, the estimates were corrected for restriction
of range and for criterion unreliability." These are corrected multiple correlations, not raw *r*, and the
criterion is a factor score, not a supervisor rating. Compare with Section 6, where Sackett et al. argue such
range-restriction corrections have been systematically overdone in the civilian literature.

**Durability over time, verbatim.** "the estimated validities of the cognitive ability tests for predicting
Core Technical Proficiency and General Soldiering Proficiency were virtually identical for first tour
(2–3 years after enlistment) and for second tour (6–7 years after enlistment). **Overall, the validities did
not degrade**, as some have speculated they should."

**Incremental validity of everything else.** "ASVAB tends to be the best predictor of each of the performance
factors in each of the major data sets," with the new experimental battery's increments "primarily
concentrated in the prediction of the peer leadership and personal discipline factors by the ABLE scales"
(ABLE = the personality inventory).

**Utility of classification (not selection).** "the aggregate gain in MAP for Core Technical Proficiency was
**.14 standard deviation (SD) units** if all accessions must be classified, and **.22 SD units** if 5% could
remain unassigned."

### 5.3 Independent summary of ASVAB validity

**Source.** Sellman, W. S. (1993/1994). *Military Aptitude Testing: The Past Fifty Years* (DMDC Technical
Report 93-007). DOI [10.21236/ada269818](https://doi.org/10.21236/ada269818).

**Verbatim.** "The validity of military aptitude tests for predicting performance in training courses across
the range of specialties for all Services is **on average about 0.6** (Welsh, Kucinkas, & Curran, 1990,
July)... when hands-on job performance tests are used as the criterion measure to be predicted, aptitude tests
can predict job performance of infantrymen and mechanics at **0.6 or better**, which is comparable to the
usual validity against training grades. The empirical base for predicting job performance is not yet fully
developed, but indications are that **a validity coefficient of 0.5 to 0.6 is a good summary value across a
wide range of specialties** (Wigdor & Green, 1991). **A correlation of 0.6 is thus a good single value to
describe the predictive accuracy of military aptitude tests.**"

**Differential predictability by job type, verbatim.** "Some occupational specialties which involve physical
skills and endurance, such as infantry, traditionally have been less predictable than specialties that require
conceptual knowledge and problem-solving ability, such as technical repair and medical specialties."

**Utility framing, verbatim.** "With a validity of 0.6, the gain in performance of groups selected with
aptitude tests is 60 percent of the difference in performance between a group selected at random and a group
selected on the criterion itself."

### 5.4 The AFQT as an operational instrument

**Source.** Defense Testing Advisory Committee, "Appropriate Use of Armed Services Vocational Aptitude Battery
(ASVAB) Scores," Executive Note TO52-4.4.7 (2026).
[officialasvab.com PDF](https://www.officialasvab.com/wp-content/uploads/2026/02/20260128_DTAC_ExecutiveNote_TO52-4.4.7-AppropriateUseofASVABScores.pdf)

**Verbatim.** "For applicant selection purposes, examinees receive a score on the Armed Forces Qualification
Test (AFQT). The AFQT is a composite score calculated using the Standard Scores from four ASVAB subtests: AR,
MK, PC, and WK." And: "It has been validated extensively against military training performance and found to
be a good predictor of training grades. It has also been validated against job performance for a broad range
of military occupations and has been found to be a good predictor of job knowledge and on-the-job
performance."

⚠️ I did **not** find a single published, current figure for annual ASVAB test volume from an official DoD
source within this search. See Section 10.

---

## 6. Personnel selection meta-analyses — the revised numbers

`TRANSFER`: **Cognitive/occupational. This transfers most directly of anything in this document.**

### 6.1 Sackett, Zhang, Berry & Lievens (2022) — the correction

**Source.** Sackett, P. R., Zhang, C., Berry, C. M., & Lievens, F. (2022). "Revisiting meta-analytic estimates
of validity in personnel selection: Addressing systematic overcorrection for restriction of range." *Journal
of Applied Psychology*, 107(11), 2040–2068. DOI
[10.1037/apl0000994](https://doi.org/10.1037/apl0000994). PubMed
[34968080](https://pubmed.ncbi.nlm.nih.gov/34968080/). Full text read from
[gwern.net copy](https://gwern.net/doc/statistics/meta-analysis/2021-sackett.pdf).

**What they did.** Re-examined range-restriction artifact distributions in prior meta-analyses. Abstract,
verbatim: "we conclude that each has significant issues that often result in substantial overcorrection and
that therefore **the validity of many selection procedures for predicting job performance has been
substantially overestimated**... Key findings are that most of the same selection procedures that ranked high
in prior summaries remain high in rank, but with **mean validity estimates reduced by .10–.20 points.
Structured interviews emerged as the top-ranked selection procedure**... We conclude that our selection
procedures remain useful, but **selection predictor–criterion relationships are considerably lower than
previously thought**."

**Correction basis stated:** operational validities are "corrected for range restriction, where applicable, and
criterion measurement error using interrater reliability of .60 for supervisor ratings of overall job
performance, but not for predictor measurement error."

### 6.2 THE TABLE — full ranking (Sackett et al. 2022, Table 3)

Read directly from the Sackett et al. (2022) PDF, Table 3, and cross-checked against the reproduction in
Sackett, Zhang, Berry & Lievens (2023), "Revisiting the design of selection systems in light of new findings
regarding the validity of widely used predictors," *Industrial and Organizational Psychology*, DOI
[10.1017/iop.2023.24](https://doi.org/10.1017/iop.2023.24).

| Rank | Predictor | Schmidt & Hunter (1998) ρ | **Sackett et al. (2022) ρ** | SD of ρ | Black–White *d* |
| --- | --- | --- | --- | --- | --- |
| 1 | **Employment interviews — structured** | 0.51 | **0.42** | 0.19 | 0.23 |
| 2 | **Job knowledge tests** | 0.48 | **0.40** | 0.13 | 0.54 |
| 3 | **Empirically keyed biodata** | 0.35 | **0.38** | 0.09 | 0.33 |
| 4 | **Work sample tests** | 0.54 | **0.33** | 0.09 | 0.67 |
| 5 | **Cognitive ability (GMA) tests** | 0.51 | **0.31** | 0.14 | 0.79 |
| 5= | Integrity tests | 0.41 | 0.31 | 0.20 | 0.10 |
| 7 | Personality-based EI | NA | 0.30 | 0.17 | 0.22 |
| 8 | Assessment centers | 0.37 | 0.29 | 0.09 | 0.52 |
| 9= | SJT — knowledge | NA | 0.26 | 0.10 | 0.39 |
| 9= | SJT — behavioral tendency | NA | 0.26 | 0.12 | 0.34 |
| 11 | Conscientiousness — contextualized | NA | 0.25 | 0.00 | −0.07 |
| 12 | Interests | 0.10 | 0.24 | 0.25 | 0.33 |
| 13 | Emotional stability — contextualized | NA | 0.23 | 0.10 | 0.09 |
| 14 | Ability-based EI | NA | 0.22 | 0.05 | NA |
| 14= | Rationally keyed biodata | NA | 0.22 | 0.06 | 0.33 |
| 16= | Extraversion — contextualized | NA | 0.21 | 0.08 | 0.16 |
| 16= | Conscientiousness — overall | 0.31 | 0.21 | 0.15 | −0.07 |
| 18 | **Employment interviews — unstructured** | 0.38 | **0.19** | 0.16 | 0.32 |
| 18= | Agreeableness — contextualized | NA | 0.19 | 0.13 | 0.03 |
| 20 | Openness — contextualized | NA | 0.12 | 0.00 | 0.01 |
| 21 | Extraversion — overall | NA | 0.11 | 0.13 | 0.16 |
| 22 | Agreeableness — overall | NA | 0.10 | 0.14 | 0.03 |
| 23 | Emotional stability — overall | 0.09 | 0.09 | 0.08 | 0.09 |
| 24 | **Job experience (years)** | 0.18 | **0.07** | 0.11 | 0.49 |
| 25 | Openness — overall | NA | 0.05/0.06 | 0.07 | 0.10 |

**The biggest single revisions.** From the 2023 IOP commentary, verbatim: "For some predictors, the difference
was quite substantial (e.g., **.21 lower for work sample tests, .20 lower for cognitive ability, .19 lower for
unstructured interviews**). A second conclusion is that the relative predictive power for various predictors
changed considerably. **Cognitive ability is no longer the stand-out predictor that it was in the prior
work.**"

**⚑ THE STRUCTURAL FINDING, verbatim from the 2023 commentary.** "Our findings indicate that the predictors at
the top of our list in terms of criterion-related validity are **those specific to individual jobs**, such as
structured interviews, job knowledge tests, work sample tests, and empirically-keyed biodata. **These tend to
fare better than more general measures of psychological constructs, such as measures in the ability and
personality domain.**"

**The authors' own caveat on the #1 rank, verbatim from the 2022 paper.** "while the structured interview has
the highest mean operational validity (.42), it also has **a large residual SD of .19**. Thus, while the mean
is high, there is also a higher risk of obtaining a lower value." Ranked instead by the *low end of the 80%
credibility interval*, "the five highest-ranked predictors are, in order, **empirically keyed biodata,
contextualized conscientiousness, job knowledge, work samples, and structured interviews**" — cognitive
ability and integrity tests drop out of the top five entirely.

**Assessment-center caveat.** The 2023 commentary revises assessment centers upward when restricted to
managerial samples: "This increases the mean corrected operational validity estimate from .29 to .33, which
raises assessment centers from 8th on the validity ranking list to a tie with work samples for 4th."

**Validity–diversity note, verbatim.** "our 'top five' predictors include three with substantial group mean
differences (work samples, job knowledge tests, and cognitive ability tests) and three with much smaller mean
differences (structured interviews, biodata, and integrity tests)."

### 6.3 The follow-on: does dropping cognitive ability cost you anything?

**Source.** Berry, C. M., et al., "Revisiting General Mental Ability Tests' Role in the Validity-Diversity
Tradeoff" (accepted manuscript, *Journal of Applied Psychology*), author copy at
[filiplievens.squarespace.com](https://filiplievens.squarespace.com/s/APL-2022-4078_R3.pdf).

**Verbatim.** "Our results lead to the conclusion that **excluding GMA tests generally has little to no effect
on validity, but substantially decreases adverse impact. Contrary to popular belief, GMA tests are not a
driving factor in the validity-diversity tradeoff.**"

⚠️ I read this from an author-hosted accepted manuscript; I did not confirm the final published volume, issue
or page numbers. See Section 10.

---

## 7. Work samples and auditions

### 7.1 Work sample tests — the number, and how far it fell

From Sackett et al. (2022), Table 3: **work sample tests ρ = 0.33** (SD of ρ = 0.09; Black–White *d* = 0.67).
Prior Schmidt & Hunter (1998) estimate: 0.54. This is **the single largest downward revision in the table
(−0.21)**.

Two things follow that are worth stating plainly:
1. Work samples still rank **4th of 25** and still beat general cognitive ability (0.31).
2. Their residual SD is small (0.09), so they are among the *most consistent* predictors — they rank 4th on
   the low end of the credibility interval too.
3. They carry the **largest Black–White subgroup difference in the entire table** (*d* = 0.67), larger than
   job knowledge tests (0.54) and second only to cognitive ability (0.79).

Assessment centers, which Sackett et al. describe as "a specific form of work sample tests," are at 0.29
overall, 0.33 for managerial samples.

`TRANSFER`: cognitive/occupational. Directly relevant to any "give the applicant the actual work and watch"
admissions design.

### 7.2 Goldin & Rouse (2000) — blind auditions

**Source.** Goldin, C., & Rouse, C. (2000). "Orchestrating Impartiality: The Impact of 'Blind' Auditions on
Female Musicians." *American Economic Review*, 90(4), 715–741. DOI
[10.1257/aer.90.4.715](https://doi.org/10.1257/aer.90.4.715). Free full text from
[Harvard DASH](https://dash.harvard.edu/bitstreams/7312037d-e965-6bd4-e053-0100007fdf3b/download). Earlier as
NBER WP 5903, DOI [10.3386/w5903](https://doi.org/10.3386/w5903).

**Sample and domain.** Two datasets from **eight** major US symphony orchestras: (a) *rosters* — orchestra
personnel lists with instrument and position, roughly four decades; (b) *audition records* — "the actual
accounts of the hiring process kept by the personnel manager of the orchestra," including the complete
applicant pool for each audition, with individuals linked across auditions. Design: individual fixed effects,
exploiting staggered adoption of the screen. "Most other orchestras shifted to blind preliminaries from the
early 1970's to the late 1980's." Boston adopted a screen for preliminaries in 1952; Cleveland had no blind
round at all.

**Context figure.** "Female musicians in the top five symphony orchestras in the United States were **less than
5% of all players in 1970 but are 25% today**" (NBER working-paper abstract). And in the AER text: recent
shares of new hires "about 35 percent for the BSO and Chicago, and about 50 percent for the NYPhil, whereas
before 1970 less than 10 percent of new hires were women."

**Headline effect sizes, from the NBER abstract, verbatim.** "we find that **the screen increases by 50% the
probability a woman will be advanced out of certain preliminary rounds**. The screen also enhances, **by
severalfold**, the likelihood a female contestant will be the winner in the final round. Using data on
orchestra personnel, the switch to 'blind' auditions can explain **between 30% and 55% of the increase in the
proportion female among new hires** and **between 25% and 46% of the increase in the percentage female in the
orchestras since 1970**."

The AER version is more conservative: "the switch to blind auditions can explain about **one-third** of the
increase in the proportion female among new hires (whereas another one-third is the result of the increased
pool of female candidates). Estimates based on the roster sample indicate that blind auditions may account for
**25 percent** of the increase in the percentage of orchestra musicians who are female."

**⚑ THE AUTHORS' OWN STATED LIMITATION, in the published abstract, verbatim.** "Although **some of our
estimates have large standard errors and there is one persistent effect in the opposite direction**, the
weight of the evidence suggests that the blind audition procedure fostered impartiality in hiring and
increased the proportion women in symphony orchestras."

And in the body: "**Even though our sample size is large, we identify the coefficients of interest from a much
smaller sample. Some of our coefficients of interest, therefore, do not pass standard tests of statistical
significance** and there is, in addition, one persistent result that goes in the opposite direction. The
weight of the evidence, however, is what we find most persuasive."

**⚑⚑ DO NOT CITE THIS PAPER WITHOUT THE CAVEAT.** There is a substantial, public, unrebutted statistical
critique. Jonatan Pallesen's reanalysis ([jsmp.dk](http://www.jsmp.dk/posts/2019-05-12-blindauditions/blindauditions.html))
concludes: "this study presents **no statistically significant evidence that blind auditions increase the
chances of female applicants**. In my reading, the unadjusted results seem to weakly indicate the opposite,
that male applicants have a slightly increased chance in blind auditions; but this advantage disappears with
controls." He notes one nominally significant p-value of 0.042 which, Bonferroni-corrected for the eight tests
in that table, becomes 0.33. Andrew Gelman endorsed the critique
([statmodeling.stat.columbia.edu, 11 May 2019](https://statmodeling.stat.columbia.edu/2019/05/11/did-blind-orchestra-auditions-really-benefit-women/)),
writing that the results were "not very impressive at all" and "the data are too noisy to form any strong
conclusions," and adding: "You shouldn't be running around making a big deal about point estimates when the
standard errors are so large. I don't hold it against the authors—this was 2000, after all... But from a
modern perspective we can see the problem."

**How to use this honestly.** The Goldin–Rouse *design* (staggered adoption of identity-blind evaluation,
individual fixed effects, complete applicant pools) is the model to imitate. The *"50%" number* is not solid
enough to build an argument on. The blogs are not peer-reviewed; the authors' own abstract caveat is, and it
is the safer citation.

`TRANSFER`: music/hiring; identity-blinding, not talent measurement per se.

---

## 8. Expert judgment versus algorithms

`TRANSFER`: **Sections 8.1–8.2 are cognitive/clinical and transfer directly. Section 8.3 is sport.**

### 8.1 Grove, Zald, Lebow, Snitz & Nelson (2000)

**Source.** Grove, W. M., Zald, D. H., Lebow, B. S., Snitz, B. E., & Nelson, C. (2000). "Clinical versus
mechanical prediction: A meta-analysis." *Psychological Assessment*, 12(1), 19–30. DOI
[10.1037/1040-3590.12.1.19](https://doi.org/10.1037/1040-3590.12.1.19). PubMed
[10752360](https://pubmed.ncbi.nlm.nih.gov/10752360/). Full text read from
[Zald Lab copy](http://zaldlab.psy.vanderbilt.edu/resources/wmg00pa.pdf).

**Sample.** "Using these selection criteria, **163 studies** were identified. Of the 163 studies, **136
qualified for inclusion** once closely examined for coding." Domain: "studies of human health and behavior" —
psychiatric/medical diagnosis, prognosis, academic and job performance prediction, recidivism.

**Key inclusion rule (matters for interpretation).** Studies were excluded "if they operated on different sets
of participants, unless the assignment of participants to prediction conditions was random. **This was to rule
out the possibility that an ostensibly superior prediction method was favored by being applied to participants
for whom predictions were easier to make.**"

**Abstract, verbatim.** "On average, **mechanical-prediction techniques were about 10% more accurate than
clinical predictions.** Depending on the specific analysis, mechanical prediction substantially outperformed
clinical prediction in **33%–47%** of studies examined. Although clinical predictions were often as accurate
as mechanical predictions, in only a few studies (**6%–16%**) were they substantially more accurate.
**Superiority for mechanical-prediction techniques was consistent, regardless of the judgment task, type of
judges, judges' amounts of experience, or the types of data being combined.** Clinical predictions performed
relatively less well when predictors included clinical interview data."

**The proportion breakdown, results text verbatim.** "A simple rubric for summarizing the data treats ESs
< −0.1 as substantially favoring the clinician, those falling from −0.1 to 0.1 as being relatively equal, and
those > 0.1 as substantially favoring the mechanical method. Using this categorization scheme, we found about
half of the studies (**N = 63; 47%**) notably favor mechanical prediction, with as many (**N = 65**) yielding
equal performance. In contrast, **only eight studies (6%) notably favor clinical prediction**."

| Outcome | N | % |
| --- | --- | --- |
| Substantially favors mechanical | 63 | 47% |
| Roughly equal | 65 | 48% |
| Substantially favors clinical | 8 | 6% |

**Effect size distribution, verbatim.** "Transformed ESs ranged from −0.30 (clinical prediction superior) to
0.74 (marked superiority for mechanical prediction)... Half of the transformed ESs lie between about 0 and
0.2." Weighted summary: **M = 0.086, SD = 0.12**, Q1 = −0.008, Mdn = 0.080, Q3 = 0.20. Heterogeneity:
Q_T = 1635.2, df = 135, p < .0001.

**⚑ The nuance that is usually dropped when this study is cited.** The modal result is a *tie* (48%), not a
mechanical win. The mean advantage is *d* ≈ 0.09 — small. The honest headline is "algorithms beat or match
experts ~94% of the time, and beat them by a small margin on average," not "algorithms crush experts."

**The interview finding, which is the one most relevant to admissions:** "Clinical predictions performed
relatively less well when predictors included clinical interview data."

### 8.2 Ægisdóttir et al. (2006) — the replication six years later

**Source.** Ægisdóttir, S., White, M. J., Spengler, P. M., Maugherman, A. S., Anderson, L. A., Cook, R. S.,
Nichols, C. N., Lampropoulos, G. K., Walker, B. S., Cohen, G., & Rush, J. D. (2006). "The Meta-Analysis of
Clinical Judgment Project: Fifty-Six Years of Accumulated Research on Clinical Versus Statistical Prediction."
*The Counseling Psychologist*, 34(3), 341–382. DOI
[10.1177/0011000005285875](https://doi.org/10.1177/0011000005285875). ERIC
[EJ735126](https://eric.ed.gov/?id=EJ735126). Full text read from
[gwern.net copy](https://gwern.net/doc/statistics/prediction/2006-aegisdottir.pdf).

**Sample.** "**Sixty-seven studies** were identified from a comprehensive search of **56 years** of research;
**92 effect sizes** were derived from these studies." Domain: mental health practitioners' predictions.

**Abstract, verbatim.** "The overall effect of clinical versus statistical prediction showed a somewhat greater
accuracy for statistical methods. The most stringent sample of studies, from which **48 effect sizes** were
extracted, indicated a **13% increase in accuracy using statistical versus clinical methods**. Several
variables influenced this overall effect. **Clinical and statistical prediction accuracy varied by type of
prediction, the setting in which predictor data were gathered, the type of statistical formula used, and the
amount of information available to the clinicians and the formulas.**"

**Effect sizes, results text.** Effect sizes ranged from **.57 in favor of the clinical method to −.73 in
favor of the statistical method**. Weighted mean *d*+ values reported in the sensitivity table: without
Goldberg (1965) and Oskamp (1962), *d*+ = **−.15** (95% CI −.17 to −.13), N = 67 studies, 92 effects; for
cross-validated studies, *d*+ = **−.14** (−.17 to −.12), N = 49. (Negative = favors statistical.)

**Convergent summary from a later APA source** ([Counseling Psychology feature
PDF](https://www.apa.org/pubs/journals/features/cou-0000105.pdf)): "mechanical prediction being **slightly
superior** to unassisted clinical judgment (*d* = .12; Ægisdóttir et al., 2006; Grove et al., 2000)."

**⚑ Note the authors' framing, which is not triumphalist.** Their stated aim includes "Recommendations are
provided about when and under what conditions counseling psychologists might use statistical formulas **as
well as when they can rely on clinical methods**."

### 8.3 Sport: does the "coach's eye" beat a test battery?

**Source A — head-to-head comparison.** "Science or Coaches' Eye? – Both! Beneficial Collaboration of
Multidimensional Measurements and Coach Assessments for Efficient Talent Selection in Elite Youth Football."
*Journal of Sports Science & Medicine*, 18(1), 32–43.
[jssm.org](https://www.jssm.org/hf.php?id=jssm-18-32.xml)

**Sample.** 117 youth football players assessed at U14 (coach assessments, motor performance tests,
psychological characteristics, familial support, training history, biological maturation), outcome = U19
player status (professional vs non-professional) **five years later**.

**Results, AUC [95% CI], verbatim.** "Motor performance tests (**0.71** [0.58; 0.84]) showed a lower AUC than
the multidimensional data (**0.85** [0.76; 0.94], p = 0.02), whilst **coach assessments did not differ from
the two others (0.82 [0.74; 0.90])**. Further, combined talent selection approaches, especially the use of
coach assessments and multidimensional data together, were significantly better at predicting U19 player
status (**0.93** [0.87; 0.98], p = 0.02 vs. multidimensional data only)."

So in this sample the coach's eye (0.82) numerically *beat* the motor test battery (0.71) and was
statistically indistinguishable from the full multidimensional model — and the combination beat everything.
This is the opposite of the naive "algorithms beat experts" reading, and it is a small single-club sample
(n = 117) with wide confidence intervals.

**Source B — much larger, and it splits the difference.** "Nationwide Subjective and Objective Assessments of
Potential Talent Predictors in Elite Youth Soccer: An Investigation of Prognostic Validity in a Prospective
Study." *Frontiers in Sports and Active Living* (2021). DOI
[10.3389/fspor.2021.638227](https://doi.org/10.3389/fspor.2021.638227).

**Sample.** **N = 13,869 male players**, mean age 12.59 ± 1.07, age groups U12–U15, German soccer talent
development programme. Outcome: reaching professional youth academy level three seasons later — **success
rate 9%**.

**Results, verbatim.** "Multivariate results provided empirical evidence for the subjective (**7% ≤ Nagelkerke's
R² ≤ 11%**; each p < 0.001) and objective (**8% ≤ Nagelkerke's R² ≤ 13%**; each p < 0.001) assessments'
prognostic validity. However, model 3 [both combined] revealed the best statistical explanatory power in each
age group (**0.15 ≤ Nagelkerke's R² ≤ 0.20**; p < 0.001)."

Read the ceiling: **the best model explains 15–20% of the variance** in whether a 12-year-old reaches an
academy three years later. In a nationwide sample of 13,869, with both expert judgment and objective tests,
against a near-term outcome.

**Source C — a maturation-bias finding inside coach intuition.** "Investigating Player Selection within UK
Academy Soccer," *IJPEFS*. Sample: 45 academy players (age 14 ± 2) and 10 coaches. Findings: "Lead and
assistant coaches demonstrated **poor-to-moderate agreements in perceived player skills (ICC = 0.48 to
0.76)**... **coach agreement reduced as players aged. Likewise, a maturation related bias was present whereby
biologically older players were selected over their lesser mature players.**"

**Bottom line for Q8.** I found **no** study in sport that cleanly shows scouts being beaten by a simple
statistical rule. What I found is: (a) coaches' judgments carry real signal, comparable to test batteries;
(b) coaches' judgments carry a documented maturation/relative-age bias; (c) combining beats either alone;
(d) the total predictive ceiling is low regardless of method. The strong "algorithms beat experts" claim rests
on the clinical literature (8.1, 8.2), not on the sport literature, and even there the modal study is a tie.

---

## 9. Programs that measured their own false negatives

This was the hardest item. Genuine cases — where a selection system admitted or tracked people it would have
rejected and then measured them — are rare. I found three real ones and two partial ones.

### 9.1 ⭐ THE ASVAB MISNORMING, 1976–1980 — the best case in existence

**Source.** Sellman, W. S., Born, D. H., & Strickland, W. J. (2010). "Selection and Classification in the U.S.
Military." In *Handbook of Employee Selection*. Read from
[gwern.net copy](https://gwern.net/doc/iq/2010-sellman.pdf). Primary follow-up study cited therein: Shields,
J. L., & Grafton, F. C. (1983). *A natural experiment: Analysis of an almost unselected Army population*.
Alexandria, VA: U.S. Army Research Institute.

**What happened, verbatim.** "In 1980, the DoD announced that the ASVAB in use since 1976 had been misnormed
with the result that scores in the lower ranges were artificially inflated... As a result, **approximately
360,000 young men and women, who had entered service during the period 1976–1980, would have been unable
otherwise to meet enlistment standards** (Eitelberg, 1988). **About one out of every four male recruits across
all services in those years would have been disqualified** under the aptitude standards the services intended
to apply."

By subgroup: "**Over 40% of Black recruits** during this period had test scores that ordinarily would have
kept them out of the military... **Almost 33%** [of Hispanics] would have been considered ineligible under the
correct aptitude standards."

**⚑⚑ THE PASSAGE THAT ANSWERS QUESTION 9 DIRECTLY, verbatim.** "**The ASVAB misnorming episode turned out to
be a natural experiment with large numbers of new recruits entering service 'unselected.' The misnorming
presented a unique opportunity to study, on a large scale, the validity of selection standards in an
unrestricted population.** The people who were admitted to the military with aptitude scores below the cut-off
points were assumed by their supervisors to have had scores above the enlistment standards. **Individuals with
legitimately qualifying scores did appreciably better than their lower-scoring peers in terms of training
performance, promotions, disciplinary problems, and attrition.**"

Note the elegance of the design: because nobody *knew* these recruits had failed the standard, **supervisors
were effectively blind** — no expectancy effect, no self-fulfilling prophecy. This is as close to a randomized
test of a selection cutoff as exists at national scale.

**The result cuts BOTH ways, and both directions matter:**

*Direction 1 — the test was valid.* Qualifying scorers "did appreciably better... in terms of training
performance, promotions, disciplinary problems, and attrition."

*Direction 2 — the rejects were mostly fine.* From Sticht, T. G. (1990), "Testing and Assessment in Adult Basic
Education and English as a Second Language Programs," ERIC
[ED317710](https://files.eric.ed.gov/fulltext/ED317710.pdf), summarising Greenberg (1980) on the ~200,000+
Army "potentially ineligibles" (PIs): "**of the [comparisons] of PIs and controls the PIs performed as well as
or better than the controls**" in a substantial share of comparisons, and in most others "the controls
surpassed the PIs by only **one to four percentage points**." Sticht's own summary sentence: "**These
enlistees, on the whole, performed satisfactorily.**"

Also from Sticht: the military's response was not to re-reject them but to adapt — "The military used four
strategies with the lower ability recruits: **limited assignments, provision of extra help and time, revision
of training courses, and establishment of special training units.**"

**Consequence.** The misnorming is what triggered Project A. Verbatim from Sellman: "Congressional scrutiny of
the ASVAB misnorming and surrounding issues of recruit quality and entry standards led to the Joint-Service
Job Performance Measurement/Enlistment Standards Project."

⚠️ I have **not** retrieved the Shields & Grafton (1983) or Greenberg (1980) primary reports; both are cited
secondhand. See Section 10.

`TRANSFER`: **cognitive.** This is the strongest single item in the document for a GT-selection argument,
because the predictor is a cognitive composite, the sample is enormous, the assignment mechanism was a
clerical error rather than a policy choice, and the evaluators were blind.

### 9.2 Project 100,000, 1966–1971 — deliberate, but confounded

**Source.** "Reassessing Project 100,000: Context and Lessons—A Research Note," *Armed Forces & Society*. DOI
[10.1177/0095327X261440131](https://doi.org/10.1177/0095327X261440131). Outcome study: Laurence, J. H., et al.
(1989), *Effects of Military Experience on the Post-Service Lives of Low-Aptitude Recruits*, ERIC
[ED366751](https://files.eric.ed.gov/fulltext/ED366751.pdf).

**Scale, verbatim.** "Between October 1, 1966 and December 31, 1971, a total of **341,127 men** joined the
military under lowered physical (9%) or mental test standards (**91%**)." Recruits scored in AFQT Category IV
(10th–30th percentile). Entrance requirements were loosened but "all the Project 100,000 men were sent through
normal training programs with other recruits, and **performance standards thus were the same for everyone**."

**In-service performance, from Sticht (ERIC ED317710), verbatim.** "**Over 80 percent of these persons
completed their tour of duty and more than 90 percent were rated above average in their service.**"

⚠️ That sentence is doing a lot of work and I could not trace it to a primary source within this search. Treat
with caution. See Section 10.

**Post-service outcomes — the honest, negative finding, verbatim from ED366751.** "Comparisons between Project
100,000 participants and their nonveteran peers **did not show veterans to have an advantage**. In fact, in
terms of employment status, educational achievement, and income **those who never served appeared better off
than those who had been in the military.** Veterans were found to be more likely to be unemployed, and to have
an average level of education significantly lower than the nonveterans. **Income differences between the two
groups ranged from $5,000 to $7,000**, depending on the sources included, **in favor of the nonveterans.**"
The comparison groups were "low-aptitude nonveterans from both eras... drawn from the follow-ups to the 1966
and 1979 National Longitudinal Surveys."

The authors' verdict: "the results are unequivocal. These data provide no evidence to support the hypothesis
that military service offers a 'leg up'..."

**Why this is a weaker case than 9.1.** Project 100,000 confounds three things: relaxing a selection standard,
providing a treatment (military service), and — because it ran during Vietnam — differential combat exposure.
The misnorming has none of these problems.

`TRANSFER`: cognitive predictor, but heavily confounded outcome.

### 9.3 ⭐ Terman's Genetic Studies of Genius — the canonical education false-negative case, and its rebuttal

**Source.** Warne, R. T., Larsen, R. A. A., & Clark, J. (2020). "Low base rates and a high IQ selection
threshold prevented Terman from identifying future Nobelists." *Intelligence*, 82, 101488. DOI
[10.1016/j.intell.2020.101488](https://doi.org/10.1016/j.intell.2020.101488). Preprint:
[psyarxiv.com/g4x6r](https://psyarxiv.com/g4x6r/), DOI
[10.31234/osf.io/g4x6r](https://doi.org/10.31234/osf.io/g4x6r). Code and results:
[osf.io/3xfe8](https://osf.io/3xfe8/).

**The documented false negatives, abstract verbatim.** "Although the accomplishments of the **1528 subjects**
of the Genetic Studies of Genius are impressive, they do not represent the pinnacle of human achievement.
Since the early 1990s, commentators have criticized the study because **two future Nobelists—William Shockley
and Luis Alvarez—were among the candidates screened for the study; but they were rejected because their IQ
scores were too low.**"

Selection threshold: **IQ 140**. Screened population in the simulation: **168,000 candidates**.

**The rebuttal, abstract verbatim.** "This study simulates Terman's sampling procedure to estimate the
probability that Terman would have selected one or both future Nobelists... **Results showed that it was
unlikely for Terman to identify children who would later earn Nobel prizes, mostly because of the low base
rate of earning a Nobel and the high minimum IQ needed to be selected for Terman's study.** Changes to the
methodology that would have been required to select one or both Nobelists were not practical. Therefore,
future Nobelists' absence from the Genetic Studies of Genius sample **is not a fatal flaw of intelligence
testing or Terman's study.** Instead, **predicting high levels of eminence requires measuring a variety of
relevant cognitive and non-cognitive variables.**"

**Warne's own plain-language gloss** ([russellwarne.com, 14 Sept 2020](https://russellwarne.com/2020/09/14/termans-non-geniuses-shockley-and-alvarez/)):
"the major reason that Terman failed to identify Alvarez and Shockley was because **his minimum IQ for
inclusion in the Genetic Studies of Genius (140) was too high. IQ scores in the 120s seem to be common among
Nobelists (Root-Bernstein, 2015). Lowering the minimum IQ for the study would have increased Terman's sample
size about tenfold** and made it too large to study with the resources he had."

**The counter-position, for balance.** Simonton, D. K. (2016). "Reverse engineering genius: historiometric
studies of superlative talent." *Annals of the New York Academy of Sciences*. DOI
[10.1111/nyas.13054](https://doi.org/10.1111/nyas.13054). Verbatim: "**not one received a Nobel Prize.**
Ironically, in fact, two boys who were rejected from the sample—because they were deemed not intellectually
gifted enough—much later won Nobel Prizes in physics, namely William Shockley and Walter Alvarez. Worse yet,
although these gifted children differed greatly in adult success, **those differences could not be attributed
to corresponding contrasts in general intelligence.** Instead, other nonintellectual factors and developmental
experiences had more discriminating power."

Simonton anticipates and rejects the restriction-of-range defence: "**Not only did the brightest and the least
bright in the sample differ by more than four standard deviations on the Stanford–Binet scale**, but the
longitudinal research associated with the Study of Mathematically Precocious Youth has found substantial
differences in performance outcomes in extremely exclusive samples."

⚠️ Simonton's article misnames Luis Alvarez as "Walter Alvarez" (Walter is his son). The error is in the
published text; quote it as written or paraphrase.

**Why this belongs in Q9 even though it is education.** It is the only case I found where a *gifted*
identification programme's rejects were identified by name and tracked to outcome — albeit retrospectively,
anecdotally (n = 2), and by critics rather than by the programme. The Warne et al. simulation is the
methodologically serious treatment, and its conclusion is a *base-rate* conclusion, not a
the-test-doesn't-work conclusion. That distinction is the interesting one for a capstone about a cutoff.

`TRANSFER`: **directly on point — cognitive, children, a fixed IQ cutoff, an accelerated/enriched programme.**

### 9.4 Partial case — an academy that quantified how many high-probability players it deselected

**Source.** "Performance characteristics of selected/deselected under 11 players from a professional youth
football academy." *International Journal of Sports Science & Coaching* (2020). DOI
[10.1177/1747954120923980](https://doi.org/10.1177/1747954120923980).

**Sample.** Two seasons of scouted 9-year-olds at one professional academy (season 1 n = 54, season 2 n = 49;
age 9.25 ± 0.46; total scouted n = 103, drawn from the ~2% of amateur-club players scouted annually).
Selected U11 n = 31; deselected n = 72.

**Findings, abstract verbatim.** "Most of the scouted players (n = 103) were **born in the first quarter of the
year (47.6%)**... A discriminant analysis resulted in a significant discriminant function (Wilks' Λ = 0.673,
df = 16 and P = 0.002) with **69.6% of players classified correctly**. In sum, the current system tends to
scout 9-year old soccer players with multiple years of soccer experience, and well-developed motor skills, who
are predominantly born in the first quarter of the year. Of those players, the ones with better physical and
technical skills, who are believed to have most potential to become elite in the future are selected.
**However, 25 of the players with a high probability of being selected were deselected.** Whether this system
is appropriate serves a broader ethical discussion within contemporary society."

That "25 of the players with a high probability of being selected were deselected" is a model-based
false-negative count — but it is measured against the *model's* prediction of selection, not against later
career outcomes. It is a measure of decision inconsistency, not of predictive error.

`TRANSFER`: physical/athletic.

### 9.5 Partial case — false negatives inferable from cohort accounting

Several studies in Section 3 measure the false-negative rate *implicitly*, by asking where senior elites came
from rather than where junior selectees went. These are the same number viewed from the other end:

- **Güllich (2014):** 69.4% of Bundesliga professionals never played a national U-team match; 11.3% were never
  in an academy at all.
- **Güllich, Barth, Macnamara & Hambrick (2023):** "82.0% of international-level seniors had not reached
  international level as U17/18 juniors"; at Junior C age the figure is 89.7%.
- **Barreiros & Fonseca (2012):** among 532 Portuguese senior internationals, "a significant number of
  athletes did not have any international experience during their development as a youth."

None of these tracked *named rejects*. They reconstructed the reject population statistically. That is weaker
than 9.1 but far more common, and it is the design most easily imitated: **count what fraction of your
eventual successes your own selection process would have missed.**

---

## 10. Everything I searched for and could NOT verify

Listed so nothing here is cited by accident.

**Numbers I found only in AI-generated or aggregator summaries, not in source text:**

1. **Gibbs, Jarvis & Dufur (2012) specific paired percentages.** "17% of All-Star and Olympic roster players
   born in Q1 vs 28% among average NHL players"; "40% in first-round draft picks declining to 28% in the
   NHL"; "career duration one season shorter for Q1 players." All from an **AI-generated Q&A widget on
   Academia.edu**. The Sage published version is paywalled and I could not read its results section. **Use
   Fumarco et al. (2017), DOI 10.1371/journal.pone.0182827, or Deaner et al. (2013), DOI
   10.1371/journal.pone.0057753, instead** — both open access, both peer reviewed, both report the reversal
   with verifiable numbers.
2. **Project 100,000 in-service performance.** "Over 80 percent of these persons completed their tour of duty
   and more than 90 percent were rated above average in their service" appears in Sticht's ERIC abstract
   (ED317710) without an inline citation I could trace. The post-service findings (ED366751) I did verify.
3. **Kelly et al., "later-maturing players in professional football academies were four times more likely to
   achieve senior professional status."** Seen only in a Frontiers review's summary of reference (20). I did
   not retrieve the primary.

**Primary sources cited secondhand that I did not retrieve:**

4. **Maddux, Stacy & Scott (1981)** — "61% [of gifted-classified children] were advantaged by a late entry to
   Grade 1." Via Musch & Grondin (2001). **This is the most directly relevant uncited claim in the whole
   document and should be chased down** — it is a relative-age effect inside gifted identification.
5. **Russell & Startup (1986)** — younger pupils' early difficulty leading to "superior performance at
   graduate level." Via Musch & Grondin (2001).
6. **Bell & Daniels (1990)** and **Azevedo, Pinto-do-O & Borges (1995)** — academic RAE persisting to
   university. Via Helsen et al. (2005).
7. **Graf (2015)** — the 48 German Nobel laureates, 42 with multidisciplinary experience, less likely to have
   won a student scholarship. Via Güllich et al. (2022). Highly relevant; worth retrieving.
8. **Bäumler (1996)** — the 68%→49% fade-out curve by age. Via Musch & Grondin (2001).
9. **Shields & Grafton (1983)**, *A natural experiment: Analysis of an almost unselected Army population*, and
   **Greenberg (1980)** — the two primary analyses of the ASVAB misnorming cohort. Both cited secondhand (via
   Sellman 2010 and Sticht 1990 respectively). **These are the primary sources for the single best item in
   this document and should be obtained from DTIC.**
10. **Eitelberg (1988)** — source of the 360,000 figure and the subgroup breakdowns.
11. **Root-Bernstein (2015)** — "IQ scores in the 120s seem to be common among Nobelists." Via Warne's blog.

**Searched for and did not find:**

12. **A current official figure for annual ASVAB administration volume.** The official ASVAB site and DTAC
    executive note describe validity and use but I found no current published annual test-taker count from a
    DoD source in this search.
13. **Project A's Table 40.4 in full.** The Campbell (2010) PDF renders the table structure but not all cell
    values in extractable text. I verified the .62–.65 range and the "close to .70" corrected figure from the
    body text only.
14. **Any study in sport showing a simple statistical rule outperforming expert scouts.** I searched
    specifically for this and did not find it. The evidence I did find (Section 8.3) shows coach judgment
    performing comparably to or better than test batteries, with the combination beating both, and with a
    documented maturation bias in the coach judgments. The strong clinical-vs-statistical result does not
    have a clean sport analogue.
15. **A talent-identification programme that prospectively tracked its named rejects to outcome by design.**
    The ASVAB misnorming (9.1) is the closest, and it was an accident, not a design. I did not find a sport,
    military, or arts programme that deliberately followed rejected applicants as a validation strategy. If
    one exists it is not surfacing under these search terms, and its absence is itself a finding worth
    stating in the brainlift.
16. **Vaeyens, Güllich, Warr & Philippaerts (2009)**, "Talent identification and promotion programmes of
    Olympic athletes," *Journal of Sports Sciences*, 27(13), 1367–1380, DOI
    [10.1080/02640410903110974](https://doi.org/10.1080/02640410903110974) — DOI verified, abstract verified,
    but the abstract reports **no specific percentages**. It is a review with field-based data in the body,
    which is paywalled and which I did not read. Its abstract claim, verbatim: "an earlier onset and a higher
    volume of discipline-specific training and competition, and an extended involvement in institutional
    talent promotion programmes, during adolescence **need not necessarily be associated with greater success
    in senior international elite sport.**"
17. **Final publication details for Berry et al., "Revisiting General Mental Ability Tests' Role in the
    Validity-Diversity Tradeoff."** Read from an author-hosted accepted manuscript; volume/issue/pages not
    confirmed.

**Verified as a real and unresolved dispute, not as a fact:**

18. **The Goldin & Rouse "50%" figure.** The paper, the DOI and the quote are all real and verified. The
    *statistical support* for the headline number is publicly contested by Pallesen and Gelman and, more
    importantly, is hedged by the authors themselves in their own abstract. See Section 7.2. Do not cite the
    50% figure without the caveat.

---

## Appendix — DOI verification log

All checked against `https://api.crossref.org/works/{doi}`; all returned HTTP 200 with matching records.

| DOI | Source |
| --- | --- |
| 10.1006/drev.2000.0516 | Musch & Grondin 2001 |
| 10.2165/00007256-200939030-00005 | Cobley et al. 2009 |
| 10.1080/02640410400021310 | Helsen et al. 2005 |
| 10.1177/1012690211414343 | Gibbs et al. 2012 |
| 10.1371/journal.pone.0182827 | Fumarco et al. 2017 |
| 10.1371/journal.pone.0057753 | Deaner et al. 2013 |
| 10.1080/17461391.2013.858371 | Güllich 2014 |
| 10.1007/s40279-023-01840-1 | Güllich, Barth, Macnamara & Hambrick 2023 |
| 10.1007/s40279-023-01957-3 | Güllich & Barth 2024 |
| 10.1080/17461391.2012.671368 | Barreiros, Côté & Fonseca 2014 |
| 10.1260/1747-9541.7.3.593 | Barreiros & Fonseca 2012 |
| 10.1111/sms.13701 | Academy graduates longitudinal 2020 |
| 10.1177/17479541241254767 | Spanish academies 10-year follow-up 2024 |
| 10.1177/1747954120923980 | Selected/deselected U11 2020 |
| 10.3389/fspor.2021.638227 | Nationwide subjective/objective 2021 |
| 10.1177/1745691620974772 | Güllich, Macnamara & Hambrick 2022 |
| 10.1037/apl0000994 | Sackett et al. 2022 |
| 10.1017/iop.2023.24 | Sackett et al. 2023 commentary |
| 10.1257/aer.90.4.715 | Goldin & Rouse 2000 |
| 10.3386/w5903 | Goldin & Rouse 1997, NBER working paper |
| 10.1037/1040-3590.12.1.19 | Grove et al. 2000 |
| 10.1177/0011000005285875 | Ægisdóttir et al. 2006 |
| 10.1016/j.intell.2020.101488 | Warne, Larsen & Clark 2020 |
| 10.31234/osf.io/g4x6r | Warne et al. 2020 preprint (resolves; DataCite 404, Crossref 200) |
| 10.1111/nyas.13054 | Simonton 2016 |
| 10.1177/0095327X261440131 | Reassessing Project 100,000 |
| 10.21236/ada269818 | Sellman, Military Aptitude Testing |
| 10.1080/02640410903110974 | Vaeyens et al. 2009 |
