import { makeAutoObservable } from "mobx";
import { Typography } from "@mui/material";
import { FormInputField } from "@src/app/component.blocks/FormInputField";
import { BentRateApplicationDirection, Path } from "@core/Path";
import { EditableNumberRange } from "@core/Util";
import { NumberT, CodePointBuffer } from "@src/token/Tokens";
import { Exclude, Expose } from "class-transformer";
import { IsNumber } from "class-validator";
import { PathConfig } from "../Config";
import { Format } from "../Format";
import { LayoutContext, LayoutType, PanelBuilderProps, PanelInstanceProps } from "@core/Layout";
import { getAppStores } from "@core/MainApp";
import { observer } from "mobx-react-lite";
import React from "react";
import LinearScaleIcon from "@mui/icons-material/LinearScale";
import { PanelBox } from "@src/app/component.blocks/PanelBox";

// observable class
export class PathConfigImpl implements PathConfig {
  @Exclude()
  speedLimit: EditableNumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 1, label: "1" },
    step: 1,
    from: 0,
    to: 1
  };
  @Exclude()
  bentRateApplicableRange: EditableNumberRange = {
    minLimit: { value: 0, label: "0" },
    maxLimit: { value: 1, label: "1" },
    step: 0.001,
    from: 0,
    to: 1
  };
  @Exclude()
  bentRateApplicationDirection = BentRateApplicationDirection.LowToHigh;
  @IsNumber()
  @Expose()
  speed: number = 30;
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
      <PanelBox>
        <FormInputField
          label="Speed"
          sx={{ width: "50%" }}
          getValue={() => pc.speed.toUser() + ""}
          setValue={(value: string) => {
            pc.speed = parseFloat(value);
          }}
          isValidIntermediate={() => true}
          isValidValue={(candidate: string) => NumberT.parse(new CodePointBuffer(candidate)) !== null}
          numeric
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
