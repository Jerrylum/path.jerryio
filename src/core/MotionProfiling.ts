import type {
  LinearSegmentControls,
  CubicSegmentControls,
  SegmentControls,
  SegmentKeyframeKey,
  SegmentKeyframeKeyMap
} from './Path'; // adjust the path as needed
let sCurrent = -100;
let prev_t = 0;
let tim = 0;
let curSpeed = 0.001;

interface Point {
  x: number;
  y: number;
}

interface Velocities {
  linear: number;
  angular: number;
}

interface VelocityLayout {
  linear: number;
  angular: number;
  time: number;
}

const points: Point[] = [];
const velocities: VelocityLayout[] = [];
const dec_velocities: VelocityLayout[] = [];

function bezierDerivative(controlPoints: Point[], t: number): Point {
  const dx = 3 * (1 - t) ** 2 * (controlPoints[1].x - controlPoints[0].x) +
             6 * (1 - t) * t * (controlPoints[2].x - controlPoints[1].x) +
             3 * t ** 2 * (controlPoints[3].x - controlPoints[2].x);
  const dy = 3 * (1 - t) ** 2 * (controlPoints[1].y - controlPoints[0].y) +
             6 * (1 - t) * t * (controlPoints[2].y - controlPoints[1].y) +
             3 * t ** 2 * (controlPoints[3].y - controlPoints[2].y);
  return { x: dx, y: dy };
}

function bezierSecondDerivative(controlPoints: Point[], t: number): Point {
  const dx = 6 * (1 - t) * (controlPoints[2].x - 2 * controlPoints[1].x + controlPoints[0].x) +
             6 * t * (controlPoints[3].x - 2 * controlPoints[2].x + controlPoints[1].x);
  const dy = 6 * (1 - t) * (controlPoints[2].y - 2 * controlPoints[1].y + controlPoints[0].y) +
             6 * t * (controlPoints[3].y - 2 * controlPoints[2].y + controlPoints[1].y);
  return { x: dx, y: dy };
}

function speed(controlPoints: Point[], t: number): number {
  const deriv = bezierDerivative(controlPoints, t);
  return Math.sqrt(deriv.x ** 2 + deriv.y ** 2);
}

function arcLength(controlPoints: Point[], a: number, b: number): number {
  const gaussNodes = [-0.9061798459, -0.5384693101, 0.0, 0.5384693101, 0.9061798459];
  const gaussWeights = [0.2369268850, 0.4786286705, 0.5688888889, 0.4786286705, 0.2369268850];
  let length = 0.0;
  for (let i = 0; i < gaussNodes.length; i++) {
    const t = ((b - a) / 2.0) * gaussNodes[i] + (a + b) / 2.0;
    length += gaussWeights[i] * speed(controlPoints, t);
  }
  return ((b - a) / 2.0) * length;
}

function sFunction(controlPoints: Point[], t: number): number {
  return arcLength(controlPoints, 0, t);
}

function findTForS(controlPoints: Point[], sCurrent: number, deltaS: number): number {
  const tol = 1e-6;
  let t = 0.5;
  const maxIter = 20;
  for (let i = 0; i < maxIter; i++) {
    const s_t = sFunction(controlPoints, t);
    const f_t = s_t - sCurrent - deltaS;
    const f_prime_t = speed(controlPoints, t);
    if (Math.abs(f_t) < tol) break;
    t -= f_t / f_prime_t;
    t = Math.max(0, Math.min(1, t));
  }
  return t;
}

function curvature(controlPoints: Point[], t: number): number {
  const r1 = bezierDerivative(controlPoints, t);
  const r2 = bezierSecondDerivative(controlPoints, t);
  const crossProduct = Math.abs(r1.x * r2.y - r1.y * r2.x);
  const speedCubed = Math.pow(Math.sqrt(r1.x ** 2 + r1.y ** 2), 3);
  if (speedCubed < 1e-6) return 0.0;
  return crossProduct / speedCubed;
}

function findXandY(controlPoints: Point[], t: number): Point {
  const x = (1 - t) ** 3 * controlPoints[0].x +
            3 * (1 - t) ** 2 * t * controlPoints[1].x +
            3 * (1 - t) * t ** 2 * controlPoints[2].x +
            t ** 3 * controlPoints[3].x;

  const y = (1 - t) ** 3 * controlPoints[0].y +
            3 * (1 - t) ** 2 * t * controlPoints[1].y +
            3 * (1 - t) * t ** 2 * controlPoints[2].y +
            t ** 3 * controlPoints[3].y;

  return { x, y };
}

function twoDimensionalTrapVel(controlPoints: Point[], max_linear_velocity: number, max_linear_acceleration: number, deceleration_distance: number, initial_velocity: number, exit_velocity: number, timestep: number): Velocities {
  tim = timestep * 100 + tim;
  const trackWidth = 11.375;
  const acceleration_distance = (Math.pow(max_linear_velocity, 2) - Math.pow(initial_velocity, 2)) / (2 * max_linear_acceleration);
  sCurrent = sFunction(controlPoints, prev_t);
  const turn_radius = 1 / curvature(controlPoints, prev_t);
  const curvature_velocity_limit = max_linear_velocity * turn_radius / (turn_radius + trackWidth / 2);
  let linear_velocity_acceleration_limit = Infinity;
  if (sCurrent < deceleration_distance) {
    linear_velocity_acceleration_limit = curSpeed + max_linear_acceleration * timestep;
  } else if (sCurrent > acceleration_distance) {
    linear_velocity_acceleration_limit = Math.sqrt(Math.pow(exit_velocity, 2) - ((sFunction(controlPoints, 1) - sCurrent) * (Math.pow(exit_velocity, 2) - Math.pow(max_linear_velocity, 2)) / (sFunction(controlPoints, 1) - deceleration_distance)));
  }
  const desired_linear_velocity = Math.min(curvature_velocity_limit, linear_velocity_acceleration_limit, max_linear_velocity);
  const deltaS = desired_linear_velocity * timestep;
  const t = findTForS(controlPoints, sCurrent, deltaS);
  const turning_velocity_component = (curvature(controlPoints, t) * desired_linear_velocity * trackWidth) / 2;
  const newPoint = findXandY(controlPoints, t);
  points.push(newPoint);
  const newVelo: VelocityLayout = { linear: desired_linear_velocity, angular: turning_velocity_component, time: tim };
  velocities.push(newVelo);
  prev_t = t;
  curSpeed = desired_linear_velocity;
  return { linear: desired_linear_velocity, angular: turning_velocity_component };
}
