import { observer } from "mobx-react-lite";
import { Path, Spline } from '../math/path';
import { Circle } from 'react-konva';
import { AppProps } from "../App";
import { SplineControlVisualLineElement } from "./SplineControlVisualLineElement";
import { SplineKnotsHitBoxElement } from "./SplineKnotsHitBoxElement";


export interface SplineElementProps extends AppProps {
  spline: Spline;
  path: Path;
}

const SplineElement = observer((props: SplineElementProps) => {
  const knotRadius = props.cc.pixelWidth / 320;

  return (
    <>
      {props.spline.calculateKnots(props.cc, props.app.sc).map((knotInUOL, index) => {
        let knotInPx = props.cc.toPx(knotInUOL);
        return (
          <Circle key={index} x={knotInPx.x} y={knotInPx.y} radius={knotRadius} fill="#00ff00ff" />
        )
      })}
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
