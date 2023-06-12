import { observer } from "mobx-react-lite";
import { Vector } from '../types/Path';
import { CanvasConverter } from '../types/Canvas';
import { Line } from 'react-konva';

const SplineControlVisualLineElement = observer((props: { start: Vector, end: Vector, cc: CanvasConverter }) => {
  const startInPx = props.cc.toPx(props.start);
  const endInPx = props.cc.toPx(props.end);

  const lineWidth = props.cc.pixelWidth / 600;

  return (
    <Line points={[startInPx.x, startInPx.y, endInPx.x, endInPx.y]} stroke="ffffff" strokeWidth={lineWidth} opacity={0.25} />
  )
});

export { SplineControlVisualLineElement };
