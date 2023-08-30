import { observer } from "mobx-react-lite";
import { EndControl, Vector } from "../core/Path";
import { FieldCanvasConverter } from "../core/Canvas";
import { Group, Line, Rect } from "react-konva";

const RobotElement = observer((props: { fcc: FieldCanvasConverter; pos: EndControl; width: number; height: number }) => {
  const widthInPx = props.width * props.fcc.uol2pixel;
  const heightInPx = props.height * props.fcc.uol2pixel;
  const startInUOL = props.pos.toVector();
  const startInPx = props.fcc.toPx(startInUOL);
  const centerInPx = new Vector(widthInPx / 2, heightInPx / 2);
  const frontInPx = centerInPx.add(new Vector(0, -heightInPx / 2));

  const lineWidth = props.fcc.heightInPx / 600;

  return (
    <Group
      rotation={props.pos.heading}
      x={startInPx.x}
      y={startInPx.y}
      offsetX={widthInPx / 2}
      offsetY={heightInPx / 2}
      listening={false}>
      <Rect
        x={0}
        y={0}
        width={widthInPx}
        height={heightInPx}
        stroke="#000"
        strokeWidth={lineWidth}
        fill="#ffffff3f"
      />
      <Line points={[centerInPx.x, centerInPx.y, frontInPx.x, frontInPx.y]} stroke="ffffff" strokeWidth={lineWidth} />
    </Group>
  );
});

export { RobotElement };
