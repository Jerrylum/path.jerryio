import { action } from "mobx"
import { observer } from "mobx-react-lite";
import { Vertex } from '../math/Path';
import Konva from 'konva';
import { Rect } from 'react-konva';

const AreaElement = observer((props: Konva.RectConfig & { from: Vertex | undefined, to: Vertex | undefined }) => {
  const { from, to, ...rest } = props;

  if (from === undefined || to === undefined) return null;

  const fixedFrom = new Vertex(Math.min(from.x, to.x), Math.min(from.y, to.y));
  const fixedTo = new Vertex(Math.max(from.x, to.x), Math.max(from.y, to.y));

  return (
    <Rect x={fixedFrom.x} y={fixedFrom.y} width={fixedTo.x - fixedFrom.x} height={fixedTo.y - fixedFrom.y}
      stroke="#0D99FF" fill="#0D99FF20" {...rest} />
  )
});

export { AreaElement };
