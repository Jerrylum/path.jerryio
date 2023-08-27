import { Vector } from "./Path";
import { getFieldCanvasHalfHeight } from "./Util";

export enum LayoutType {
  CLASSIC = "classic",
  EXCLUSIVE = "exclusive", // UX: Default layout
  MOBILE = "mobile" // UX: Default layout
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
