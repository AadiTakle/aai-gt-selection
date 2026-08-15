# Proposal: the Starting-Point Map

**What it is.** A short assessment that tells Timeback where to begin teaching each student, per
subject and per subtopic, in about seventy questions.

**Status.** Proposal. A working prototype exists at `../../frontier-demo/`. The research behind it is
in `../../brainlifting/placement-and-dosing-brainlift/`.

---

## The problem

GT decides where a student starts in Timeback from their MAP scores, with CogAT gating admission.
Both instruments do their jobs. Neither produces the thing Timeback needs.

MAP returns one number per subject. Instruction runs on skills. A real student's knowledge is uneven,
and one number is a straight line drawn through uneven knowledge. The number is accurate. It is the
wrong shape for the decision it is being used to make.

Crystal described the failure in the August 3 call: a grade-7 student who "hit like 99 percentiles on
all his MAP screeners" and is "still struggling in grade three, four coursework." Her own diagnosis of
why:

> "You could be phenomenal at algebra, but really terrible at geometry. So it might skew your math
> score, but you might actually have huge gaps here."

MAP does report sub-scores, and they are not where this decision can be made. The independent Virginia
validation concluded MAP does not meet professional standards at the level of instructional sub-areas,
with sub-area reliabilities around .90 to .92 against .97 to .98 for the overall score. The subject
number is trustworthy. The subtopic numbers under it are not.

Three things follow from placing on a subject average.

**Gaps enter instruction unlabeled.** A student placed on their average starts above their real level
in the subtopics where they are weak. Everything taught after that sits on skills they do not have.
Timeback will find those holes eventually from the student's own work, and the student pays for the
delay in repeated failure and wasted sessions.

**Nobody can verify the mandate.** MIT-by-8 requires two grade levels a year at an A level. You cannot
confirm a student covered two grade levels without knowing which level they started from in each
subject. An average moves for reasons that have nothing to do with the subtopics where the student was
behind.

**The obvious fix is unaffordable.** A full mastery placement would answer all of this. It runs about
six hours, and the interns raised the objection in the same call: no child stays motivated through it.
Crystal asked for the thing in between: "if there was a way that we could test true grade levels
without doing full mastery placements."

One more problem sits underneath all three, and Crystal raised it twice without being prompted. A
student can have grade-8 vocabulary and grade-4 decoding. When the math content has to be read, that
student looks like a weak math student. Asked whether such children then struggle on Timeback, she
said: "Not necessarily, but it doesn't allow them to show off what they know either."

## The proposed solution

A short assessment, roughly seventy questions across Math, Reading, Language and Science, that reports
where to begin teaching in each subject *and each subtopic*, hands that to Timeback as a starting
point, and then gets out of the way.

### How it works

Three ideas. No math required to follow them.

**Skills are laid out as a map, not a ladder.** Every skill lists what it depends on. You cannot solve
systems of equations without being able to multiply. Those dependencies are facts about the content,
not guesses about the student.

**Each skill carries a probability, not a score.** All 110 or so skills hold a running estimate of how
likely it is that the student has that skill. The estimate opens at whatever their enrolled grade
suggests, which is deliberately weak information, because the premise of the whole product is that
enrolled grade says little about what a child knows.

**One answer settles many skills.** A correct answer raises confidence in everything that skill
depends on. A wrong answer lowers confidence in everything built on top of it. So the tool asks the
question that settles the most other questions. That makes it a search through the map instead of a
climb up a scale, and it is the one thing a single score cannot do.

### What it produces

For every subject and every subtopic: the named skill to start teaching at, which skills are already
held, which are still unknown, and how confident the tool is. It goes to Timeback as a data payload,
and that payload carries its own expiry. Its authority ends once Timeback has two or three observations
of its own per skill, because at that point Timeback knows more than we do.

On simulated students the prototype settles four subjects and thirteen subtopics in about 72 questions,
agrees with hidden ground truth about 94% of the time, and settles roughly 85% of skills without ever
asking about them directly. It catches about 2.4 subtopics per student sitting more than a grade below
what the subject average implies. That is Crystal's algebra-versus-geometry case, reproduced and caught.

### What it does not do

Each of these is a decision with evidence behind it, not a gap.

- **No time allocation.** No minutes per subject. It reports where to start and stops there.
- **No learning-rate figure.** Crystal asked for one. The evidence says not to give her one, and the
  disagreement is laid out below instead of buried.
- **No cognitive score, learner type, or learning-style match.**
- **No replacement for MAP or CogAT.** It runs alongside both.

That last point settles Joe's constraint. The ban is on GT building a cognitive-abilities instrument to
replace the CogAT, for discrimination and PR reasons. This measures whether a student can do specific
curriculum skills, which is the category MAP occupies rather than the one CogAT occupies. It sits
outside the decision Joe made.

## The evidence

Full sourcing is in the companion BrainLift. This is the argument in order.

### The variance sits in the skills, not in the students

The largest study of its kind covers 1.3 million practice records across 27 datasets in math, science
and language. It measures how much students differ from each other and how much individual skills
differ from each other. Students differ by 0.018 on the measure used. Skills differ by 0.102, with a
spread seven times larger. The useful question is which skills a student is short on, not what kind of
learner they are.

### Prior knowledge in the subject is the only student property that has ever changed how to teach

This has been tested four times under four names, with different methods and populations, and the
answer keeps coming back the same.

- The research program built to find aptitude-treatment interactions concluded that a few replicate and
  none are usable in practice. Cronbach's explanation is structural: any interaction can be moderated
  by an untested higher-order one, so we "enter a hall of mirrors that extends to infinity."
- The strictest published test of matching instruction to learning style found one qualifying study in
  an enormous literature.
- The special-education version of the idea ran nationally. Designing interventions from
  cognitive-processing measures returned g = 0.17. Designing them from the academic skill itself
  returned 0.43 and 0.48. Its own evaluators warned it "may result in many children receiving
  instruction that is not optimally matched to their specific needs."
- A six-year study of 3,530 students found intelligence predicted where a student stood at a
  coefficient of 4.72, and predicted six years of growth at 0.24 with p = .88.

The one moderator that did replicate is prior knowledge in the specific domain. The two major camps on
how hard to make instruction disagree with each other and both condition the answer on that variable.
Neither conditions it on general ability. This is why the product reports skills held and skills
missing, with no student trait of any kind attached.

### An up-front estimate is worth something, for a short window

A platform's own model predicts at chance on a student's first attempt at a skill (AUC 0.49), reaches
0.63 on the second, and hits its permanent plateau of 0.68 by the third. Before any observation exists,
a platform is guessing from population averages. A prior built from a single in-system answer beat
standard knowledge tracing in 30 of 42 topics, so that guess is cheap to improve on.

Two to three observations per skill is the whole window. That is the honest ceiling on this product's
authority, and it is why the handoff payload expires instead of persisting.

### The one thing it does that in-platform observation cannot

It can see above the grade-level ceiling. Half the 7th graders in a talent search scoring 500 to 800 on
the math SAT knew more algebra before studying it than half their classmates knew after a full year of
the course. One 12-year-old took a 40-item Algebra I test where 32 correct is excellent for a student
who has finished the year, and made no errors. A grade-level instrument cannot report that at any
precision, and GT draws its entire population from that slice.

The operating rule from that same source is the product's rule: "Avoid trying to teach students what
they already know."

### Better placement pays through access, not through accuracy

This finding decides what we should be claiming. In the only randomized trial that moved students both
directions on a better placement rule, 12,796 students across seven colleges, students moved up gained
about 8 points on completing college-level work and students moved down lost 5 to 8. Those are mirror
images. If the rule were genuinely more accurate, moving a student down to their supposedly correct
level should have helped them. The evaluators concluded that "greater access to college-level courses
rather than greater placement accuracy may be the mechanism."

Accuracy also does badly on its own terms. Purpose-built placement tests explain about 1% of the
variation in English course outcomes and 13% in math, against 11% for an ordinary high school record,
which won all 36 comparisons in one statewide study. A rich algorithm using test scores, school
background and motivation proxies recovered about 15% of severe misplacement. The errors run
three-to-one in math and six-to-one in English toward holding back students who would have passed.

So this should not be pitched as more accurate than MAP. MAP's marginal reliability is around .95 and
that is an argument we would lose. Pitch it on resolution, and on putting students into harder material
they can actually handle.

### Grouping precisely by current standing works, and it helps every level

A randomized study across 121 primary schools raised scores 0.14 to 0.18 SD over 18 months by assigning
students to classes on initial achievement. The top half gained 0.19 SD and the bottom half 0.16 SD,
statistically indistinguishable. The effect was still 0.16 SD a year after the program ended, while a
class-size reduction in the same setting produced 0.09 SD that disappeared within a year.

The grain decides the payoff. Within-class grouping returns 0.19 to 0.30, single-subject cross-grade
grouping 0.26, and grouping for gifted students 0.37. Sorting whole classes by general ability returns
0.04 to 0.06. Same content-over-trait pattern as the section above, and it is the argument for going
all the way down to subtopics.

### Why it reports no time split

Adding time to a subject is the weakest lever in the evidence. Measured carefully it is worth about
0.17 SD while it is being applied, loses half of that within a year of the extra time stopping and two
thirds within two, and produces no detectable effect on whether the student ever completes the later
courses in that subject. It goes negative past roughly 500 weekly minutes. It is also never free. In
the study where math time was doubled, the hour came out of art and music, and students the policy
never targeted saw grades fall .10 to .18 points and failure rates rise four points.

Nothing in the literature has tested allocation between subjects. And the same input means different
things in different subjects: expected fall-to-spring gains in Grade 4 reading run 9.6, 8.2 and 6.7
across the 25th, 50th and 75th starting percentiles, against 11.1, 11.0 and 10.9 in Grade 4 math.
Starting behind in reading predicts much faster growth. Starting behind in math predicts almost nothing
extra. Any rule that reads "how far behind" and returns "more time" therefore becomes two different
policies, and nobody chose either one.

A time split presented as a finding would be the easiest thing in this proposal to knock down.

### Why it reports no learning rate

Crystal asked for this directly: "the answer is how fast they learn. Plain and simple would be
extremely helpful." The evidence points the other way, and this is a disagreement worth having in the
open.

From the same 1.3 million records: reaching 80% correct takes 13.13 practice opportunities for a
student in the lower half on starting knowledge, against 3.66 for the upper half. Split by rate
instead, it is 7.89 against 6.94. A slower learner needs about one extra opportunity. A student with a
lower starting point needs about ten. Measuring rate means measuring the small signal and skipping the
large one.

Rate also fails to behave like a property of a person. Fitted learning slopes in the same people did
not correlate between verbal and spatial material, and those authors concluded there is "no
material-independent learning ability that influences rate of learning." Slopes retest at .34 against
.53 for starting level. And the estimate is fragile in exactly the conditions a short assessment
creates: capping practice at the first ten opportunities inflates student rate variance by a median of
118%, and by 233% in the short-practice group, while moving the starting-knowledge estimate by 1.5%.

A rate measured per subject, over a long enough run of observations, may turn out to be defensible.
Nobody has published how long is long enough. A rate pulled from a seventy-question assessment would be
manufacturing the differences it reports.

## How to validate it

Four tests, cheapest first. The first two run on data GT and Timeback already have.

**1. Measure what one carried gap costs to repair.** The prototype does not claim a win. It reports a
break-even: above roughly 8 items to repair one prerequisite gap that an average-based placement
skipped, resolving subtopics pays for itself. Below that, the subject average is enough. Nobody has
published that number and Timeback's logs contain it. Answering it takes a database query and about a
day, and it decides whether the product is worth making.

**2. Check it retrospectively against students Timeback has already placed.** Take the roughly 350 GT
Anywhere students with MAP history and Timeback progress. Wherever the map would have flagged a
subtopic more than a grade below the subject average, check whether Timeback later hit a gap there.
That produces a hit rate against real children and costs no student time.

**3. Measure items and completion on real students, by age band.** Seventy-two questions is a result
about an algorithm, not about children. The real figures are items needed to reach a stable answer, and
completion rate by age. K-2 will be worst on both, and it is the band Crystal says the incumbent
handles worst.

**4. Compare placements on an entering cohort.** Half initialized from the map, half from current
practice. The outcome is time to first mastery per skill, and how many gaps Timeback has to backfill in
the first term. This is the only test that measures the claim directly. It is also the most expensive,
so it goes last.

Two guards apply to all four, because both are ways this field inflates its own results. Use an outcome
measure we did not build: mastery learning scores 0.52 on tests the researchers wrote and 0.10 on
standardized tests. And use a comparison group that did not select itself in: one personalized-learning
estimate fell from 0.27 SD to about three percentile points once the cohort had less implementation
experience and fewer charter schools.

## The unknowns

### What we need from Timeback

**Its internal units.** The largest unknown by some distance. We do not know Timeback's skill list,
whether it carries prerequisite structure of its own, what it counts as mastery, or what it does with
an initial estimate when it receives one. The prototype invents its own 110 skills, which is fine for
proving the algorithm and useless for shipping. The map has to speak in Timeback's units or Timeback
will ignore it.

**What it currently uses to decide what comes next.** If Timeback already moves time between subjects
on some rule, we need to know what that rule reads. Partly so the handoff feeds it, and partly so we do
not duplicate a decision Timeback already makes better with its own data.

**Its gap-repair cost.** Listed above as validation step 1. It is also the dial the entire business
case turns on, so it belongs here too.

### What we would have to build

**A real prerequisite graph per subject.** This is most of the work. It is content work rather than
software work, and the archive contains nothing equivalent. It would come from a standards alignment or
from Timeback's own structure, then be validated. Getting it wrong is the main way this product fails
quietly.

**Item banks per skill, calibrated several grades above nominal.** Above-level is where published
instruments have their thinnest norms, and it is where GT's population spends most of its time. The
archive holds 57 generative item types, all for reasoning, which is the wrong category. Academic skill
items are new content work.

**A delivery mode that does not require reading.** For K-2, and for the grade-8-vocabulary,
grade-4-decoding student, the item cannot depend on the child reading it. That changes what the item
bank has to be, and it is the concrete version of the confound Crystal raised twice.

### What we would have to test before trusting it

**Ragged knowledge.** All of the efficiency comes from assuming that holding a skill implies holding its
prerequisites. Students who violate that assumption break the propagation, and they are exactly the
students a placement tool is most wanted for. In the prototype, raising the rate of prerequisite holes
to a quarter makes it carry more gaps forward than a subject average does. We need a real estimate of
how often real students violate the prerequisite order, per subject. This is the first thing to check.

**Where reading stops gating the other subjects.** Below some functional reading level, reading caps
what an extra hour in any other subject can return. Our working estimate is around a fourth-grade
level, and no located source establishes it. The prototype currently runs the four subjects as
independent passes, so it cannot express this at all. The version that can would let the reading result
condition how the other three are delivered.

### What GT has to decide

**Whether seats are rationed.** Unresolved from the August 3 call, and it sets which way the stopping
rule should lean. Holding a student back is the dominant error in the placement literature, running
three-to-one in math and six-to-one in English, so a tool built for a scarce-seat world should be tuned
differently from one built for an open one.

**What happens when the reading flag fires.** Crystal raised the reading-versus-content confound twice
and did not say what GT would do about it. A flag nobody acts on is not worth the items it costs to
measure.

**Whether the learning-rate question stays closed.** We argue against it now, on the evidence above. If
Timeback's logs turn out to run long enough per skill to escape the range where rate estimates inflate,
then the threshold nobody has published becomes measurable from data GT already owns, and the answer
could change. That would be a good outcome, and it would come out of GT's own data instead of a new
test.
