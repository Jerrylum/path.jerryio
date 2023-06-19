import { Keyframe, Path, Point, Segment, Vector } from "./Path";
import { NumberInUnit, UnitOfLength } from "./Unit";

/**
 * Represents an index into a set of points, with an associated segment and keyframe.
 */
export class KeyframeIndexing {
  /**
   * @param index The index of the keyframe in the set of points.
   * @param segment The segment containing the keyframe, or undefined if the keyframe is not associated with a segment.
   * @param keyframe The keyframe associated with the index.
   */
  constructor(public index: number, public segment: Segment | undefined, public keyframe: Keyframe) { }
}

/**
 * Represents the start and end indexes of a segment in a set of points.
 */
export interface IndexBoundary {
  from: number; // The index of the first point in the segment.
  to: number; // The index of the first point after the segment, exclusive
}

/**
 * Represents the result of sampling a path.
 */
export interface SampleCalculationResult {
  arcLength: number; // The total arc length of the path.
  points: Point[]; // The sample points along the path.
}

/**
 * Represents the result of uniformly sampling a path.
 */
export interface UniformCalculationResult {
  points: Point[]; // The uniformly sampled points along the path.
  segmentIndexes: IndexBoundary[]; // The start and end indexes of each segment in the `points` array.
}

/**
 * Represents the result of calculating points along a path.
 */
export interface PointCalculationResult extends UniformCalculationResult {
  keyframeIndexes: KeyframeIndexing[]; // The indexes of keyframes in the `points` array.
}

/**
 * Calculates the points along a path at a uniform density.
 *
 * @param path - The path to calculate.
 * @param density - The density of points to generate.
 * @returns The calculated points, segment indexes, and keyframe indexes.
 */
export function getPathPoint(path: Path, density: NumberInUnit): PointCalculationResult {
  if (path.segments.length === 0) return { points: [], segmentIndexes: [], keyframeIndexes: [] };

  const sampleResult = getPathSamplePoints(path, density);
  const uniformResult = getUniformPointsFromSamples(sampleResult, density);
  const keyframeIndexes = getPathKeyframeIndexes(path, uniformResult.segmentIndexes);
  processKeyframes(path, uniformResult.points, keyframeIndexes);

  // ALGO: The final point should be the last end control point in the path
  // ALGO: At this point, we know segments has at least 1 segment
  const lastControl = path.segments[path.segments.length - 1].last;
  // ALGO: No need to calculate delta and integral for the final point, it is always 0
  const finalPoint = new Point(lastControl.x, lastControl.y, 0, 0, 0, lastControl.heading);
  // ALGO: No need to calculate speed for the final point, it is always 0
  uniformResult.points.push(finalPoint);

  return { points: uniformResult.points, segmentIndexes: uniformResult.segmentIndexes, keyframeIndexes };
}

/**
 * Process the given points with keyframes.
 *
 * @param path - The path being processed.
 * @param points - The points to apply the keyframes to.
 * @param keyframes - The keyframes to apply.
 */
export function processKeyframes(path: Path, points: Point[], keyframes: KeyframeIndexing[]) {
  const workingKeyframes = [new KeyframeIndexing(0, undefined, new Keyframe(0, 1)), ...keyframes];

  for (let i = 0; i < workingKeyframes.length; i++) {
    const current = workingKeyframes[i];
    const next = workingKeyframes[i + 1];
    const from = current.index;
    const to = next === undefined ? points.length : next.index;
    const responsiblePoints = points.slice(from, to);

    current.keyframe.process(path.pc, responsiblePoints, next?.keyframe);
  }
}

/**
 * Calculates the keyframe indexes for the given path and segment indexes.
 *
 * @param path - The path to calculate keyframe indexes for.
 * @param segmentIndexes - The start and end indexes of each segment.
 * @returns The keyframe indexes.
 */
export function getPathKeyframeIndexes(path: Path, segmentIndexes: IndexBoundary[]): KeyframeIndexing[] {
  // ALGO: result.segmentIndexes must have at least x ranges (x = number of segments)
  const ikf: KeyframeIndexing[] = [];

  for (let segmentIdx = 0; segmentIdx < path.segments.length; segmentIdx++) {
    const segment = path.segments[segmentIdx];
    const pointIdxRange = segmentIndexes[segmentIdx];
    // ALGO: Assume the keyframes are sorted
    segment.speedProfiles.forEach((kf) => {
      const pointIdx = pointIdxRange.from + Math.floor((pointIdxRange.to - pointIdxRange.from) * kf.xPos);
      ikf.push(new KeyframeIndexing(pointIdx, segment, kf));
    });
  }

  return ikf;
}

/**
 * Calculates the uniformly spaced points of a path from a set of sample points.
 * 
 * The joined result is illustrated as below:
 * 
 * A B B B ... B B B C B B B ... B B B C B B B ... B B B D
 * 
 * A: The first point with heading
 * B: A points of the segment
 * C: A point with heading and isLastPointOfSegments flag
 * D: The last point with heading and isLastPointOfSegments flag
 * 
 * At least one point is returned.
 * At least one segment index is returned.
 * 
 * @param sampleResult - The result of sampling the path.
 * @param density - The density of points to generate.
 * @returns The uniformly spaced points along the path and the start and end indexes of each segment.
 */
export function getUniformPointsFromSamples(sampleResult: SampleCalculationResult, density: NumberInUnit): UniformCalculationResult {
  // ALGO: Assume samples must have at least 2 points and arcLength must be greater than 0
  const samples = sampleResult.points;

  const targetInterval = 1 / (sampleResult.arcLength / density.value);

  const points: Point[] = [];
  const segmentIndexes: IndexBoundary[] = [];

  let closestIdx = 1;
  let segmentFirstPointIdx = 0;

  for (let t = 0; t < 1; t += targetInterval) {
    const integral = t * sampleResult.arcLength;

    let heading: number | undefined;
    let isLastPointOfSegments = false; // flag
    while (samples[closestIdx].integral < integral) { // ALGO: ClosestIdx never exceeds the array length
      // ALGO: Obtain the heading value if it is available
      // ALGO: the last point with heading and isLastPointOfSegments flag is not looped
      if (samples[closestIdx].heading !== undefined) heading = samples[closestIdx].heading;
      isLastPointOfSegments = isLastPointOfSegments || samples[closestIdx].isLastPointOfSegments;
      closestIdx++;
    }

    const p1 = samples[closestIdx - 1];
    const p2 = samples[closestIdx];
    const pRatio = (integral - p1.integral) / (p2.integral - p1.integral);
    const p3X = p1.x + (p2.x - p1.x) * pRatio;
    const p3Y = p1.y + (p2.y - p1.y) * pRatio;
    const p3Delta = p1.delta + (p2.delta - p1.delta) * pRatio;
    // ALGO: pRatio is NaN if p1 and p2 are the same point
    const p3 = isNaN(pRatio) ? new Point(p1.x, p1.y, p1.delta, integral, 0, heading) : new Point(p3X, p3Y, p3Delta, integral, 0, heading);

    // ALGO: Use point delta as bent rate by default, point delta is always positive
    // ALGO: By default, the bent rate is then 
    p3.bentRate = p3.delta;

    // ALGO: Create a new segment range if the point is the last point of segments
    if ((p3.isLastPointOfSegments = isLastPointOfSegments) === true) {
      segmentIndexes.push({ from: segmentFirstPointIdx, to: points.length });
      segmentFirstPointIdx = points.length;
    }

    points.push(p3);
  }

  // ALGO: The first should have heading information, but closestIdx is set to 1 at the beginning so it is not included
  points[0].heading = samples[0].heading;

  // ALGO: The last segment is not looped
  segmentIndexes.push({ from: segmentFirstPointIdx, to: points.length });

  return { points: points, segmentIndexes: segmentIndexes };
}

/**
 * Calculates the sample points of the whole path, join segment results together
 * 
 * The joined result is illustrated as below:
 * 
 * A B B B ... B B B C B B B ... B B B C B B B ... B B B D
 * 
 * A: The first point of the first segment with heading
 * B: The sample points of the segment
 * C: The last point of the segment with heading and isLastPointOfSegments flag,
 *    also the first point of the next segment
 * D: The last point of the last segment with heading and isLastPointOfSegments flag
 * 
 * At least two points are returned.
 * 
 * @param path The path to calculate
 * @param density The density of points to generate
 * @returns The sample result of the path
 */
export function getPathSamplePoints(path: Path, density: NumberInUnit): SampleCalculationResult {
  // ALGO: The density of points is NOT uniform along the curve, and we are using this to decelerate the robot
  const rtn: Point[] = [];
  let arcLength = 0; // total travel distance
  for (let segment of path.segments) {
    // ALGO: at least 2 points are returned
    const [firstPoint, ...points] = getSegmentSamplePoints(segment, density, arcLength);
    // ALGO: Ignore the first point, it is (too close) the last point of the previous segment
    if (arcLength === 0) rtn.push(firstPoint); // Except for the first segment
    rtn.push(...points);
    arcLength = rtn[rtn.length - 1].integral;
  }

  return { arcLength: arcLength, points: rtn };
}

/**
 * Calculates the sample points on a bezier curve. Sample means the points are not uniformly distributed.
 * This result is then used to calculate the uniform points later.
 * 
 * The first and the last point of the result are the end control points of the bezier curve.
 * That said, they included the heading information.
 * And the last point is marked as the last point of the segment with flag isLastPointOfSegments = true.
 * 
 * @param segment The segment to calculate
 * @param density The density of points to generate
 * @param prevIntegral The previous integral added to the total distance
 * @returns The sample points of the segment, at least 2 points are returned
 */
export function getSegmentSamplePoints(segment: Segment, density: NumberInUnit, prevIntegral = 0): Point[] {
  // ALGO: Calculate the target interval based on the density of points to generate points more than enough
  const targetInterval = density.to(UnitOfLength.Centimeter) / 200;

  // The density of points is NOT uniform along the curve
  const points: Point[] = getBezierCurvePoints(segment, targetInterval, prevIntegral);

  points[0].heading = segment.first.heading;

  const lastPoint = points[points.length - 1];
  const lastControl = segment.last;
  const distance = lastPoint.distance(lastControl);
  const integralDistance = lastPoint.integral + distance;
  const finalPoint = new Point(lastControl.x, lastControl.y, distance, integralDistance, 0, segment.last.heading);
  finalPoint.isLastPointOfSegments = true;
  points.push(finalPoint);

  /*
  ALGO:
  Each spline in the path has a different length, It is called non-uniform spline.

  The target interval is 1 divided by the number of points.
  We calculate the target interval based on the density of points to generate points more than enough.
  For example the target interval with point density set to 1 centimeter is 0.005, which means 200 points are generated.

  However, we still have to remember the path is a non-uniform spline.
  A shorter spline with a smaller arc length and a longer spline with a larger arc length have the same number of samples points.
  The delta value of the points of the longer spline should be larger than the delta value of the points of the shorter spline.
  The scale of the delta value is different for each spline.

  Therefore, we have to adjust the delta value of the points of every spline to have the same scale.  
  */

  const segmentDeltaRatio = (1 / targetInterval) / ((integralDistance - prevIntegral) / density.value);
  if (segmentDeltaRatio !== Infinity) {
    for (const point of points) {
      point.delta *= segmentDeltaRatio;
    }
  }

  // At least 2 points are returned
  return points;
}

/**
 * Calculates the length of a bezier curve segment
 * @param segment The segment to calculate
 * @param interval 1 divided by the number of points to calculate
 * @returns The length of the segment
 */
export function getBezierCurveArcLength(segment: Segment, interval: number = 0.05): number {
  let totalDistance = 0;
  let lastPoint: Vector = segment.controls[0];

  const n = segment.controls.length - 1;
  for (let t = 0; t <= 1; t += interval) {
    let point = new Vector(0, 0);
    for (let i = 0; i <= n; i++) {
      const ber = bernstein(n, i, t);
      const controlPoint = segment.controls[i];
      // PERFORMANCE: Do not use add() here
      point.x += controlPoint.x * ber;
      point.y += controlPoint.y * ber;
    }
    let delta = point.distance(lastPoint);
    totalDistance += delta;
    lastPoint = point;
  }

  return totalDistance;
}

/**
 * Calculates the points of a bezier curve segment
 * @param segment The segment to calculate
 * @param interval 1 divided by the number of points to calculate
 * @param prevIntegral The previous integral added to the total distance
 * @returns The points of the segment
 */
export function getBezierCurvePoints(segment: Segment, interval: number, prevIntegral = 0): Point[] {
  let points: Point[] = [];

  // Bezier curve implementation
  let totalDistance = prevIntegral;
  let lastPoint: Vector = segment.controls[0];

  const n = segment.controls.length - 1;
  for (let t = 0; t <= 1; t += interval) {
    let point = new Vector(0, 0);
    for (let i = 0; i <= n; i++) {
      const ber = bernstein(n, i, t);
      const controlPoint = segment.controls[i];
      // PERFORMANCE: Do not use add() here
      point.x += controlPoint.x * ber;
      point.y += controlPoint.y * ber;
    }
    let delta = point.distance(lastPoint);
    points.push(new Point(point.x, point.y, delta, totalDistance += delta));
    lastPoint = point;
  }

  return points;
}

export function bernstein(n: number, i: number, t: number): number {
  return binomial(n, i) * Math.pow(t, i) * Math.pow(1 - t, n - i);
}

export function binomial(n: number, k: number): number {
  let coeff = 1;
  for (let i = n - k + 1; i <= n; i++) {
    coeff *= i;
  }
  for (let i = 1; i <= k; i++) {
    coeff /= i;
  }
  return coeff;
}
