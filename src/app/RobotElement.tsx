import { observer } from "mobx-react-lite";
import { EndPointControl, Vector } from '../types/Path';
import { CanvasConverter } from '../types/Canvas';
import { Group, Line, Rect } from 'react-konva';

const RobotElement = observer((props: {cc: CanvasConverter, pos: EndPointControl, width: number, height: number}) => {
  const widthInPx = props.width * props.cc.uol2pixel;
  const heightInPx = props.height * props.cc.uol2pixel;
  const startInUOL = new Vector(props.pos.x - props.width / 2, props.pos.y + props.height / 2);
  const startInPx = props.cc.toPx(startInUOL);
  const centerInUOL = new Vector(props.pos.x, props.pos.y);
  const centerInPx = props.cc.toPx(centerInUOL);
  const frontInUOL = centerInUOL.add(new Vector(0, props.height / 2));
  const frontInPx = props.cc.toPx(frontInUOL);

  const lineWidth = props.cc.pixelWidth / 600;

  return (
    <Group rotation={props.pos.heading}>
      <Rect x={startInPx.x} y={startInPx.y} width={widthInPx} height={heightInPx} stroke="ffffff" strokeWidth={lineWidth} fill="#ffffff3f"/>
      <Line points={[centerInPx.x, centerInPx.y, frontInPx.x, frontInPx.y]} stroke="ffffff" strokeWidth={lineWidth}/>
    </Group>
  )
});

export { RobotElement };
