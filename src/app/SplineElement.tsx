import { observer } from "mobx-react-lite";
import { Path, Spline } from '../types/Path';
import { SplineControlVisualLineElement } from "./SplineControlVisualLineElement";
import { SplinePointsHitBoxElement } from "./SplinePointsHitBoxElement";
import { CanvasConverter } from "../types/Canvas";


export interface SplineElementProps {
  spline: Spline;
  path: Path;
  cc: CanvasConverter;
}

const SplineElement = observer((props: SplineElementProps) => {
  return (
    <>
      {/* ALGO: Do not calculate points here */}
      {
        props.spline.controls.length === 4 ? (
          <>
            {props.spline.controls[1].visible ? <SplineControlVisualLineElement start={props.spline.controls[0]} end={props.spline.controls[1]} cc={props.cc} /> : null}
            {props.spline.controls[2].visible ? <SplineControlVisualLineElement start={props.spline.controls[2]} end={props.spline.controls[3]} cc={props.cc} /> : null}
          </>
        ) : null
      }
      <SplinePointsHitBoxElement {...props} />
      {/* UX: Do not render control point here due to z-index */}
    </>
  )
});

export { SplineElement };
