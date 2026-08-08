/**
 * The three reasoning stations, as things standing on the ranch.
 *
 * The whole directory reaches `Game.tsx` through these two names and nothing else:
 *
 *   <Stations onEngage onLeave engaged live onGrant />   mounted inside the <Canvas>
 *   STATION_SOLIDS                                       concatenated with world/Buildings' SOLIDS
 *
 * `Stations.tsx` carries the design notes — what these replace, why pointer lock is never released, and
 * the two things the keeper controller has to do while a station is engaged.
 */
export { Stations } from './Stations';
export { STATION_SOLIDS, SITES, dockPoint, siteFor, type StationSite } from './sites';
