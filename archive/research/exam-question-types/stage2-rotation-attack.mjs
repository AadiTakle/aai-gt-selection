// F6 — THE CROSS-ITEM INTERSECTION ATTACK, RUN AGAINST THE ROTATING DESIGN.
//
// `docs/product/STAGE2_ROTATING_SYSTEMS.md` §9d recorded assumption A-R7: that rotation's shorter
// per-mapping exposure limits the cross-item attack. It was flagged as PLAUSIBLE AND UNMEASURED.
// This file measures it.
//
// THE ATTACK IS NOT REWRITTEN. `crossItemAttack` and `scoreItem` are imported verbatim from
// `gate-a/stage2-antileak-comparison.mjs` (PR #47), which is where F6 was defined and where the
// shipped-bank figures — pinned after 4-12 items, 100% thereafter — were produced. Only the ADAPTER
// is new, because PR #47's adapters read shipped bank content and this pool is synthesised. The
// adapter contract is PR #47's own: `allSystems`, `systemFilter`, `systemVote`, `trayOf`.
//
// TWO CHANNELS, BECAUSE A LEARNING BLOCK GIVES MORE AWAY THAN A BANK FILE DOES.
//
//   onScreen  The client knows only that the machine's output was one of the five figures. This is
//             PR #47's channel and the only one available to someone scraping a static bank.
//   reveal    The block resolves each trial in front of the child (U6/U7), so the client also knows
//             WHICH figure. A strictly stronger constraint, and the one a rotating block actually
//             hands over, since rotation only works in a block that reveals. Reporting `onScreen`
//             alone would be scoring the weaker attack against the design that invites the stronger.
//
// WHAT THE ATTACKER IS ASSUMED TO HAVE. Full knowledge of the item pool and of the algebra — every
// item's chain, input and option figures, and the ability to enumerate every bijection. That is the
// scraper's position by construction: the pool ships. The ONLY unknown is which badge means which.

import {
  crossItemAttack,
  scoreItem,
} from './gate-a/stage2-antileak-comparison.mjs';
import { createRng, mappingKey } from './stage2-rotation.mjs';

/**
 * Servable items in a depth-representative order.
 *
 * NOT `pool.items.slice(0, n)`. The pool is built depth by depth, so an unshuffled prefix is all
 * depth 1 — and a depth-1 item is 100% admissible (§9a), which under the `onScreen` channel means it
 * constrains NOTHING. Sampling the prefix would hand the attack a diet of items that carry no
 * information and report "never pins" as a property of the design.
 */
function sampleServable(pool, mapping, sample, salt) {
  const key = mappingKey(mapping);
  const servable = pool.items.filter((item) => item.answerByMapping.has(key));
  return createRng(4242, `attack|${salt}`).shuffle(servable).slice(0, sample);
}

/**
 * PR #47's adapter contract, over a rotation pool.
 *
 * `answerUnder` reads the pool's precomputed per-mapping answer table rather than re-deriving the
 * chain, which is the same predicate `buildPool` used and therefore cannot disagree with it: a
 * mapping is in the table exactly when its output lands on the slate, which is PR #47's
 * `keyUnder >= 0`.
 */
export function attackAdapter(pool, { channel = 'onScreen', truth = null } = {}) {
  if (channel === 'reveal' && truth === null) {
    throw new Error('the reveal channel needs the true mapping to say what was shown');
  }
  const truthKey = truth === null ? null : mappingKey(truth);
  const answerUnder = (item, mapping) => item.answerByMapping.get(mappingKey(mapping)) ?? null;

  return {
    optionCount: pool.items[0].content.options.length,
    trayOf: () => pool.primitives,
    allSystems: () => pool.oracle.mappings,
    systemFilter(item, systems) {
      if (channel === 'reveal') {
        const shown = item.answerByMapping.get(truthKey) ?? null;
        return systems.filter((m) => answerUnder(item, m) === shown);
      }
      return systems.filter((m) => answerUnder(item, m) !== null);
    },
    systemVote(item, systems) {
      const tally = new Map();
      for (const m of systems) {
        const key = answerUnder(item, m);
        if (key !== null) tally.set(key, (tally.get(key) ?? 0) + 1);
      }
      return item.content.options.map((o) => tally.get(o.key) ?? 0);
    },
  };
}

/** The index of the option that is correct under `mapping`, which is what `scoreItem` scores. */
export function keyIndexUnder(item, mapping) {
  const key = item.answerByMapping.get(mappingKey(mapping)) ?? null;
  return key === null ? -1 : item.content.options.findIndex((o) => o.key === key);
}

/**
 * How many items it takes to pin ONE mapping, when the attacker is not rationed.
 *
 * This is the shipped-bank comparison: PR #47 handed F6 a whole bank under one system and asked
 * after how many items the hypothesis space collapsed to one. `sample` items servable under
 * `mapping` is the same situation, so the number it returns is comparable with the published 4-12.
 * The rationing question — whether a rotating system LIVES long enough for the pin to arrive — is
 * answered by comparing this distribution against trials-per-system, not by shortening this input.
 */
export function itemsToPin({ pool, mapping, channel, sample = 60, label = 'pin' }) {
  const servable = sampleServable(pool, mapping, sample, label);
  if (servable.length === 0) return null;
  const adapter = attackAdapter(pool, { channel, truth: mapping });
  const keys = servable.map((item) => keyIndexUnder(item, mapping));
  return crossItemAttack(adapter, servable, keys, label);
}

/**
 * The attacker riding along with a real block, scored the way a session is actually experienced.
 *
 * DIFFERENT FROM `crossItemAttack` IN EXACTLY ONE RESPECT, and it has to be: PR #47's driver
 * collapses the hypothesis space over the whole bank first and scores afterwards, which is right
 * for a static bank an attacker studies before sitting down. A block is answered ONLINE — the
 * attacker must commit to trial n before trial n's own reveal arrives — so this scores before
 * filtering, in the order the block served. The scorer is PR #47's `scoreItem` unchanged, so a
 * certainty here means what a certainty means there.
 *
 * THE HYPOTHESIS SPACE RESETS AT EVERY ROTATION, which is the whole question. Nothing carries over
 * but the pool knowledge the attacker already had.
 */
export function attackBlock({ pool, block, channel = 'reveal' }) {
  const perSystem = [];
  let hits = 0;
  let scored = 0;

  for (const run of block.systems) {
    const adapter = attackAdapter(pool, { channel, truth: run.mapping });
    let systems = adapter.allSystems();
    let pinnedAt = null;
    let systemHits = 0;
    const trialScores = [];

    // The demonstration resolves before the first scored trial, so its constraint is already in
    // hand when trial 1 is answered. Including it is the stronger and more honest attacker.
    for (const seen of run.warmupServed ?? []) {
      systems = adapter.systemFilter(seen.item, systems);
    }

    run.served.forEach((seen, index) => {
      const votes = adapter.systemVote(seen.item, systems);
      const score = scoreItem(votes, keyIndexUnder(seen.item, run.mapping));
      systemHits += score.modal;
      hits += score.modal;
      scored += 1;
      trialScores.push(score.modal);
      systems = adapter.systemFilter(seen.item, systems);
      if (pinnedAt === null && systems.length <= 1) pinnedAt = index + 1;
    });

    // Split at the pin. The pinning trial itself is scored BEFORE its own reveal lands, so it
    // belongs to the unpinned side; crediting it to the pinned side would overstate the attack.
    const cut = pinnedAt ?? trialScores.length;
    const sum = (xs) => xs.reduce((a, b) => a + b, 0);
    perSystem.push({
      trials: run.served.length,
      pinnedAt,
      surviving: systems.length,
      accuracy: run.served.length === 0 ? null : systemHits / run.served.length,
      crackTrial: run.crackTrial,
      // Trials the attacker answered while still unpinned: the part of the block rotation protects.
      beforePin: cut,
      beforeHits: sum(trialScores.slice(0, cut)),
      afterHits: sum(trialScores.slice(cut)),
    });
  }

  return { accuracy: scored === 0 ? null : hits / scored, scored, perSystem };
}

/**
 * What a scrape is still worth to the NEXT child, once the mappings are redrawn.
 *
 * The severe property of the shipped design is permanence: one scrape pins the bank's system and
 * every future child is served items whose answers the attacker already holds. So the test is
 * literal — pin session A's mapping to a single survivor, then answer session B's items with that
 * survivor and score against session B's truth.
 *
 * `residual` is the control and is the number that does NOT go away: the same attacker with no
 * mapping knowledge at all, voting over the full bijection family. An attacker who retains nothing
 * from session A should score exactly that, and anything above it is transfer.
 */
export function crossSessionTransfer({ pool, sessionA, sessionB, channel = 'reveal', sample = 60 }) {
  const pinned = itemsToPin({ pool, mapping: sessionA, channel, sample, label: 'transfer' });
  if (pinned === null || pinned.collapsedAt === null) return null;

  // Re-run the collapse to recover the surviving set itself, which the driver reports only by size.
  const adapter = attackAdapter(pool, { channel, truth: sessionA });
  let systems = adapter.allSystems();
  for (const item of sampleServable(pool, sessionA, sample, 'transfer')) {
    systems = adapter.systemFilter(item, systems);
    if (systems.length <= 1) break;
  }

  const targets = sampleServable(pool, sessionB, 400, 'targets');
  const fresh = attackAdapter(pool, { channel: 'onScreen' });
  const all = adapter.allSystems();

  /**
   * Score a hypothesis set on the next session.
   *
   * PR #47 credits an all-zero vote vector as a certainty, on the reasoning that the brute force has
   * refuted the ITEM and a bank must never be flattered by one. That convention is wrong for THIS
   * question: an all-zero vector here means the attacker's stale mapping cannot key the new
   * session's item, which is the ATTACKER being refuted, not the item. Crediting it scored a stale
   * pin at 46.5% on a fresh session, which is an artefact and not transfer. A real attacker whose
   * hypothesis is refuted falls back to the full family, so that is what is scored.
   */
  const scoreSet = (hypotheses) => {
    let total = 0;
    let refuted = 0;
    for (const item of targets) {
      const keyIndex = keyIndexUnder(item, sessionB);
      const votes = fresh.systemVote(item, hypotheses);
      const usable = votes.some((n) => n > 0);
      if (!usable) refuted += 1;
      total += scoreItem(usable ? votes : fresh.systemVote(item, all), keyIndex).modal;
    }
    return { accuracy: total / targets.length, refuted: refuted / targets.length };
  };

  // THE CONTROL THAT DECIDES WHETHER A SCRAPE IS WORTH ANYTHING. A stale pin scores above the floor
  // simply because two bijections over the same five badges agree somewhere by coincidence. So the
  // comparison is not against the floor, it is against ONE MAPPING PICKED AT RANDOM AND NEVER
  // SCRAPED. If the pinned mapping does no better than the guessed one, the scrape carried nothing.
  const guessed = createRng(4242, `guess|${mappingKey(sessionB)}`).pick(all);

  const carried = scoreSet(systems);
  return {
    pinnedAfter: pinned.collapsedAt,
    survivingFromA: systems.length,
    items: targets.length,
    carried: carried.accuracy,
    /** Share of the next session's items the stale mapping cannot key at all. */
    refuted: carried.refuted,
    guessed: scoreSet([guessed]).accuracy,
    residual: scoreSet(all).accuracy,
    sameMapping: mappingKey(sessionA) === mappingKey(sessionB),
  };
}
