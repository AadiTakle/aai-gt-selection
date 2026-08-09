import * as THREE from 'three';
import { FAMILIES } from '/Users/alphaintern/gt-dev-view/screener/apps/sanctuary/game/contract';
import { featureGeometry } from '/Users/alphaintern/gt-dev-view/screener/apps/sanctuary/game/slimes/crests';
import { gumdropGeometry } from '/Users/alphaintern/gt-dev-view/screener/apps/sanctuary/game/slimes/gumdrop';

function bb(g: THREE.BufferGeometry | null, off?: readonly [number,number,number]) {
  if (!g) return null;
  g.computeBoundingBox();
  const b = g.boundingBox!.clone();
  if (off) b.translate(new THREE.Vector3(off[0],off[1],off[2]));
  return b;
}
for (const stage of ['crested','warden'] as const) {
  console.log(`\n===== ${stage} =====`);
  console.log('family        bodyH  bodyHW | trimTop glazeTop auraTop | totalH  across');
  for (const f of FAMILIES) {
    const bake = gumdropGeometry(f);
    const ft = featureGeometry(f, stage);
    const box = new THREE.Box3();
    const bodyB = bb(bake.geometry)!; box.union(bodyB);
    const t = bb(ft.trim); if (t) box.union(t);
    const g = bb(ft.glaze); if (g) box.union(g);
    const a = bb(ft.aura, ft.auraOrigin); if (a) box.union(a);
    const across = Math.max(box.max.x-box.min.x, box.max.z-box.min.z);
    const tall = box.max.y-box.min.y;
    console.log(
      `${f.padEnd(13)} ${bake.height.toFixed(2)}   ${bake.halfWidth.toFixed(2)}  | ` +
      `${(t?t.max.y.toFixed(2):'  - ').padStart(5)}  ${(g?g.max.y.toFixed(2):'  - ').padStart(6)}  ${(a?a.max.y.toFixed(2):'  - ').padStart(6)} | ` +
      `${tall.toFixed(2)}   ${across.toFixed(2)}   (fitTall=${(1.4/tall).toFixed(2)} fitAcross=${(1.46/across).toFixed(2)})`
    );
  }
}
