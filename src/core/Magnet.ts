import { findClosestPointOnLine, findLinesIntersection } from "./Calculation";
import { Vector } from "./Path";

function findClosetReference(target: Vector, refs: MagnetReference[]): [Vector, MagnetReference | undefined] {
  let closetPos: Vector | undefined;
  let closetDistance: number = Infinity;
  let closetRef: MagnetReference | undefined;

  for (const ref of refs) {
    const result = findClosestPointOnLine(ref.source, ref.heading, target);
    const distance = target.distance(result);
    if (distance < closetDistance) {
      closetPos = result;
      closetDistance = distance;
      closetRef = ref;
    }
  }

  return [closetPos ?? target, closetRef];
}

export function magnet(target: Vector, refs: MagnetReference[], threshold: number): [Vector, MagnetReference[]] {
  const [result1, result1Ref] = findClosetReference(target, refs);

  if (result1Ref === undefined || result1.distance(target) > threshold) {
    return [target, []];
  }

  const [, result2Ref] = findClosetReference(
    result1,
    refs.filter(ref => (ref.heading % 180) !== (result1Ref.heading % 180))
  );

  if (result2Ref !== undefined) {
    const result3 = findLinesIntersection(result1Ref.source, result1Ref.heading, result2Ref.source, result2Ref.heading);

    if (result3 !== undefined && result3.distance(target) < threshold) {
      return [result3, [result1Ref, result2Ref]];
    }
  }

  return [result1, [result1Ref]];
}

export interface MagnetReference {
  source: Vector;
  heading: number;
}
