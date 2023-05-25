import { observer } from "mobx-react-lite";
import { Path, Spline } from '../math/Path';
import { AppProps } from "../App";
import { SplineControlVisualLineElement } from "./SplineControlVisualLineElement";
import { SplineKnotsHitBoxElement } from "./SplineKnotsHitBoxElement";


export interface SplineElementProps extends AppProps {
  spline: Spline;
  path: Path;
}

const SplineElement = observer((props: SplineElementProps) => {
  return (
    <>
      {/* ALGO: Do not calculate knots here */}
      {
        props.spline.controls.length === 4 ? (
          <>
            {props.spline.controls[1].visible ? <SplineControlVisualLineElement start={props.spline.controls[0]} end={props.spline.controls[1]} cc={props.cc} /> : null}
            {props.spline.controls[2].visible ? <SplineControlVisualLineElement start={props.spline.controls[2]} end={props.spline.controls[3]} cc={props.cc} /> : null}
          </>
        ) : null
      }
      <SplineKnotsHitBoxElement {...props} />
      {/* UX: Do not render control point here due to z-index */}
    </>
  )
});

export { SplineElement };
