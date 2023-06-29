import { observer } from "mobx-react-lite";
import { Vector } from "../types/Path";
import { FieldCanvasConverter } from "../types/Canvas";
import { Line } from "react-konva";

const SegmentControlVisualLineElement = observer((props: { start: Vector; end: Vector; fcc: FieldCanvasConverter }) => {
  const startInPx = props.fcc.toPx(props.start);
  const endInPx = props.fcc.toPx(props.end);

  const lineWidth = props.fcc.pixelWidth / 600;

  return (
    <Line
      points={[startInPx.x, startInPx.y, endInPx.x, endInPx.y]}
      stroke="ffffff"
      strokeWidth={lineWidth}
      opacity={0.25}
    />
  );
});

export { SegmentControlVisualLineElement };
