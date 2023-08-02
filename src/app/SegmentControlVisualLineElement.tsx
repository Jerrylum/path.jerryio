import { observer } from "mobx-react-lite";
import { Vector } from "../core/Path";
import { FieldCanvasConverter } from "../core/Canvas";
import { Line } from "react-konva";

const SegmentControlVisualLineElement = observer((props: { start: Vector; end: Vector; fcc: FieldCanvasConverter }) => {
  const startInPx = props.fcc.toPx(props.start);
  const endInPx = props.fcc.toPx(props.end);

  const lineWidth = props.fcc.pixelHeight / 600;

  return (
    <Line
      points={[startInPx.x, startInPx.y, endInPx.x, endInPx.y]}
      stroke="#000"
      strokeWidth={lineWidth}
      opacity={0.25}
    />
  );
});

export { SegmentControlVisualLineElement };
