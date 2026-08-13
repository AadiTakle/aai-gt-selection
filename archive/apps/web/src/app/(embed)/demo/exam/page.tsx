import { PreviewExam } from '@/components/exam/preview-exam';

/**
 * The screener, reachable in a deployed build.
 *
 * ══ WHY THIS ROUTE HAD TO EXIST ═══════════════════════════════════════════════════════════════════
 *
 * Nothing about the exam needed a server, and yet a deployed build had no path to it. `/family/exam`
 * awaits `requireRole(['family'])`, which needs working Supabase auth, and the hosted demo runs
 * against a placeholder project. `/dev/family-preview/exam` calls `notFound()` when `NODE_ENV` is
 * production, which is correct for a dev preview and fatal for a demo. So the one surface a reviewer
 * wants to see was the one surface a build could not serve.
 *
 * `PreviewExam` itself is a client component that reads a synthetic name out of localStorage and
 * POSTs results to the in-memory results table. It already declares that it is shared by the
 * authenticated and unauthenticated routes "so the two never diverge", so mounting it here adds no
 * third variant of the exam — it is the same component the other two render.
 *
 * ══ WHY IT IS NOT BEHIND A LOGIN ══════════════════════════════════════════════════════════════════
 *
 * Same reasoning as `(embed)/about-the-test`, which is also deliberately ungated: the reader is
 * someone deciding whether the product is for them. There is no child-specific data here to protect.
 * The name comes from a synthetic wizard state, the items are synthetic, and the result is discarded
 * with the in-memory table. Gating it would hide it from exactly the person it is for.
 *
 * ══ WHAT IT DOES NOT DO YET ═══════════════════════════════════════════════════════════════════════
 *
 * This still runs the app's own adaptive engine over its bundled banks, not the deployed question
 * library. Its platform app is registered and approved for all 36 servable types; the flag that swaps
 * item source, marking and the debug dock over to the platform is separate work. Until then, treat
 * the numbers on the debug dock as a demonstration of the mechanism rather than as the library's.
 */
export default function DemoExamPage() {
  // Back to the landing page rather than `/family/dashboard`, which would bounce a demo visitor into
  // a login they have no account for.
  return <PreviewExam dashboardHref="/" />;
}
