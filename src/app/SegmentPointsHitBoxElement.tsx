import { action } from "mobx";
import { observer } from "mobx-react-lite";
import Konva from "konva";
import { Line } from "react-konva";
import { EndPointControl, SegmentVariant } from "../types/Path";
import { SegmentElementProps } from "./SegmentElement";
import { ConvertSegment, SplitSegment } from "../types/Command";
import { useAppStores } from "./MainApp";

const SegmentPointsHitBoxElement = observer((props: SegmentElementProps) => {
  const { app } = useAppStores();

  function onLineClick(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    // UX: Do not interact with segment if any of its control points or the path is locked
    const isLocked = props.segment.isLocked() || props.path.lock;
    if (isLocked) {
      evt.preventDefault();
      return;
    }

    let cpInPx = new EndPointControl(evt.offsetX, evt.offsetY, 0);
    let cpInUOL = props.cc.toUOL(cpInPx);

    if (evt.button === 2) {
      // right click
      // UX: Split segment if: right click
      app.history.execute(
        `Split segment ${props.segment.uid} with control ${cpInUOL.uid}`,
        new SplitSegment(props.path, props.segment, cpInUOL)
      );
    } else if (evt.button === 0) {
      // UX: Convert segment if: left click
      if (props.segment.controls.length === 2)
        app.history.execute(
          `Convert segment ${props.segment.uid} to curve`,
          new ConvertSegment(props.path, props.segment, SegmentVariant.CUBIC)
        );
      else
        app.history.execute(
          `Convert segment ${props.segment.uid} to line`,
          new ConvertSegment(props.path, props.segment, SegmentVariant.LINEAR)
        );
    }
  }

  let points: number[] = [];

  for (let cp of props.segment.controls) {
    let cpInPx = props.cc.toPx(cp.toVector()); // ALGO: Use toVector for better performance
    points.push(cpInPx.x);
    points.push(cpInPx.y);
  }

  const pointWidth = (props.cc.pixelWidth / 320) * 8;

  return (
    <Line
      points={points}
      strokeWidth={pointWidth}
      stroke={"red"}
      opacity={0}
      bezier={props.segment.controls.length > 2}
      onClick={action(onLineClick)}
    />
  );
});

export { SegmentPointsHitBoxElement };
