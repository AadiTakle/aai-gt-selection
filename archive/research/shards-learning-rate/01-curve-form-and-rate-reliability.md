# Curve Form and Rate Reliability

*Research shard: the functional form of a learning curve, and whether an individual person's rate can be estimated reliably at all.*

**General idea.** Any score that claims to measure "how fast this person learns" inherits two liabilities before it is ever computed. The first is a modelling liability: a rate is only defined relative to an assumed functional form, and the form that the field spent forty years treating as settled — the power law of practice — was established almost entirely on curves averaged over people. Averaging is not a neutral operation on nonlinear functions, and when the averaging bias is removed the individual-level winner is generally exponential rather than power, sometimes piecewise, and sometimes not a smooth decelerating curve at all. The second is a psychometric liability: a rate is a slope, a slope is a difference, and a difference carries the error variance of both measurements while typically having far less true between-person variance than either. The consequence is that individually fitted learning-rate parameters routinely land in the ICC range where measurement error dominates individual differences, and where they do achieve usable reliability it is usually because the estimator borrowed strength across people, across sessions, or across many dozens of observations per learner — which changes what the resulting number is a measurement *of*. The evidence below is drawn from human practice, cognitive-training, motor-learning, and reinforcement-learning data, with one animal-conditioning source flagged where it appears.

---

## 1. The functional form of the practice curve

**Source:** `T2` Newell, A., & Rosenbloom, P. S. (1981). Mechanisms of skill acquisition and the law of practice. In J. R. Anderson (Ed.), *Cognitive Skills and Their Acquisition* (pp. 1–55). Erlbaum.

**DOK 1 — Facts:**

- Newell and Rosenbloom examined 15 experiments spanning motor skills, perceptual and memory decisions, complex routines, and problem solving, and after averaging each data set across participants found the power function fit better than the exponential in all 15 (Newell & Rosenbloom, 1981, as re-reported in Evans, Brown, Mewhort, & Heathcote, 2018, *Psychological Review*, 125(4), 592–605).
- This result gave the power function the status of a behavioural law and was subsequently built into Instance Theory, PDP accounts, and cognitive architectures including SOAR (Evans et al., 2018, p. 592).

**DOK 2 — Summary:** The canonical power law of practice rests on a survey of 15 experiments in which every single averaged data set favoured the power function over the exponential. The uniformity of that result is exactly why it became load-bearing for a generation of skill-acquisition theory. It is also why the later discovery that averaging *manufactures* this preference is so damaging: the strength of the original evidence and the strength of the artifact have the same source.

**Link to source:** Volume DOI (2013 Routledge reissue): https://doi.org/10.4324/9780203728178 — result as reported in https://doi.org/10.1037/rev0000105

---

**Source:** `T2` Heathcote, A., Brown, S., & Mewhort, D. J. K. (2000). *The power law repealed: The case for an exponential law of practice.* Psychonomic Bulletin & Review, 7(2), 185–207.

**DOK 1 — Facts:**

- The authors fit power and exponential functions to 40 sets of data representing 7,910 learning series from 475 subjects across 24 experiments (Heathcote, Brown, & Mewhort, 2000, p. 185).
- The exponential function fit better than the power function in all of the unaveraged data sets (Heathcote et al., 2000, p. 185).
- Averaging produced a bias in favour of the power function (Heathcote et al., 2000, p. 185).
- A new function based on the exponential, APEX, fit better than a power function given an extra pre-experimental practice parameter (Heathcote et al., 2000, p. 185).

**DOK 2 — Summary:** This is the largest single body of real human practice data brought to bear on the form question, and its result is categorical rather than probabilistic: exponential beat power in *every* unaveraged data set. It simultaneously establishes the alternative form and diagnoses why the field believed otherwise. Getting the form wrong is not cosmetic — a power fit and an exponential fit to the same series imply different rate parameters and different extrapolations to trials not yet observed.

**Link to source:** https://doi.org/10.3758/BF03212979

---

**Source:** `T2` Evans, N. J., Brown, S. D., Mewhort, D. J. K., & Heathcote, A. (2018). *Refining the law of practice.* Psychological Review, 125(4), 592–605.

**DOK 1 — Facts:**

- Using hierarchical Bayesian modelling across 17 data sets, one of the two exponential laws was selected by WAIC in 15 of the 17 data sets, with only two data sets preferring a power law (Evans, Brown, Mewhort, & Heathcote, 2018, p. 601).
- A function including a *delay* parameter — permitting a slower-faster-slower learning rate rather than monotonically decelerating gains — was selected in 13 of the 17 data sets (Evans et al., 2018, p. 601).
- The delayed exponential specifically was the selected law in 11 of the 17 data sets, drawn from every task type studied (Evans et al., 2018, p. 601).
- The authors fit hierarchical models specifically because pooling information over participants provides enhanced measurement without the distortions associated with fitting to averaged data (Evans et al., 2018, p. 598).

**DOK 2 — Summary:** The most methodologically careful re-analysis to date does not restore the power law, but it also does not leave the simple exponential standing. In a clear majority of paradigms the best-supported form has an *initial delay*, meaning the assumption common to both the power and exponential laws — that improvement always proceeds at a steadily decreasing rate — is itself wrong for most tasks. Any single-parameter "rate" extracted under a no-delay assumption is therefore misspecified in the majority of paradigms tested.

**Link to source:** https://doi.org/10.1037/rev0000105

---

**Source:** `T2` Donner, Y., & Hardy, J. L. (2015). *Piecewise power laws in individual learning curves.* Psychonomic Bulletin & Review, 22(5), 1308–1319.

**DOK 1 — Facts:**

- The analysis covered 25,280 individual learning curves, each comprising 500 measurements of cognitive performance across four cognitive tasks (Donner & Hardy, 2015, p. 1308).
- A piecewise power-law model explained the individual learning curves significantly better than a single power law after controlling for model complexity (Donner & Hardy, 2015, p. 1308).
- At transition points, performance briefly dropped before the later piece surpassed the earlier one (Donner & Hardy, 2015, p. 1308).
- The transition rate was negatively associated with age even after controlling for overall performance (Donner & Hardy, 2015, p. 1308).

**DOK 2 — Summary:** With 500 observations per learner, individual curves resolve into a sequence of locally smooth segments joined at discrete strategy shifts, not one continuous function. This means a single global rate parameter is averaging across qualitatively distinct regimes within one person, in the same way that group curves average across people. It also supplies a concrete observation budget: this structure was only visible at 500 measurements per individual.

**Link to source:** https://doi.org/10.3758/s13423-015-0811-x

---

**Source:** `T2` Delaney, P. F., Reder, L. M., Staszewski, J. J., & Ritter, F. E. (1998). *The strategy-specific nature of improvement: The power law applies by strategy within task.* Psychological Science, 9(1), 1–7. Companion: `T2` Rickard, T. C. (1997). *Bending the power law: A CMPL theory of strategy shifts and the automatization of cognitive skills.* Journal of Experimental Psychology: General, 126(3), 288–311.

**DOK 1 — Facts:**

- Improvement followed a power function when learning curves were separated by the strategy the participant was using, but aggregating across strategies within a task distorted the observed function (Delaney, Reder, Staszewski, & Ritter, 1998, p. 1).
- Rickard's competing account attributes departures from a smooth practice function to discrete shifts between algorithmic computation and direct memory retrieval (Rickard, 1997, *Journal of Experimental Psychology: General*, 126(3), 288–311).

**DOK 2 — Summary:** The unit over which a practice function is well defined may be the strategy, not the task and not the person. When one learner switches strategies mid-practice, their own aggregate curve becomes a mixture, and mixtures of decelerating curves are subject to the same distortions as mixtures across people. This puts an additional condition on any individual rate estimate: it is interpretable only if the learner used one strategy throughout, which is generally unverified.

**Link to source:** https://doi.org/10.1111/1467-9280.00001 — companion account at https://doi.org/10.1037/0096-3445.126.3.288

---

**Source:** `T2` Kumar, A., Benjamin, A. S., Heathcote, A., & Steyvers, M. (2022). *Comparing models of learning and relearning in large-scale cognitive training data sets.* npj Science of Learning, 7(1).

**DOK 1 — Facts:**

- The analysis drew on 41,006,715 gameplays from a starting pool of 194,695 cognitive-training users, restricted for modelling to 19,463 and 19,694 users who had more than 50 sessions in each of two games (Kumar, Benjamin, Heathcote, & Steyvers, 2022, Methods).
- Only a model containing both a slow skill-learning process and a fast within-session task-set process, interacting, gave a general account of performance across the full range of naturally occurring inter-session intervals (Kumar et al., 2022, Results).
- Within a single session, learners gained 50–70% of asymptotic performance, while across sessions gains were slow but steady (Kumar et al., 2022, Results).

**DOK 2 — Summary:** In self-scheduled, real-world practice, observed improvement is the sum of at least two processes running on different timescales plus forgetting between sessions, and the fast component alone accounts for most of the within-session gain. A rate estimated from a short burst of practice is therefore dominated by task-set warm-up rather than durable skill. Separating the two requires observations spanning many sessions with varied gaps, not a longer single sitting.

**Link to source:** https://doi.org/10.1038/s41539-022-00142-x

---

## 2. The averaging artifact

**Source:** `T2` Estes, W. K. (1956). *The problem of inference from curves based on group data.* Psychological Bulletin, 53(2), 134–140.

**DOK 1 — Facts:**

- Estes established that a curve fitted to group-averaged data need not share the functional form of the individual curves it was computed from (Estes, 1956).

**DOK 2 — Summary:** The general result long predates the power-law dispute and is not specific to learning. It is the licence condition for every later finding in this section: absent an argument that the averaging operation preserves form, group curves carry no information about individual form.

**Link to source:** https://doi.org/10.1037/h0045156

---

**Source:** `T2` Anderson, R. B., & Tweney, R. D. (1997). *Artifactual power curves in forgetting.* Memory & Cognition, 25(5), 724–730.

**DOK 1 — Facts:**

- Using computational analysis together with reanalyses of published data, the authors demonstrated that arithmetic averaging of exponential curves can produce an artifactual power curve, particularly when there are large and systematic differences among the slopes of the component curves (Anderson & Tweney, 1997, p. 724).
- The amount of power artifact was *small* when component slopes were normally or rectangularly distributed and the performance measure was noise-free (Anderson & Tweney, 1997, p. 724).
- The artifact could be *large* depending on the shape of the noise distribution and on restrictions in the performance range (Anderson & Tweney, 1997, p. 724).

**DOK 2 — Summary:** This is the originating source for the specific claim that averaging exponentials manufactures a power law, and it is more conditional than the claim as usually repeated. The artifact is driven by heterogeneity in component slopes, noise-distribution shape, and range restriction, and is modest when those conditions are benign. The honest reading is that averaging *can* fabricate a power law under identifiable conditions, not that every observed power law is an averaging artifact.

**Link to source:** https://doi.org/10.3758/BF03211315

---

**Source:** `T2` Myung, I. J., Kim, C., & Pitt, M. A. (2000). *Toward an explanation of the power law artifact: Insights from response surface analysis.* Memory & Cognition, 28(5), 832–840. Companion: `T2` Anderson, R. B. (2001). *The power law as an emergent property.* Memory & Cognition, 29(7), 1061–1068.

**DOK 1 — Facts:**

- A geometric analysis of the relations among model-generated responses showed the power-law artifact arises from arithmetic averaging of data generated by a nonlinear model in the presence of individual differences (Myung, Kim, & Pitt, 2000, p. 832).
- In a computer-simulation study of 100 decaying traces per run — *simulated, not observed learners* — the aggregate curve's relative fit to a power function increased with intercomponent slope variability irrespective of whether the component curves were exponential, range-limited linear, range-limited logarithmic, or power (Anderson, 2001, p. 1061).

**DOK 2 — Summary:** The mechanism behind the artifact is nonlinearity plus between-unit variability, not anything specific to the exponential. The simulation result matters as a boundary condition on interpretation: because averaging drives aggregates toward power form regardless of component type, an observed group power law is not diagnostic evidence that individuals are exponential either. It only establishes that the group curve is uninformative about individual form in both directions.

**Link to source:** https://doi.org/10.3758/BF03198418 — companion at https://doi.org/10.3758/BF03195767

---

**Source:** `T2` Haider, H., & Frensch, P. A. (2002). *Why aggregated learning follows the power law of practice when individual learning does not: Comment on Rickard (1997).* Journal of Experimental Psychology: Learning, Memory, and Cognition, 28(2), 392–406.

**DOK 1 — Facts:**

- Aggregated learning data follow the power law of practice in circumstances where the underlying individual learning does not (Haider & Frensch, 2002).

**DOK 2 — Summary:** An independent demonstration, in human skill-acquisition data, that the aggregate/individual divergence is real and reproducible rather than a modelling curiosity confined to one lab's reanalysis.

**Link to source:** https://doi.org/10.1037/0278-7393.28.2.392

---

**Source:** `T2` Gallistel, C. R., Fairhurst, S., & Balsam, P. (2004). *The learning curve: Implications of a quantitative analysis.* Proceedings of the National Academy of Sciences, 101(36), 13124–13131. *(Animal conditioning data — pigeon, rabbit, rat, mouse — not human learners.)*

**DOK 1 — Facts:**

- The gradually increasing, negatively accelerated learning curve was an artifact of group averaging in six paradigms: pigeon autoshaping, delay and trace eyeblink conditioning in rabbit and rat, autoshaped hopper entry in rat, plus-maze performance in rat, and water-maze performance in mouse (Gallistel, Fairhurst, & Balsam, 2004, p. 13124).
- Individual subjects' learning curves showed an abrupt, often step-like increase from untrained to well-trained responding, at least as abrupt as psychometric functions in stimulus-detection experiments (Gallistel et al., 2004, p. 13124).
- The authors concluded that rate of learning *cannot* be estimated from the group-average curve, and that the best measure is latency to onset of responding determined for each subject individually (Gallistel et al., 2004, p. 13124).

**DOK 2 — Summary:** In these paradigms the individual learning function is not a shallow decelerating curve at all but a near-step, meaning the smooth group curve describes the *distribution of onset times across subjects* rather than the shape of anyone's learning. If that generalises even partially to human skill learning, then "rate" is the wrong parameterisation and onset latency is the estimable quantity. The strong caveat is that this is animal conditioning data; the paper does not establish the same for human practice curves.

**Link to source:** https://doi.org/10.1073/pnas.0404965101

---

**Source:** `T2` Wixted, J. T., & Ebbesen, E. B. (1997). *Genuine power curves in forgetting: A quantitative analysis of individual subject forgetting functions.* Memory & Cognition, 25(5), 731–739.

**DOK 1 — Facts:**

- Analysing forgetting functions at the level of the individual subject rather than the group, the authors found genuine power-shaped curves that were not attributable to averaging artifact (Wixted & Ebbesen, 1997, p. 731).

**DOK 2 — Summary:** Published back-to-back with the artifact paper it answers, this establishes that individual-level power curves do occur and that the artifact argument does not dissolve every power law. The domain is forgetting rather than practice, so it does not directly contradict the exponential practice findings — but it does refute the general claim that observed power form always implies averaging.

**Link to source:** https://doi.org/10.3758/BF03211316

---

## 3. Reliability of an individually estimated rate

**Source:** `T2` Woodrow, H. (1946). *The ability to learn.* Psychological Review, 53(3), 147–158. Modern re-examination: `T2` Voelkle, M. C., Wittmann, W. W., & Ackerman, P. L. (2006). *Abilities and skill acquisition: A latent growth curve approach.* Learning and Individual Differences, 16(4), 303–319.

**DOK 1 — Facts:**

- Woodrow fitted learning curves to individual records, treated the slope parameter as the best expression of ability to improve, and concluded that "the ability to learn cannot be identified with the ability known as intelligence" (Woodrow, 1946, p. 148, as quoted in Voelkle, Wittmann, & Ackerman, 2006, p. 303).
- Woodrow's conclusion that no general learning-ability factor emerged from intercorrelations among practice gains ran so counter to prevailing belief that it was either ignored or vehemently criticised (Voelkle et al., 2006, p. 303).
- Voelkle and colleagues re-examined the question with latent growth curve modelling and argued that abilities and skill acquisition are much more strongly related than commonly assumed once variance is decomposed appropriately (Voelkle et al., 2006, p. 303).

**DOK 2 — Summary:** The claim that individually measured learning rates behave badly as a trait is eighty years old and was originally established on curve-slope parameters, not crude gain scores. Woodrow's null has been treated as settled for most of that period. The modern latent-variable re-analysis argues the null was partly a measurement failure rather than a substantive absence — which is precisely the question at issue for any rate score.

**Link to source:** https://doi.org/10.1037/h0053639 — re-examination at https://doi.org/10.1016/j.lindif.2006.01.001

---

**Source:** `T2` Cronbach, L. J., & Furby, L. (1970). *How we should measure "change": Or should we?* Psychological Bulletin, 74(1), 68–80.

**DOK 1 — Facts:**

- Cronbach and Furby concluded that raw change scores are rarely useful for measuring individual change and recommended that investigators reframe their questions so that difference scores are not required (Cronbach & Furby, 1970).

**DOK 2 — Summary:** The most-cited statement of the difference-score problem, and for two decades effectively a prohibition. The underlying arithmetic is that a difference between two fallible measures accumulates the error variance of both while the true-score variance of the difference is often small. Its practical legacy is the residualised-gain approach, which removes dependence on pre-test level but does not create true-change variance where none exists.

**Link to source:** https://doi.org/10.1037/h0029382

---

**Source:** `T2` Rogosa, D., Brandt, D., & Zimowski, M. (1982). *A growth curve approach to the measurement of change.* Psychological Bulletin, 92(3), 726–748. Companion: `T2` Rogosa, D. R., & Willett, J. B. (1983). *Demonstrating the reliability of the difference score in the measurement of change.* Journal of Educational Measurement, 20(4), 335–343.

**DOK 1 — Facts:**

- Rogosa and colleagues argued that the standard indictment of the difference score confuses low reliability with the absence of individual differences in true change, and that the difference score is reliable when true change genuinely varies between people (Rogosa, Brandt, & Zimowski, 1982; Rogosa & Willett, 1983).
- They advocated replacing two-wave difference scores with individual growth curves fitted to multiwave data as the proper basis for studying change (Rogosa et al., 1982).

**DOK 2 — Summary:** This is the direct rebuttal to Cronbach and Furby and it is not a hedge: the claim is that unreliability of the difference score is a *diagnosis of the sample*, indicating everyone is changing at roughly the same rate, not a defect of the statistic. The prescription is more measurement occasions and an explicit growth model rather than abandonment of change measurement. Whether a given rate score is measurable therefore becomes an empirical question about between-person variance in true rate, answerable only with data.

**Link to source:** https://doi.org/10.1037/0033-2909.92.3.726 — companion at https://doi.org/10.1111/j.1745-3984.1983.tb00211.x

---

**Source:** `T2` Willett, J. B. (1989). *Some results on reliability for the longitudinal measurement of change: Implications for the design of studies of individual growth.* Educational and Psychological Measurement, 49(3), 587–602.

**DOK 1 — Facts:**

- Willett showed that the reliability of individually measured change depends on exactly three quantities: the magnitude of inter-individual heterogeneity in true growth, the size of the measurement-error variance, and the number of waves of data collected (Willett, 1989, p. 587).
- Dramatic increases in the reliability of change measurement can be achieved by collecting relatively few additional waves beyond the traditional two-wave design (Willett, 1989, p. 587).
- Willett cautioned that growth-rate reliability "confounds the unrelated influences of group heterogeneity in growth-rate and measurement precision" and must not be read as a property of the measuring instrument (Willett, 1989, p. 595).

**DOK 2 — Summary:** This is the design result that converts "how many observations does a rate need?" from a rule of thumb into a calculation, since the observation count enters through the sum of squared deviations of the measurement times. Two waves is the worst case and adding a small number of waves buys disproportionate reliability. The caveat is essential: a growth-rate reliability near zero can mean either a noisy instrument or a population in which everyone truly improves at the same rate, and the index cannot distinguish these.

**Link to source:** https://doi.org/10.1177/001316448904900309

---

**Source:** `T2` Jacobson, N. S., & Truax, P. (1991). *Clinical significance: A statistical approach to defining meaningful change in psychotherapy research.* Journal of Consulting and Clinical Psychology, 59(1), 12–19.

**DOK 1 — Facts:**

- Jacobson and Truax defined the Reliable Change Index as an observed pre-post difference divided by the standard error of the difference, where that standard error is derived from the test's reliability, treating change as reliable when the index exceeds roughly 1.96 (Jacobson & Truax, 1991).

**DOK 2 — Summary:** The standard operational answer to "is this individual's change bigger than measurement noise?", and it makes the dependency explicit: the threshold for believable change scales inversely with the square root of the instrument's reliability. An unreliable instrument does not merely add noise to a rate — it raises the bar for what counts as detectable improvement. It also only classifies change as real or not; it does not rehabilitate an unreliable rate estimate for ranking purposes.

**Link to source:** https://doi.org/10.1037/0022-006X.59.1.12

---

**Source:** `T2` McArdle, J. J. (2009). *Latent variable modeling of differences and changes with longitudinal data.* Annual Review of Psychology, 60, 577–605. Applied treatment: `T2` Kievit, R. A., Brandmaier, A. M., Ziegler, G., et al. (2018). *Developmental cognitive neuroscience using latent change score models: A tutorial and applications.* Developmental Cognitive Neuroscience, 33, 99–117.

**DOK 1 — Facts:**

- Latent change score models represent change as a latent variable estimated from multiple indicators, separating true change from occasion-specific measurement error rather than propagating both into a manifest difference (McArdle, 2009; Kievit, Brandmaier, Ziegler, et al., 2018).

**DOK 2 — Summary:** The principal modern remedy for difference-score unreliability, and it genuinely addresses the error-propagation half of the problem by modelling measurement error explicitly. What it cannot do is manufacture between-person variance in true change; if everyone improves at nearly the same rate, the latent slope variance is near zero and the model returns that fact rather than a usable individual score. It also requires multiple indicators per occasion, which is a heavier measurement burden than a single repeated task.

**Link to source:** https://doi.org/10.1146/annurev.psych.60.110707.163612 — tutorial at https://doi.org/10.1016/j.dcn.2017.11.007

---

**Source:** `T2` Hedge, C., Powell, G., & Sumner, P. (2018). *The reliability paradox: Why robust cognitive tasks do not produce reliable individual differences.* Behavior Research Methods, 50(3), 1166–1186.

**DOK 1 — Facts:**

- Across three studies assessing test-retest reliability of seven classic cognitive tasks — Eriksen flanker, Stroop, stop-signal, go/no-go, Posner cueing, Navon, and SNARC — reliabilities ranged from 0 to .82 (Hedge, Powell, & Sumner, 2018, p. 1166).
- The low reliabilities arose from low variance *between* individuals rather than from high measurement variance (Hedge et al., 2018, p. 1166).
- The authors showed that taking these reliability estimates into account has the potential to qualitatively change published theoretical conclusions (Hedge et al., 2018, p. 1166).

**DOK 2 — Summary:** The reliability paradox is that the property making an experimental effect robust and replicable — small between-person variability — is the same property that destroys its usefulness as an individual-differences measure. This is Rogosa's point arriving from the opposite direction and confirmed empirically on real participants. It implies a task can be excellent for demonstrating that learning occurs and simultaneously useless for ranking who learns faster.

**Link to source:** https://doi.org/10.3758/s13428-017-0935-1

---

**Source:** `T2` Enkavi, A. Z., Eisenberg, I. W., Bissett, P. G., Mazza, G. L., MacKinnon, D. P., Marsch, L. A., & Poldrack, R. A. (2019). *Large-scale analysis of test–retest reliabilities of self-regulation measures.* Proceedings of the National Academy of Sciences, 116(12), 5472–5477.

**DOK 1 — Facts:**

- Across an extensive battery, dependent variables derived from self-report surveys showed high test-retest reliability while those derived from behavioural tasks did not, a pattern that held both in the literature review and in the authors' new sample (Enkavi et al., 2019, p. 5472).
- The authors confirmed that this difference was attributable to differences in between-subject variability (Enkavi et al., 2019, p. 5472).
- Comparing types of task-derived measures, certain model parameters were found to be as stable as raw dependent variables (Enkavi et al., 2019, p. 5472).

**DOK 2 — Summary:** A large, pre-registered-scale replication of the reliability paradox across an entire measurement domain, establishing it as a property of behavioural task measures generally rather than of a few tasks. The finding that model-derived parameters were no worse than raw measures is a mild counterweight to the assumption that fitted parameters are inherently noisier. It also shows that self-report and behavioural measures of the same construct are not psychometrically interchangeable.

**Link to source:** https://doi.org/10.1073/pnas.1818430116

---

**Source:** `T2` Schaaf, J. V., Weidinger, L., Molleman, L., & van den Bos, W. (2024). *Test–retest reliability of reinforcement learning parameters.* Behavior Research Methods, 56(5), 4582–4599.

**DOK 1 — Facts:**

- Two independent cohorts (N = 69 for a two-armed bandit, N = 47 for a reversal learning task) were tested twice online with a between-test interval of five weeks (Schaaf, Weidinger, Molleman, & van den Bos, 2024, p. 4582).
- ICCs for the reinforcement-learning model parameter estimates ranged from .02 to .52 for the bandit task and from .01 to .71 for the reversal learning task (Schaaf et al., 2024, p. 4582).
- In the same participants, personality and cognitive measures achieved ICCs ranging from .67 to .93 (Schaaf et al., 2024, p. 4582).
- Because the authors' procedures were shown capable of detecting high test-retest reliability, they concluded a significant proportion of the variability must be ascribed to the participants themselves, and showed that stress and happiness partly explain within-participant variability (Schaaf et al., 2024, p. 4582).

**DOK 2 — Summary:** This is the cleanest side-by-side real number available: in the same people at the same sittings, questionnaires reached .67–.93 while fitted learning parameters bottomed out at .01–.02. The authors' attribution matters more than the numbers — the instability is located in genuine within-person fluctuation, including mood, not solely in estimator noise. If a person's learning rate genuinely moves week to week, no amount of estimator improvement makes a single-session rate a trait measure.

**Link to source:** https://doi.org/10.3758/s13428-023-02203-4

---

**Source:** `T2` Mkrtchian, A., Valton, V., & Roiser, J. P. (2023). *Reliability of decision-making and reinforcement learning computational parameters.* Computational Psychiatry, 7(1), 30.

**DOK 1 — Facts:**

- Healthy participants (N = 50; N = 47 for the winning model) completed a restless four-armed bandit twice, two weeks apart (Mkrtchian, Valton, & Roiser, 2023, Methods).
- With parameters estimated separately per session, the reward learning rate achieved ICC(A,1) = 0.60 (95% CI 0.38–0.75) and the punishment learning rate ICC(A,1) = 0.63 (95% CI 0.42–0.77) (Mkrtchian et al., 2023, Table 1).
- Estimating the correlation within a joint hierarchical Bayesian model raised these to r = 0.71 (0.53–0.84) and r = 0.85 (0.69–0.95) respectively (Mkrtchian et al., 2023, Table 1).
- The lapse parameter from the same model achieved ICC(A,1) = 0.01 (−0.08 to 0.14), and its poor recoverability placed an upper limit on its potential reliability (Mkrtchian et al., 2023, Table 1).

**DOK 2 — Summary:** The most favourable real result for individually estimated learning rates: roughly 0.60–0.63 by conventional ICC at a two-week interval, which is "good" by standard benchmarks but still means around 40% of observed variance is not stable individual difference. The jump to 0.71–0.85 under joint hierarchical estimation is large, and it is obtained by letting each person's estimate borrow strength from the group and from the other session. Within the same model and the same participants, one parameter reached 0.63 and another reached 0.01, so reliability is a property of the specific parameter, not of the task.

**Link to source:** https://doi.org/10.5334/cpsy.86

---

**Source:** `T2` Waltmann, M., Schlagenhauf, F., & Deserno, L. (2022). *Sufficient reliability of the behavioral and computational readouts of a probabilistic reversal learning task.* Behavior Research Methods, 54(6), 2993–3014.

**DOK 1 — Facts:**

- N = 40 healthy participants completed a probabilistic reversal learning task twice (Waltmann, Schlagenhauf, & Deserno, 2022, p. 2993).
- Excellent reliability for computationally derived indices was obtained only when using hierarchical estimation with empirical priors *and* including data from both sessions in the fit (Waltmann et al., 2022, p. 2993).
- The authors reported that reliability depended heavily on whether sessions were modelled separately or jointly, on the estimation method, and on which combination of parameters the model contained (Waltmann et al., 2022, p. 2993).

**DOK 2 — Summary:** Reliability here is not a fixed property of the measurement but is substantially produced by the estimator. The specific configuration that delivers excellent reliability — hierarchical fitting with empirical priors over both sessions jointly — is also the configuration in which a person's session-one estimate has been informed by their session-two data. That is legitimate for characterising stable individual differences but is unavailable to any setting that must score a single sitting prospectively.

**Link to source:** https://doi.org/10.3758/s13428-021-01739-7

---

**Source:** `T2` Moutoussis, M., Bullmore, E. T., Goodyer, I. M., Fonagy, P., Jones, P. B., Dolan, R. J., & Dayan, P. (2018). *Change, stability, and instability in the Pavlovian guidance of behaviour from adolescence to young adulthood.* PLOS Computational Biology, 14(12), e1006679.

**DOK 1 — Facts:**

- In a longitudinal sample using a widely used Go/No-Go task, model-derived Pavlovian effects had weak temporal stability while model fit itself was more stable (Moutoussis et al., 2018, p. 1).
- The authors concluded that although the computational construct correlated with important aspects of development, it does not meet conventional requirements for tracking individual development (Moutoussis et al., 2018, p. 1).
- An independent group characterised this study as having found poor reliability of both reward and punishment learning rates over a six-month interval in adolescents, in contrast to their own two-week adult findings (Mkrtchian et al., 2023, Discussion).

**DOK 2 — Summary:** Over a six-month interval in a developmental sample, learning-related parameters were not stable enough to track individuals. The contrast with the two-week adult result is confounded by interval length, population, task, and model simultaneously, and the authors of the comparison state explicitly that these factors cannot be disentangled without a study designed to do so. The practical implication is that a reliability figure is not transportable across retest interval or population.

**Link to source:** https://doi.org/10.1371/journal.pcbi.1006679

---

**Source:** `T2` Stark-Inbar, A., Raza, M., Taylor, J. A., & Ivry, R. B. (2017). *Individual differences in implicit motor learning: task specificity in sensorimotor adaptation and sequence learning.* Journal of Neurophysiology, 117(1), 412–428.

**DOK 1 — Facts:**

- Participants tested twice showed learning that was reliable at the individual level in visuomotor adaptation and in the alternating reaction time task, but *not* in the serial reaction time task (Stark-Inbar, Raza, Taylor, & Ivry, 2017, p. 412).
- Individual learning measures did not correlate between sensorimotor adaptation and sequence learning (Stark-Inbar et al., 2017, p. 412).
- Faster adaptation was associated with *lower* performance variability, whereas greater sequence learning was associated with *higher* variability and slower reaction times (Stark-Inbar et al., 2017, p. 412).

**DOK 2 — Summary:** Establishing individual-level reliability was treated by these authors as a prerequisite to be demonstrated before any individual-differences claim, and two of three tasks passed while one failed. The absence of correlation between reliably measured learning rates in two implicit motor tasks argues against a single underlying learning-speed capacity. The opposite sign of the variability-learning relationship across the two domains further indicates that "learning rate" does not denote one thing across tasks.

**Link to source:** https://doi.org/10.1152/jn.01141.2015

---

## Candidate tensions

- Cronbach and Furby (1970) hold that individual change scores are rarely usable, while Rogosa, Brandt and Zimowski (1982) and Rogosa and Willett (1983) hold that low difference-score reliability diagnoses an absence of true between-person variation in change rather than a defect in the statistic.
- Heathcote, Brown and Mewhort (2000) report that the exponential beat the power function in *all* unaveraged data sets, while Wixted and Ebbesen (1997) report genuine, non-artifactual power curves in individual-subject forgetting functions.
- Evans, Brown, Mewhort and Heathcote (2018) find a *delayed* exponential — slower-faster-slower — in the majority of paradigms, contradicting the assumption shared by both the power and plain exponential laws that improvement always decelerates monotonically.
- Donner and Hardy (2015) find that individual curves are piecewise *power* laws joined at strategy transitions, whereas Heathcote et al. (2000) and Evans et al. (2018) find exponential-family forms at the individual level.
- Gallistel, Fairhurst and Balsam (2004) find individual learning to be abrupt and step-like, so that rate is not estimable and onset latency is the correct measure, whereas the practice-curve literature treats individual learning as a smooth continuous function with an estimable rate — though the two rest on animal conditioning and human skill data respectively.
- Anderson and Tweney (1997) report the averaging artifact is small under normally or rectangularly distributed component slopes with noise-free measurement, while the artifact is frequently invoked in later literature as a general explanation for observed power laws.
- Mkrtchian, Valton and Roiser (2023) obtain ICCs of 0.60 and 0.63 for reward and punishment learning rates at two weeks in adults, while Moutoussis et al. (2018) find learning-related parameters insufficiently stable to track individuals over six months in adolescents, and Schaaf et al. (2024) obtain ICCs as low as .01–.02 at five weeks.
- Waltmann, Schlagenhauf and Deserno (2022) achieve excellent reliability through hierarchical estimation with empirical priors fit jointly over both sessions, while Schaaf et al. (2024) locate a significant share of the instability in genuine within-participant fluctuation including mood — which estimator improvements cannot remove.
- Woodrow (1946) concludes from curve-slope parameters that no general learning ability exists, while Voelkle, Wittmann and Ackerman (2006) argue via latent growth curve modelling that abilities and skill acquisition are far more strongly related than the classical null implies.
- Willett (1989) shows growth-rate reliability rises sharply with a few added waves, while Hedge, Powell and Sumner (2018) and Enkavi et al. (2019) locate the binding constraint in low between-person variance, which additional waves do not increase.
