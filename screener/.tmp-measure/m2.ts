import * as THREE from 'three';
import { featureGeometry } from '../apps/sanctuary/game/slimes/crests';
import { gumdropGeometry } from '../apps/sanctuary/game/slimes/gumdrop';
for (const f of ['wood','air','fairy','waffle'] as const) {
  const bake = gumdropGeometry(f);
  const ft = featureGeometry(f, 'warden');
  console.log(`\n${f}: body h=${bake.height.toFixed(2)} hw=${bake.halfWidth.toFixed(2)}`);
  for (const [name, g, off] of [['trim', ft.trim, undefined], ['glaze', ft.glaze, undefined], ['aura', ft.aura, ft.auraOrigin]] as const) {
    if (!g) { console.log(`  ${name}: null`); continue; }
    g.computeBoundingBox();
    const b = g.boundingBox!.clone();
    if (off) b.translate(new THREE.Vector3(off[0], off[1], off[2]));
    console.log(`  ${name}: y ${b.min.y.toFixed(2)}..${b.max.y.toFixed(2)}  x ${b.min.x.toFixed(2)}..${b.max.x.toFixed(2)}  z ${b.min.z.toFixed(2)}..${b.max.z.toFixed(2)}  tris=${(g.index?g.index.count/3:0)}`);
  }
}
