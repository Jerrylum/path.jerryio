import { action } from "mobx";
import { observer } from "mobx-react-lite";
import Konva from "konva";
import { Line } from "react-konva";
import { EndControl, SegmentVariant } from "../core/Path";
import { SegmentElementProps } from "./SegmentElement";
import { ConvertSegment, SplitSegment } from "../core/Command";
import { getAppStores } from "../core/MainApp";

const SegmentPointsHitBoxElement = observer((props: SegmentElementProps) => {
  const { app } = getAppStores();

  function onTouchStart(event: Konva.KonvaEventObject<TouchEvent>) {
    event.evt.preventDefault();

    app.fieldEditor.interact(props.segment, "touch");
  }

  function onTouchMove(event: Konva.KonvaEventObject<TouchEvent>) {
    event.evt.preventDefault();
  }

  function onLineClick(event: Konva.KonvaEventObject<MouseEvent>) {
    const evt = event.evt;

    // UX: Do not interact with segment if any of its control points or the path is locked
    const isLocked = props.segment.isLocked() || props.path.lock;
    if (isLocked) {
      evt.preventDefault();
      return;
    }

    const posInPx = props.fcc.getUnboundedPxFromEvent(event);
    if (posInPx === undefined) return;

    const cpInUOL = props.fcc.toUOL(new EndControl(posInPx.x, posInPx.y, 0));

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

  const pointWidth = (props.fcc.pixelHeight / 320) * 8;

  return (
    <Line
      points={props.segment.controls.flatMap(cp => {
        const cpInPx = props.fcc.toPx(cp.toVector());
        return [cpInPx.x, cpInPx.y];
      })}
      strokeWidth={pointWidth}
      stroke={"red"}
      opacity={0}
      bezier={props.segment.controls.length > 2}
      onClick={action(onLineClick)}
      onTouchStart={action(onTouchStart)}
      onTouchEnd={action(onTouchMove)}
    />
  );
});

export { SegmentPointsHitBoxElement };
