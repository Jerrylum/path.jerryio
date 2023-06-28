import { observer } from "mobx-react-lite";
import { Path, Segment } from "../types/Path";
import { SegmentControlVisualLineElement } from "./SegmentControlVisualLineElement";
import { SegmentPointsHitBoxElement } from "./SegmentPointsHitBoxElement";
import { CanvasConverter } from "../types/Canvas";

export interface SegmentElementProps {
  segment: Segment;
  path: Path;
  cc: CanvasConverter;
}

const SegmentElement = observer((props: SegmentElementProps) => {
  return (
    <>
      {/* ALGO: Do not calculate points here */}
      {props.segment.controls.length === 4 ? (
        <>
          {props.segment.controls[1].visible && (
            <SegmentControlVisualLineElement
              start={props.segment.controls[0]}
              end={props.segment.controls[1]}
              cc={props.cc}
            />
          )}
          {props.segment.controls[2].visible && (
            <SegmentControlVisualLineElement
              start={props.segment.controls[2]}
              end={props.segment.controls[3]}
              cc={props.cc}
            />
          )}
        </>
      ) : null}
      <SegmentPointsHitBoxElement {...props} />
      {/* UX: Do not render control point here due to z-index */}
    </>
  );
});

export { SegmentElement };
