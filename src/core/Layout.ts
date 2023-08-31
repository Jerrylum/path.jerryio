import { Vector } from "./Path";
import { getFieldCanvasHalfHeight } from "./Util";

export enum LayoutType {
  Classic = "classic", // UX: Default layout
  Exclusive = "exclusive",
  Mobile = "mobile"
}

export function getAvailableLayouts(windowSize: Vector): LayoutType[] {
  const widthForClassic = 16 + 288 + 16 + getFieldCanvasHalfHeight(windowSize) + 16 + 352 + 16;
  const heightForClassic = 600;
  if (windowSize.x >= widthForClassic && windowSize.y >= heightForClassic)
    return [LayoutType.Classic, LayoutType.Exclusive, LayoutType.Mobile];

  const widthForExclusive = 560;
  const heightForExclusive = 480;
  if (windowSize.x >= widthForExclusive && windowSize.y >= heightForExclusive)
    return [LayoutType.Exclusive, LayoutType.Mobile];

  return [LayoutType.Mobile];
}

export function getUsableLayout(windowSize: Vector, preferred: LayoutType): LayoutType {
  const available = getAvailableLayouts(windowSize);
  if (available.includes(preferred)) return preferred;
  return available[0];
}
