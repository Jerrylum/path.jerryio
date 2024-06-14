import { xVecLibBoomerangFormatV0_1 } from ".";
import { MainApp, getAppStores } from "@core/MainApp";
import { Control, EndControl, Segment } from "@core/Path";
import { GeneralConfigImpl } from "./GeneralConfig";
test("dummy", () => {
  const { app } = getAppStores(); // suppress constructor error
});
test("read write path", () => {
  const format = new xVecLibBoomerangFormatV0_1();
  const path = format.createPath();
  path.segments.push(
    new Segment(new EndControl(0, 0, 0.1), new Control(70, 70), new Control(80, 80), new EndControl(62, 60, 90))
  );
  /*
  chassis.setPos(0, 0,0.1);
chassis.printCoords();
chassis.moveToBoom( 24, 24, 133.6, 0.7095089932546322,5000);
chassis.moveToBoom( 24, -24, -116.82300000000001, 0.7511567373713952,5000);
chassis.moveToBoom( -24, -24, -17.854025751516758, -0.9970639976227197,5000);
chassis.moveToBoom( -24, 24, 20.008747952175142, 0.8558511879438432,5000);


*/
});
