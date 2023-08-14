import { observer } from "mobx-react-lite";
import { Vector } from "../core/Path";
import Konva from "konva";
import { Rect } from "react-konva";
import React from "react";

export interface AreaSelectionElementProps extends Konva.RectConfig {
  from?: Vector;
  to?: Vector;
  animation: boolean;
}

const AreaSelectionElement = observer((props: AreaSelectionElementProps) => {
  const { from, to, animation, ...rest } = props;
  const visible = from !== undefined && to !== undefined;

  const ref = React.useRef<Konva.Node | null>(null);
  const [endAnimation, setEndAnimation] = React.useState(0);

  const playAnimation = visible && animation;
  const playingAnimation = playAnimation && Date.now() < endAnimation;
  
  React.useEffect(() => {
    if (visible && animation && playingAnimation === false && ref.current) {
      setEndAnimation(Date.now() + 300);
      const node = ref.current;
      node.x(node.x() - 48);
      node.y(node.y() - 48);
      node.width(96);
      node.height(96);
      node.to({ x: to.x - 10, y: to.y - 10, width: 20, height: 20, duration: 0.3 });
    }
  }, [visible && animation]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  const fixedFrom = new Vector(Math.min(from.x, to.x), Math.min(from.y, to.y));
  const fixedTo = new Vector(Math.max(from.x, to.x), Math.max(from.y, to.y));

  return (
    <Rect
      ref={ref as any}
      x={playingAnimation ? undefined : fixedFrom.x}
      y={playingAnimation ? undefined : fixedFrom.y}
      width={playingAnimation ? undefined : fixedTo.x - fixedFrom.x}
      height={playingAnimation ? undefined : fixedTo.y - fixedFrom.y}
      stroke="#0D99FF"
      fill="#0D99FF20"
      {...rest}
    />
  );
});

export { AreaSelectionElement };
