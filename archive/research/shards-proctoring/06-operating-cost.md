# Shard 06 — Operating cost and the review-labour constraint

*General idea: Every proctoring modality has a sticker price per exam, and that price is the smallest part of what it costs to run. The binding constraint for a small team is not the licence fee but the human labour created downstream of it: automated systems flag a large fraction of sessions, each flag has to be adjudicated by a person before it can mean anything, and the published review times are measured in tens of minutes per session. The decisive evidence in this category is that the industry's largest provider withdrew its own automated-only product line after finding that customers were not performing that review — a finding published against its own commercial interest.*

## Subcategory 6.1: What each modality costs per exam

- **Source:** Vendor and industry pricing guidance (2026); Oasis LMS exam-delivery guidance citing Assessment Systems

  - **DOK 1 — Facts:**
    - Automated proctoring, in which software flags sessions for someone else to review, is quoted across industry guidance at roughly $3–$10 per exam. *(Industry pricing guidance, 2026.)* `[vendor/grey — no methodology or sample published]`
    - Hybrid proctoring, pairing automated flagging with mandatory human review of every flag, is quoted at roughly $10–$25 per exam. *(Industry pricing guidance, 2026.)* `[vendor/grey]`
    - Live human proctoring is quoted from roughly $15–$30 per exam at the low end and $30–$100+ per exam for high-stakes certification. *(Industry pricing guidance, 2026; Oasis LMS citing Assessment Systems.)* `[vendor/grey]`
    - One live-proctoring provider's published rate is roughly $11–$25 per proctor-hour rather than per exam, which prices the modality by staff time rather than by volume. *(Examity rate cited in industry comparison, 2026.)* `[vendor/grey]`
    - A common live-proctoring staffing ratio is one proctor watching up to eight concurrent candidates. *(Industry comparison, 2026.)* `[vendor/grey — ratio asserted without observational data]`
    - Industry guidance states that hardware requirements, learner support, staff training and integration work add a further 30–50% on top of the quoted per-exam price. *(Industry pricing guidance, 2026.)* `[vendor/grey]`
  - **DOK 2 — Summary:** Price scales almost entirely with how much human attention is included, spanning roughly an order of magnitude from automated-only to live. The quoted figure is not the operating cost: the same guidance that publishes these bands also says integration, support and training add another third to a half again. Every number in this subcategory is vendor-published without methodology, and vendors selling human review have a direct commercial interest in the automated tier looking cheap and inadequate.
  - **Link to source:** [Online proctoring pricing guide](https://raccoongang.com/blog/online-proctoring-everything-you-need-know/), [Proctoring pricing comparison](https://www.proctor365.ai/affordable-pricing-guide-for-online-proctored-exam-software/), [Exam delivery mode and cost guidance](https://oasis-lms.com/post/exam-delivery-software)

## Subcategory 6.2: The review burden created by automated flagging

- **Source:** Meazure Learning operational data; Higher Education Policy Institute; industry flag-rate reporting

  - **DOK 1 — Facts:**
    - Trained professional proctors at one provider average 47 minutes reviewing each recorded exam session. *(Meazure Learning, operational figure.)* `[vendor — proprietary, methodology not published]`
    - At that rate, reviewing 100 exam sessions consumes approximately 78 staff hours. *(Arithmetic on the preceding figure.)*
    - Reviewing the flagged recordings from a single 60-minute exam sitting for a class of 150 students was reported to take approximately nine hours. *(Reported in coverage of ProctorU's 2021 product withdrawal.)* `[secondhand — reported figure, primary methodology not published]`
    - Research cited from the Higher Education Policy Institute reports academic staff spending 93.3 hours and administrative staff 176.4 hours investigating suspected misconduct per 100 exams. *(HEPI, cited in vendor material.)* `[secondhand via vendor — original HEPI publication not independently retrieved]`
    - Automated-only platforms are reported by industry sources to flag roughly 15–20% of all sessions. *(Industry comparison, 2026.)* `[vendor/grey]`
    - One provider's proprietary research reports approximately 50% of fully automated sessions being flagged for suspicious activity. *(Meazure Learning proprietary research.)* `[vendor — competitor to the automated-only tier being characterised]`
    - Reported false-positive rates for pure automated detection tools run as high as 30–50% in some industry accounts. *(Industry reporting, 2026.)* `[vendor/grey — contested, and the source sells the hybrid alternative]`
  - **DOK 2 — Summary:** Automated proctoring does not remove human labour; it relocates it downstream and multiplies it, because a flag is not a finding until a person adjudicates it. At a reported 47 minutes per session and a flag rate somewhere between 15% and 50%, the review workload for even a modest exam volume runs to tens of staff hours. Every figure here comes from parties selling human review, so the direction of bias is knowable even where the magnitude is not.
  - **Link to source:** [Total cost of low-cost remote proctoring](https://www.meazurelearning.com/resources/what-is-the-total-cost-of-low-cost-remote-exam-proctoring), [Proctoring model comparison and flag rates](https://integrityadvocate.com/resource-center/blog/online-proctoring-models-ai-live-hybrid/), [Automated flag false-positive reporting](https://proctor360.com/blog/ai-proctoring-false-positives-hybrid-solution)

## Subcategory 6.3: The review that does not happen — a vendor withdrawing its own product

- **Source:** ProctorU / Meazure Learning announcement (24 May 2021), corroborated by four independent outlets; University of Iowa audit

  - **DOK 1 — Facts:**
    - ProctorU announced on 24 May 2021 that it would no longer offer any proctoring service without a trained human proctor, eliminating its AI-only products company-wide. *(ProctorU/Meazure Learning release, 24 May 2021.)*
    - The company's analysis of its own data found that only about 11% of test sessions flagged by automated tools were reviewed by the school or testing authority. *(ProctorU, reported by Campus Technology, Higher Ed Dive, eCampus News and Inside Higher Ed.)*
    - An unrelated audit at the University of Iowa found faculty reviewed just 14% of sessions flagged by a different proctoring product. *(University of Iowa audit, reported alongside the ProctorU announcement.)*
    - The company named three deficiencies of technology-only proctoring: failure to consistently review sessions, increased opportunity to unfairly implicate test-takers, and increased instructor workload. *(ProctorU/Meazure Learning release, 24 May 2021.)*
    - The company stated that automated systems flag innocuous events, giving a barking dog and a student rubbing their eyes as examples of behaviour that generated flags. *(ProctorU, reported by Campus Technology and Higher Ed Dive.)*
    - A company founder stated that a test-taker talking to a four-year-old child during a session would be flagged for violating a no-talking rule, and that a human reviewer would not find misconduct. *(Jarrod Morgan, quoted in Inside Higher Ed, 24 May 2021.)*
    - Under the replacement model, a trained proctor plus one additional person must verify suspicious behaviour before any report reaches the instructor for a final decision. *(Higher Ed Dive, 24 May 2021.)*
    - One provider's proprietary research reports that "pop-in" proctors enter only about 2.5% of the exams they are responsible for monitoring. *(Meazure Learning proprietary research.)* `[vendor — characterising a competing delivery model]`
  - **DOK 2 — Summary:** The largest provider in the market withdrew its cheapest product line after its own data showed that roughly nine in ten flags were never looked at by anyone — a finding published against commercial interest and corroborated independently by a university audit reaching 14%. The stated failure was not that the detection was wrong but that the review step the model depends on does not happen in practice. The examples the company gave of what its software flagged — a barking dog, rubbing one's eyes, speaking to a small child in the room — describe the ordinary conditions of a home.
  - **Link to source:** [ProctorU discontinues AI-only services](https://www.meazurelearning.com/resources/proctoru-to-discontinue-exam-integrity-services-that-rely-exclusively-on-ai), [Campus Technology coverage](https://campustechnology.com/articles/2021/05/24/proctoru-gets-rid-of-ai-only-proctoring.aspx), [Higher Ed Dive coverage](https://www.highereddive.com/news/proctoru-scraps-fully-automated-remote-proctoring/600708/), [Inside Higher Ed coverage](https://www.insidehighered.com/news/2021/05/24/proctoru-abandons-business-based-solely-ai)

## Candidate tensions

- ProctorU withdrew AI-only proctoring in 2021 on the grounds that unreviewed flags are worthless, while the automated-only tier continues to be sold across the industry at $3–$10 per exam in 2026.
- Vendors selling hybrid review report automated flag rates of 15–50%; no independent measurement of flag rates at scale exists, because flag data are not published in any standardised form.
- Industry guidance prices automated proctoring as the low-cost option while the same guidance states that hidden costs add 30–50%, and separate sources put the downstream review labour at 78 staff hours per 100 exams — a cost never included in the per-exam comparison.
- A staffing ratio of one live proctor to eight candidates is asserted in industry material without observational support, yet it is the figure that determines whether live proctoring is affordable at any given volume.
- The 47-minute-per-session review figure comes from a provider whose business model depends on institutions concluding they cannot do the review themselves.
- ProctorU's stated remedy — two people verifying every flag before it reaches a decision-maker — multiplies the labour cost of the very step its data showed institutions were already skipping.
