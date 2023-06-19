import { Path, Point, PointCalculationResult, Segment, Vector } from "./Path";
import { NumberInUnit, UnitOfLength } from "./Unit";

/**
 * Calculate the sample points of the whole path, join segment results together
 * @param path The path to calculate
 * @param density The density of points to generate
 * @param result The result object to store the total distance
 * @returns The sample points of the path
 */
export function getPathSamplePoints(path: Path, density: NumberInUnit, result: PointCalculationResult): Point[] {
  // ALGO: The density of points is NOT uniform along the curve, and we are using this to decelerate the robot
  const rtn: Point[] = [];
  let pathTTD = 0; // total travel distance
  for (let segment of path.segments) {
    const [firstPoint, ...points] = getSegmentSamplePoints(segment, density, pathTTD);
    // ALGO: Ignore the first point, it is (too close) the last point of the previous segment
    if (pathTTD === 0) rtn.push(firstPoint); // Except for the first segment
    rtn.push(...points);
    pathTTD = rtn[rtn.length - 1].integral;
  }
  result.ttd = pathTTD;

  return rtn;
}

/**
 * Calculate the sample points on a bezier curve. Sample means the points are not uniformly distributed.
 * This result is then used to calculate the uniform points later.
 * 
 * The first and the last point of the result are the end control points of the bezier curve.
 * That said, they included the heading information.
 * And the last point is marked as the last point of the segment with flag isLastPointOfSegments = true.
 * 
 * @param segment The segment to calculate
 * @param density The density of points to generate
 * @param prevIntegral The previous integral added to the total distance
 * @returns The sample points of the segment
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