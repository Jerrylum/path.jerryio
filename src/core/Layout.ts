import { Vector } from "./Path";
import { getFieldCanvasHalfHeight } from "./Util";

export enum LayoutType {
  CLASSIC = "classic", // UX: Default layout
  EXCLUSIVE = "exclusive",
  MOBILE = "mobile"
}

export function getAvailableLayouts(windowSize: Vector): LayoutType[] {
  const widthForClassic = 16 + 288 + 16 + getFieldCanvasHalfHeight(windowSize) + 16 + 352 + 16;
  const heightForClassic = 600;
  if (windowSize.x >= widthForClassic && windowSize.y >= heightForClassic)
    return [LayoutType.CLASSIC, LayoutType.EXCLUSIVE, LayoutType.MOBILE];

  const widthForExclusive = 8 + 48 + 8 + 16 + Math.max(windowSize.y * 0.12, 80) * 6.5 + 16 + 8 + 48 + 8;
  const heightForExclusive = 480;
  if (windowSize.x >= widthForExclusive && windowSize.y >= heightForExclusive)
    return [LayoutType.EXCLUSIVE, LayoutType.MOBILE];

  return [LayoutType.MOBILE];
}

export function getUsableLayout(windowSize: Vector, preferred: LayoutType): LayoutType {
  const available = getAvailableLayouts(windowSize);
  if (available.includes(preferred)) return preferred;
  return available[0];
}
