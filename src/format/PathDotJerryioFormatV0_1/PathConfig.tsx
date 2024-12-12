import { makeAutoObservable } from "mobx";
import { Typography } from "@mui/material";
import { RangeSlider } from "@src/app/component.blocks/RangeSlider";
import { UpdateProperties } from "@core/Command";
import { LayoutContext, LayoutType, PanelBuilderProps, PanelInstanceProps } from "@core/Layout";
import { getAppStores } from "@core/MainApp";
import { BentRateApplicationDirection, Path } from "@core/Path";
import { ValidateEditableNumberRange, EditableNumberRange } from "@core/Util";
import { Expose, Exclude } from "class-transformer";
import { observer } from "mobx-react-lite";
import React from "react";
import { PathConfig } from "../Config";
import { Format } from "../Format";
import LinearScaleIcon from "@mui/icons-material/LinearScale";
import { PanelBox } from "@src/app/component.blocks/PanelBox";

// observable class
export class PathConfigImpl implements PathConfig {
  @ValidateEditableNumberRange(-Infinity, Infinity)
  @Expose()
  speedLimit: EditableNumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 600, label: "600" },
    step: 1,
    from: 40,
    to: 120
  };
  @ValidateEditableNumberRange(-Infinity, Infinity)
  @Expose()
  bentRateApplicableRange: EditableNumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 1, label: "1" },
    step: 0.001,
    from: 0,
    to: 0.1
  };
  @Exclude()
  bentRateApplicationDirection = BentRateApplicationDirection.HighToLow;
  @Exclude()
  readonly format: Format;

  @Exclude()
  public path!: Path;

  constructor(format: Format) {
    this.format = format;
    makeAutoObservable(this);
  }
}

const PathConfigPanelBody = observer((props: {}) => {
  const { app } = getAppStores();

  const pc = app.selectedPath?.pc as PathConfigImpl | undefined;

  const isClassic = React.useContext(LayoutContext) === LayoutType.Classic;

  if (pc === undefined) {
    return isClassic ? undefined : <Typography>(No selected path)</Typography>;
  }

  return (
    <>
      <Typography>Min/Max Speed</Typography>
      <PanelBox marginTop="0px" marginBottom="16px">
        <RangeSlider
          range={pc.speedLimit}
          onChange={(from, to) =>
            app.history.execute(
              `Change path ${pc.path.uid} min/max speed`,
              new UpdateProperties(pc.speedLimit, { from, to })
            )
          }
        />
      </PanelBox>
      <Typography>Bent Rate Applicable Range</Typography>
      <PanelBox marginTop="0px">
        <RangeSlider
          range={pc.bentRateApplicableRange}
          onChange={(from, to) =>
            app.history.execute(
              `Change path ${pc.path.uid} bent rate applicable range`,
              new UpdateProperties(pc.bentRateApplicableRange, { from, to })
            )
          }
        />
      </PanelBox>
    </>
  );
});

export const PathConfigPanel = (props: PanelBuilderProps): PanelInstanceProps => {
  return {
    id: "PathConfigAccordion",
    header: "Path",
    children: <PathConfigPanelBody />,
    icon: <LinearScaleIcon fontSize="large" />
  };
};
