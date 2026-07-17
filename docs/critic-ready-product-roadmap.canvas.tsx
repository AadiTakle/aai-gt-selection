import {
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Grid,
  H1,
  H2,
  Pill,
  Row,
  Select,
  Stack,
  Stat,
  Table,
  Text,
  useCanvasAction,
  useCanvasState,
  useHostTheme,
} from "cursor/canvas";

type Week = "Week 1 — Decide" | "Week 2 — Prove" | "Week 3 — Build" | "Week 4 — Break & present";

type Task = {
  id: number;
  week: Week;
  priority: "P0" | "P1" | "P2";
  task: string;
  duration: string;
  humanDays: number;
  owner: "Person A" | "Person B" | "Shared";
  ai: "High" | "Medium" | "Low";
  output: string;
  requirements: string;
  critical?: boolean;
};

const tasks: Task[] = [
  { id: 1, week: "Week 1 — Decide", priority: "P0", task: "Freeze the four-week capstone outcome, audience, non-goals, and demo standard", duration: "0.5 day", humanDays: 1, owner: "Shared", ai: "Low", output: "Signed scope statement", requirements: "R1, R8, R10", critical: true },
  { id: 2, week: "Week 1 — Decide", priority: "P0", task: "Verify current GT admissions, tuition/aid, outcome claims, applicant funnel, capacity, and available data", duration: "1–2 days", humanDays: 3, owner: "Person A", ai: "Medium", output: "GT facts brief with unknowns", requirements: "R1, R7, R8", critical: true },
  { id: 3, week: "Week 1 — Decide", priority: "P0", task: "Confirm stakeholder/data access; lock a synthetic-data fallback if access is unavailable", duration: "0.5 day", humanDays: 1, owner: "Person A", ai: "Low", output: "Access decision and fallback", requirements: "R7, R8", critical: true },
  { id: 4, week: "Week 1 — Decide", priority: "P0", task: "Generate three bounded concepts with AI factories and map each to R1–R10", duration: "1 day", humanDays: 2, owner: "Shared", ai: "High", output: "Three comparable concept cards", requirements: "R1–R10" },
  { id: 5, week: "Week 1 — Decide", priority: "P0", task: "Score concepts, select one, and record the decision and rejected alternatives", duration: "0.5 day", humanDays: 1, owner: "Shared", ai: "Medium", output: "Ratified concept and decision log", requirements: "R1–R10", critical: true },

  { id: 6, week: "Week 2 — Prove", priority: "P0", task: "Define capability, decision inputs, selection rule, boundary cases, and prohibited proxies", duration: "1–2 days", humanDays: 2.5, owner: "Person A", ai: "High", output: "Selection-rule specification", requirements: "R1, R4, R5, H1, H2", critical: true },
  { id: 7, week: "Week 2 — Prove", priority: "P0", task: "Define the counterfactual, estimand, assignment/comparison design, assumptions, and threat model", duration: "1–2 days", humanDays: 2.5, owner: "Person B", ai: "High", output: "Causal design memo", requirements: "R2, R3, H3", critical: true },
  { id: 8, week: "Week 2 — Prove", priority: "P0", task: "Choose baseline and high-ceiling outcome; define allowed and prohibited claims", duration: "1 day", humanDays: 1.5, owner: "Person B", ai: "High", output: "Measurement and claims map", requirements: "R3, R6, R10", critical: true },
  { id: 9, week: "Week 2 — Prove", priority: "P0", task: "Run simulation-based power and precision scenarios using synthetic assumptions", duration: "1 day", humanDays: 1.5, owner: "Person B", ai: "High", output: "Reproducible power notebook", requirements: "R8, H6", critical: true },
  { id: 10, week: "Week 2 — Prove", priority: "P1", task: "Define minimum applicant rights, accessibility, affordability, explanation, correction, and privacy safeguards", duration: "1 day", humanDays: 1.5, owner: "Person A", ai: "High", output: "Rights and access checklist", requirements: "R9, H4, H7, H9, H10" },
  { id: 11, week: "Week 2 — Prove", priority: "P0", task: "Run a methodologist agent red team and resolve any fatal design flaw before coding", duration: "0.5 day", humanDays: 1, owner: "Shared", ai: "High", output: "Design red-team disposition", requirements: "R2–R7, R10", critical: true },

  { id: 12, week: "Week 3 — Build", priority: "P1", task: "Create the complete student, operator, and evaluator service blueprint and clickable prototype", duration: "1 day", humanDays: 2, owner: "Person A", ai: "High", output: "Testable UX/service prototype", requirements: "R1, R8, R9" },
  { id: 13, week: "Week 3 — Build", priority: "P1", task: "Lock the minimal architecture, synthetic data model, provenance fields, and interfaces", duration: "0.5 day", humanDays: 1, owner: "Person B", ai: "High", output: "Architecture and data contract", requirements: "R7, R8" },
  { id: 14, week: "Week 3 — Build", priority: "P0", task: "Build the demo intake, evidence validation, selection-rule engine, and individualized decision trace", duration: "2–3 days", humanDays: 4, owner: "Person B", ai: "High", output: "Runnable selection prototype", requirements: "R1, R4, R5, R7", critical: true },
  { id: 15, week: "Week 3 — Build", priority: "P0", task: "Build the comparison/assignment simulation, seeded reproducibility, and audit trail", duration: "1–2 days", humanDays: 3, owner: "Person B", ai: "High", output: "Runnable counterfactual demo", requirements: "R2, R7", critical: true },
  { id: 16, week: "Week 3 — Build", priority: "P1", task: "Build evaluator export, outcome simulation, claim-boundary report, and sensitivity view", duration: "1 day", humanDays: 2, owner: "Person B", ai: "High", output: "Evaluation evidence view", requirements: "R3, R6, R10" },
  { id: 17, week: "Week 3 — Build", priority: "P0", task: "Generate acceptance, boundary, replay, accessibility, and adversarial test suites", duration: "1 day", humanDays: 2, owner: "Shared", ai: "High", output: "Automated critic-facing tests", requirements: "R1–R10", critical: true },

  { id: 18, week: "Week 4 — Break & present", priority: "P1", task: "Run five synthetic applicant journeys, including errors, accommodations, and edge cases", duration: "0.5–1 day", humanDays: 1.5, owner: "Person A", ai: "High", output: "End-to-end dry-run evidence", requirements: "R1, R5, R8, R9" },
  { id: 19, week: "Week 4 — Break & present", priority: "P0", task: "Run independent causal, family, operator, security, and scope-drift agent reviews", duration: "0.5–1 day", humanDays: 1.5, owner: "Shared", ai: "High", output: "Multi-lens critic report", requirements: "R2–R10", critical: true },
  { id: 20, week: "Week 4 — Break & present", priority: "P0", task: "Fix material findings and rerun all affected regression and replay tests", duration: "1 day", humanDays: 2, owner: "Person B", ai: "High", output: "Verified remediation record", requirements: "R1–R10", critical: true },
  { id: 21, week: "Week 4 — Break & present", priority: "P1", task: "Assemble the evidence pack: requirements traceability, assumptions, demo script, limitations, and next-stage plan", duration: "1 day", humanDays: 1.5, owner: "Person A", ai: "High", output: "Critic-ready evidence pack", requirements: "R7, R8, R10", critical: true },
  { id: 22, week: "Week 4 — Break & present", priority: "P0", task: "Rehearse and deliver the demo; explicitly show what is proven, simulated, assumed, and out of scope", duration: "0.5 day", humanDays: 1, owner: "Shared", ai: "Medium", output: "Final capstone presentation", requirements: "R7, R10", critical: true },
];

const weeks: Array<{ week: Week; goal: string; exit: string }> = [
  { week: "Week 1 — Decide", goal: "Ground truth and concept selection", exit: "One ratified concept with explicit non-goals" },
  { week: "Week 2 — Prove", goal: "Selection and causal logic", exit: "Design survives a methodologist pre-mortem" },
  { week: "Week 3 — Build", goal: "Runnable synthetic prototype", exit: "End-to-end selection and evaluation demo works" },
  { week: "Week 4 — Break & present", goal: "Adversarial verification", exit: "Material findings fixed and evidence pack delivered" },
];

const views = [
  { value: "all", label: "All 22 tasks" },
  { value: "critical", label: "Critical path only" },
  ...weeks.map((item) => ({ value: item.week, label: item.week })),
];

export default function FourWeekRoadmap() {
  const theme = useHostTheme();
  const dispatch = useCanvasAction();
  const [view, setView] = useCanvasState("four-week-roadmap-view", "all");
  const filtered =
    view === "all" ? tasks :
    view === "critical" ? tasks.filter((task) => task.critical) :
    tasks.filter((task) => task.week === view);
  const totalHumanDays = tasks.reduce((sum, task) => sum + task.humanDays, 0);

  return (
    <Stack gap={24} style={{ padding: 24, background: theme.bg.editor, minHeight: "100vh" }}>
      <Stack gap={8}>
        <Row align="start" justify="space-between" wrap gap={12}>
          <Stack gap={4} style={{ maxWidth: 820 }}>
            <H1>Four-week, two-person capstone roadmap</H1>
            <Text tone="secondary">
              A critic-ready selection prototype and causal evaluation package—built with AI factories, synthetic data, and explicit limits.
            </Text>
          </Stack>
          <Pill active>40 human-days</Pill>
        </Row>
        <Row gap={8} wrap>
          <Button variant="secondary" onClick={() => dispatch({ type: "openFile", path: "PROJECT_CHARTER.md" })}>Open charter</Button>
          <Button variant="secondary" onClick={() => dispatch({ type: "openFile", path: "docs/project-requirements.md" })}>Open requirements</Button>
          <Button variant="secondary" onClick={() => dispatch({ type: "openFile", path: "docs/DEVELOPMENT_RUBRIC.md" })}>Open rubric</Button>
        </Row>
      </Stack>

      <Callout tone="warning" title="Scope correction">
        <Text>
          Four weeks is enough for a strong prototype, simulation, test suite, and critic-facing evidence pack. It is not enough to validate a production admissions system, complete psychometric validation, use live student data safely, or estimate GT School's actual program effect.
        </Text>
      </Callout>

      <Grid columns={4} gap={16}>
        <Stat value="2" label="Team members" />
        <Stat value="4 weeks" label="Fixed elapsed time" tone="info" />
        <Stat value={totalHumanDays} label="Available human person-days" />
        <Stat value="22" label="Prioritized work items" />
      </Grid>

      <Stack gap={10}>
        <H2>Weekly critical path</H2>
        <Grid columns={4} gap={10}>
          {weeks.map((item, index) => (
            <div
              key={item.week}
              style={{
                padding: 14,
                minHeight: 128,
                border: `1px solid ${theme.stroke.tertiary}`,
                borderRadius: 6,
                background: index === 0 ? theme.fill.secondary : theme.fill.tertiary,
              }}
            >
              <Text weight="semibold" size="small">{item.week}</Text>
              <Text tone="secondary" size="small" style={{ marginTop: 10 }}>{item.goal}</Text>
              <Text tone="tertiary" size="small" style={{ marginTop: 10 }}>Exit: {item.exit}</Text>
            </div>
          ))}
        </Grid>
      </Stack>

      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader>Person A — Product and evidence</CardHeader>
          <CardBody>
            <Text size="small">Owns GT fact-finding, stakeholders, capability policy, applicant rights, UX, evidence pack, and presentation. Reviews product behavior and scope.</Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Person B — Engineering and evaluation</CardHeader>
          <CardBody>
            <Text size="small">Owns causal design, measurement, simulation, architecture, implementation, auditability, automated tests, and technical remediation.</Text>
          </CardBody>
        </Card>
      </Grid>

      <Stack gap={10}>
        <Row align="center" justify="space-between" wrap gap={12}>
          <Stack gap={2}>
            <H2>Prioritized execution register</H2>
            <Text tone="secondary" size="small">
              Human effort totals {totalHumanDays} person-days. AI effort is intentionally uncapped and parallelized.
            </Text>
          </Stack>
          <Select value={view} onChange={setView} options={views} style={{ minWidth: 220 }} />
        </Row>
        <Table
          stickyHeader
          striped
          headers={["#", "Priority", "Task", "Elapsed", "Human effort", "Owner", "AI leverage", "Required output", "Reqs"]}
          rows={filtered.map((task) => [
            task.id,
            <Pill active={task.priority === "P0"} size="sm">{task.priority}</Pill>,
            <Text weight={task.critical ? "semibold" : "normal"} size="small">{task.task}</Text>,
            task.duration,
            `${task.humanDays} pd`,
            task.owner,
            task.ai,
            task.output,
            task.requirements,
          ])}
          rowTone={filtered.map((task) => task.priority === "P0" ? "danger" : task.critical ? "warning" : undefined)}
          columnAlign={["right", "center", "left", "left", "right", "left", "center", "left", "left"]}
          style={{ maxHeight: 620 }}
        />
      </Stack>

      <Grid columns={2} gap={16}>
        <Card collapsible defaultOpen>
          <CardHeader trailing={<Pill size="sm">Deliver</Pill>}>Definition of done after four weeks</CardHeader>
          <CardBody>
            <Stack gap={9}>
              <Text size="small">A runnable synthetic-data prototype demonstrating intake, selection, comparison, audit, and evaluator output.</Text>
              <Text size="small">A defensible capability rule and causal design with explicit assumptions and claim boundaries.</Text>
              <Text size="small">A reproducible power simulation and high-ceiling measurement rationale.</Text>
              <Text size="small">Applicant-rights, access, explainability, and privacy guardrails represented in the prototype.</Text>
              <Text size="small">Automated boundary/replay tests and a resolved multi-lens critic review.</Text>
              <Text size="small">A traceable evidence pack that distinguishes proven, simulated, assumed, and future work.</Text>
            </Stack>
          </CardBody>
        </Card>

        <Card collapsible defaultOpen>
          <CardHeader trailing={<Pill size="sm">Do not claim</Pill>}>Explicitly outside four-week scope</CardHeader>
          <CardBody>
            <Stack gap={9}>
              <Text size="small">A production-ready admissions platform or authorization for live use.</Text>
              <Text size="small">Final psychometric, legal, privacy, security, or ethics approval.</Text>
              <Text size="small">Safe use of real student records unless separately authorized.</Text>
              <Text size="small">Verified GT applicant volume, authority, or operational feasibility when access is unavailable.</Text>
              <Text size="small">A measured program effect or evidence that GT School works.</Text>
              <Text size="small">Long-term elite-readiness outcomes.</Text>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <Callout tone="info" title="AI factory strategy">
        <Text>
          Run four parallel lanes: evidence verification, product/design alternatives, engineering, and adversarial testing. Humans remain responsible for GT-specific facts, stakeholder interpretation, product decisions, ethical trade-offs, and final claim language.
        </Text>
      </Callout>
    </Stack>
  );
}
