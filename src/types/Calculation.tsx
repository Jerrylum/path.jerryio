import { Keyframe, Path, Point, SamplePoint, Segment, Vector } from "./Path";
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
  index: number; // The index of the segment in the path.
  from: number; // The index of the first point in the segment.
  to: number; // The index of the first point after the segment, exclusive
}

/**
 * Represents the result of sampling a path.
 */
export interface SampleCalculationResult {
  arcLength: number; // The total arc length of the path.
  points: SamplePoint[]; // The sample points along the path.
}

/**
 * Represents the result of uniformly sampling a path.
 */
export interface UniformCalculationResult {
  points: Point[]; // The uniformly sampled points along the path.
  segmentIndexes: IndexBoundary[]; // The start and end indexes of each segment in the uniform points array.
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
export function getPathPoints(path: Path, density: NumberInUnit): PointCalculationResult {
  if (path.segments.length === 0) return { points: [], segmentIndexes: [], keyframeIndexes: [] };

  const sampleResult = getPathSamplePoints(path, density);
  const uniformResult = getUniformPointsFromSamples(sampleResult, density);
  const keyframeIndexes = getPathKeyframeIndexes(path, uniformResult.segmentIndexes);
  processKeyframes(path, uniformResult.points, keyframeIndexes);

  // ALGO: The final point should be the last end control point in the path
  // ALGO: At this point, we know segments has at least 1 segment
  const lastSegment = path.segments[path.segments.length - 1];
  const lastControl = lastSegment.last;
  // ALGO: No need to calculate delta and integral for the final point, it is always 0
  const finalPoint = new Point(lastControl.x, lastControl.y, lastSegment, 1, 0, lastControl.heading);
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
    if (pointIdxRange.from === pointIdxRange.to) continue; // ALGO: Skip empty segments
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
 * At least one point and one segment index boundary are returned. The number of segment indexes is 
 * equal to the number of segments in the path.
 * 
 * Note that if more than one headings from the samples are present between two uniform points, some of 
 * the headings will be lost.
 * 
 * The joined result is illustrated as below:
 * 
 * A B B B ... B B B C B B B ... B B B C B B B ... B B B D
 * 
 * A: The first point with heading
 * B: A point of the segment
 * C: A point with heading and isLast flag
 * D: The last point with heading and isLast flag
 * 
 * Point A and D must be the same as the first and last points of the samples.
 * 
 * @param sampleResult - The result of sampling the path.
 * @param density - The density of points to generate.
 * @returns The uniformly spaced points along the path and the start and end indexes of each segment.
 */
export function getUniformPointsFromSamples(sampleResult: SampleCalculationResult, density: NumberInUnit): UniformCalculationResult {
  /*
  ALGO: Assume:
  Samples must have at least 2 points
  Arc length must be the same as the last sample point integral, it can be 0
  */
  const samples = sampleResult.points;

  let numOfSteps = sampleResult.arcLength / density.value;
  /*
  ALGO:
  This step is important to limit the number of steps to no less than 1
   */
  if (isNaN(numOfSteps) || numOfSteps < 1) numOfSteps = 1;
  const targetInterval = 1 / numOfSteps;

  const points: Point[] = [];
  const segmentIndexes: IndexBoundary[] = [];

  let closestIdx = 1; // ALGO: should only be modified by the loop function
  let segmentFromIdx = 0;
  let segmentIdx = 0;

  function addSegment(idx: number) {
    segmentIndexes.push({ index: segmentIdx, from: segmentFromIdx, to: idx + 1 });
    segmentFromIdx = idx + 1;
    points[idx].isLast = true;
    segmentIdx++;
  }

  function addEmptySegment() {
    segmentIndexes.push({ index: segmentIdx, from: segmentFromIdx, to: segmentFromIdx });
    segmentIdx++;
  }

  function insertHeadings(headings: number[]) {
    const prevIdx = points.length - 2;
    const currIdx = points.length - 1;
    if (headings.length === 1 && currIdx >= 0) {
      points[currIdx].heading = headings[0];
    } else if (headings.length > 1 && currIdx >= 1) {
      // ALGO: Do not overwrite the heading attribute if it is already set, skip it and information loss
      if (points[prevIdx].heading === undefined) points[prevIdx].heading = headings[0];
      // ALGO: If multiple headings are given, the last one is used, the rest are ignored, information loss
      points[currIdx].heading = headings[headings.length - 1];
    }
  }

  function insertSplitFlag(splits: boolean[]) {
    const prevIdx = points.length - 2;
    const currIdx = points.length - 1;
    if (splits.length === 1 && currIdx >= 0) {
      addSegment(currIdx);
    } else if (splits.length > 1 && currIdx >= 1) {
      // ALGO: Do not overwrite the isLast attribute if it is already set, skip it and information loss
      if (points[prevIdx].isLast === false) addSegment(prevIdx);
      else addEmptySegment();
      // ALGO: If multiple isLast are given, the last one is used, the rest are ignored, information loss
      // segmentIndex += splits.length - 2;
      for (let i = 1; i < splits.length - 1; i++) addEmptySegment();
      addSegment(currIdx);
    }
  }

  function loop(t: number) {
    const integral = t * sampleResult.arcLength;

    const sampleHeadings: number[] = [];
    const sampleSplits: boolean[] = [];

    let heading: number | undefined;
    while (closestIdx + 1 < samples.length && samples[closestIdx + 1].integral <= integral) {
      closestIdx++;
      const sample = samples[closestIdx];
      if (sample.heading !== undefined) sampleHeadings.push(sample.heading);
      if (sample.isLast) sampleSplits.push(true);
    }

    const p1: SamplePoint = samples[closestIdx - 1];
    const p2: SamplePoint = samples[closestIdx];
    const pRatio = (integral - p1.integral) / (p2.integral - p1.integral);
    const p3X = p1.x + (p2.x - p1.x) * pRatio;
    const p3Y = p1.y + (p2.y - p1.y) * pRatio;
    const p3Delta = p1.delta + (p2.delta - p1.delta) * pRatio;
    // ALGO: pRatio is NaN/Infinity if p1 and p2 are the same point or too close
    const useRatio = !isNaN(pRatio) && pRatio !== Infinity;
    const p3: Point = useRatio ? new Point(p3X, p3Y, p2.ref, p2.t, 0, heading) : new Point(p1.x, p1.y, p2.ref, p2.t, 0, heading);

    // ALGO: Use point delta as bent rate by default,
    // point delta is NaN if the first point is the same as the second point, otherwise it is always positive
    p3.bentRate = useRatio ? p3Delta : 0;

    points.push(p3);

    insertHeadings(sampleHeadings);
    insertSplitFlag(sampleSplits);
  }

  for (let t = 0; t < 1; t += targetInterval) {
    loop(t);
  }
  if (closestIdx + 1 !== samples.length) loop(1);

  // ALGO: The first point should have heading information, but closestIdx is set to 1 at the beginning so it is not included
  // ALGO: This also overwrites the heading of the first point if it is already set
  points[0].heading = samples[0].heading;
  // ALGO: The last point should have isLast flag, and has the exact same position as the last sample point
  // ALGO: Usually the xy is close enough, we manually set it to the same value
  points[points.length - 1].setXY(samples[samples.length - 1]);

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
 * C: The last point of the segment with heading and isLast flag,
 *    also the first point of the next segment
 * D: The last point of the last segment with heading and isLast flag
 * 
 * At least two points are returned.
 * 
 * The path arc length must be the same as the last point integral.
 * 
 * @param path The path to calculate
 * @param density The density of points to generate
 * @returns The sample result of the path
 */
export function getPathSamplePoints(path: Path, density: NumberInUnit): SampleCalculationResult {
  // ALGO: The density of points is NOT uniform along the curve, and we are using this to as the bent rate to control the speed by default
  const rtn: SamplePoint[] = [];
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
 * And the last point is marked as the last point of the segment with flag isLast = true.
 * 
 * Note that the last sample is manually added to the result.
 * This is because the last sample from getBezierCurvePoints() is not exactly the same as the last control point with t value 1.
 * 
 * @param segment The segment to calculate
 * @param density The density of points to generate
 * @param prevIntegral The previous integral added to the total distance
 * @returns The sample points of the segment, at least 2 points are returned
 */
export function getSegmentSamplePoints(segment: Segment, density: NumberInUnit, prevIntegral = 0): SamplePoint[] {
  // ALGO: Calculate the target interval based on the density of points to generate points more than enough
  const targetInterval = density.to(UnitOfLength.Centimeter) / 200;

  // The density of points is NOT uniform along the curve
  const points: SamplePoint[] = getBezierCurvePoints(segment, targetInterval, prevIntegral);

  points[0].heading = segment.first.heading;

  const lastPoint = points[points.length - 1];
  const lastControl = segment.last;
  const distance = lastPoint.distance(lastControl);
  const integralDistance = lastPoint.integral + distance;
  const finalPoint = new SamplePoint(lastControl.x, lastControl.y, distance, integralDistance, segment, 1, segment.last.heading);
  finalPoint.isLast = true;
  points.push(finalPoint);

  /*
  ALGO:
  Each segment in the path has a different length, It is called non-uniform spline.

  The target interval is 1 divided by the number of points.
  We calculate the target interval based on the density of points to generate points more than enough.
  For example the target interval with point density set to 1 centimeter is 0.005, which means 200 points are generated.

  However, we still have to remember the path is a non-uniform spline.
  A shorter segment with a smaller arc length and a longer segment with a larger arc length have the same number of samples points.
  The delta value of the points of the longer segment should be larger than the delta value of the points of the shorter segment.
  The scale of the delta value is different for each segment.

  Therefore, we have to adjust the delta value of the points of every segment to have the same scale.  
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
 * Calculates the sample points of a bezier curve segment
 * 
 * The x and y value of the first sample is exactly the same as the first control point.
 * But the x and y value of the last sample is not exactly the same as the last control point.
 * 
 * @param segment The segment to calculate
 * @param interval 1 divided by the number of points to calculate
 * @param prevIntegral The previous integral added to the total distance
 * @returns The sample points of the segment
 */
export function getBezierCurvePoints(segment: Segment, interval: number, prevIntegral = 0): SamplePoint[] {
  let points: SamplePoint[] = [];

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
    points.push(new SamplePoint(point.x, point.y, delta, totalDistance += delta, segment, t));
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

export function firstDerivative(segment: Segment, t: number): Vector {
  if (segment.controls.length === 2) {
    const vec = segment.controls[1].subtract(segment.controls[0]);
    return new Vector(vec.x, vec.y);
  } else if (segment.controls.length === 4) {
    const x =
      3 * (segment.controls[1].x - segment.controls[0].x) * (1 - t) * (1 - t) +
      6 * (segment.controls[2].x - segment.controls[1].x) * (1 - t) * t +
      3 * (segment.controls[3].x - segment.controls[2].x) * t * t;

    const y =
      3 * (segment.controls[1].y - segment.controls[0].y) * (1 - t) * (1 - t) +
      6 * (segment.controls[2].y - segment.controls[1].y) * (1 - t) * t +
      3 * (segment.controls[3].y - segment.controls[2].y) * t * t;

    return new Vector(x, y);
  } else {
    return new Vector(0, 1);
  }
}

export function toHeading(vec: Vector) {
  const canvasDegree = 90 - Math.atan2(vec.y, vec.x) * 180 / Math.PI;
  return canvasDegree < 0 ? canvasDegree + 360 : canvasDegree;
}

/**
 * Calculates the derivative heading needed to turn from an original heading to a target heading.
 * The derivative heading is the shortest angle between the two headings, which can be positive or negative.
 * @param original The original heading in degrees [0, 360)
 * @param target The target heading in degrees [0, 360)
 * @returns The derivative heading in degrees (-180, 180]
 */
export function toDerivativeHeading(original: number, target: number) {
  const high = 360;
  const half = high / 2;

  const targetHeading = target % high;
  const delta = (original - targetHeading + high) % high;

  return delta > half ? high - delta : -delta;
}
