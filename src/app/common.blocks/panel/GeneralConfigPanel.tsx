import { Box, ListSubheader, MenuItem, MenuItemProps, Select, SelectChangeEvent, Typography } from "@mui/material";
import { action } from "mobx";
import { observer } from "mobx-react-lite";
import { Format, getAllDeprecatedFormats, getAllExperimentalFormats, getAllGeneralFormats } from "@format/Format";
import { FormInputField, clampQuantity } from "@app/component.blocks/FormInputField";
import { Quantity, UnitOfLength } from "@core/Unit";
import { UpdateProperties } from "@core/Command";
import { getAppStores } from "@core/MainApp";
import { FormEnumSelect } from "@app/component.blocks/FormEnumSelect";
import { FormCheckbox } from "@app/component.blocks/FormCheckbox";
import { NumberUOL } from "@token/Tokens";
import { parseFormula } from "@core/Util";
import { AssetManagerModalSymbol } from "../modal/AssetManagerModal";
import { PanelBuilderProps, PanelInstanceProps } from "@core/Layout";
import TuneIcon from "@mui/icons-material/Tune";
import { isExperimentalFeaturesEnabled } from "@src/core/Preferences";
import { OpenModalButton } from "@src/app/component.blocks/OpenModalButton";
import { PanelBox } from "@src/app/component.blocks/PanelBox";
import { CoordinateSystemModalSymbol } from "../modal/CoordinateSystemModal";

const FormatMenuItem = (props: { format: Format } & MenuItemProps) => {
  const { format, ...rests } = props;

  return (
    <MenuItem {...rests}>
      <Box>
        <Typography variant="body1">{format.getName()}</Typography>
        <Typography variant="body1" color="grey" width="500px" maxWidth="90vw" sx={{ textWrap: "wrap" }}>
          {format.getDescription()}
        </Typography>
      </Box>
    </MenuItem>
  );
};

const GeneralConfigPanelBody = observer((props: {}) => {
  const { app, confirmation, ui, appPreferences } = getAppStores();

  const gc = app.gc;

  const allGeneralFormats = getAllGeneralFormats();
  const allDeprecatedFormats = getAllDeprecatedFormats();
  const allExperimentalFormats = getAllExperimentalFormats();
  const allFormats = [...allGeneralFormats, ...allDeprecatedFormats, ...allExperimentalFormats];
  const findIndex = (format: Format) => allFormats.findIndex(x => x.getName() === format.getName());

  const changeFormat = action((index: number) => {
    const oldFormat = app.format;

    const newFormat = allFormats[index];

    appPreferences.lastSelectedFormat = newFormat.getName();

    const newPaths = newFormat.convertFromFormat(oldFormat, app.paths);

    app.format = newFormat;
    app.paths = newPaths;
  });

  const onChangeFormat = action((e: SelectChangeEvent<number>) => {
    if (app.history.undoHistorySize === 0 && app.history.redoHistorySize === 0 && app.paths.length === 0) {
      changeFormat(parseInt(e.target.value + ""));
    } else {
      confirmation.prompt({
        title: "Change Format",
        description:
          "Some incompatible path configurations will be discarded. Edit history will be reset. Are you sure?",
        buttons: [{ label: "Confirm", onClick: () => changeFormat(parseInt(e.target.value + "")) }, { label: "Cancel" }]
      });
    }
  });

  return (
    <>
      <Typography gutterBottom>Format</Typography>
      <PanelBox>
        <Select
          size="small"
          sx={{ maxWidth: "100%" }}
          value={findIndex(app.format)}
          renderValue={value => allFormats[value].getName()}
          onChange={onChangeFormat}>
          <ListSubheader>General</ListSubheader>
          {allGeneralFormats.map(x => (
            <FormatMenuItem key={x.getName()} format={x} value={findIndex(x)} />
          ))}
          <ListSubheader>Deprecated</ListSubheader>
          {allDeprecatedFormats.map(x => (
            <FormatMenuItem key={x.getName()} format={x} value={findIndex(x)} />
          ))}
          {isExperimentalFeaturesEnabled() && <ListSubheader>Experimental</ListSubheader>}
          {isExperimentalFeaturesEnabled() &&
            allExperimentalFormats.map(x => <FormatMenuItem key={x.getName()} format={x} value={findIndex(x)} />)}
        </Select>
      </PanelBox>
      <PanelBox marginTop="16px">
        <FormEnumSelect
          label="Unit of Length"
          enumValue={gc.uol}
          onEnumChange={v => app.history.execute(`Set Unit of Length`, new UpdateProperties(gc, { uol: v }))}
          enumType={UnitOfLength}
        />
        <FormInputField
          sx={{ width: "7rem" }}
          label="Point Density"
          getValue={() => gc.pointDensity.toUser() + ""}
          setValue={(value: string) =>
            app.history.execute(
              `Change point density`,
              new UpdateProperties(gc, {
                pointDensity: clampQuantity(
                  parseFormula(value, NumberUOL.parse)!.compute(app.gc.uol),
                  gc.uol,
                  new Quantity(0.1, UnitOfLength.Centimeter),
                  new Quantity(100, UnitOfLength.Centimeter)
                )
              })
            )
          }
          isValidIntermediate={() => true}
          isValidValue={(candidate: string) => parseFormula(candidate, NumberUOL.parse) !== null}
          numeric
        />
      </PanelBox>
      <Typography marginTop="16px" gutterBottom>
        Robot Visualize
      </Typography>
      <PanelBox>
        <FormInputField
          label="Width"
          getValue={() => gc.robotWidth.toUser() + ""}
          setValue={(value: string) =>
            app.history.execute(
              `Change robot width`,
              new UpdateProperties(gc, {
                robotWidth: clampQuantity(
                  parseFormula(value, NumberUOL.parse)!.compute(app.gc.uol),
                  gc.uol,
                  new Quantity(1, UnitOfLength.Centimeter),
                  new Quantity(100, UnitOfLength.Centimeter)
                )
              })
            )
          }
          isValidIntermediate={() => true}
          isValidValue={(candidate: string) => parseFormula(candidate, NumberUOL.parse) !== null}
          numeric
        />
        <FormInputField
          label="Height"
          getValue={() => gc.robotHeight.toUser() + ""}
          setValue={(value: string) =>
            app.history.execute(
              `Change robot height`,
              new UpdateProperties(gc, {
                robotHeight: clampQuantity(
                  parseFormula(value, NumberUOL.parse)!.compute(app.gc.uol),
                  gc.uol,
                  new Quantity(1, UnitOfLength.Centimeter),
                  new Quantity(100, UnitOfLength.Centimeter)
                )
              })
            )
          }
          isValidIntermediate={() => true}
          isValidValue={(candidate: string) => parseFormula(candidate, NumberUOL.parse) !== null}
          numeric
        />
        <FormCheckbox
          label="Visible"
          title="Toggle Robot Visibility (R)"
          checked={gc.showRobot}
          onCheckedChange={c => (gc.showRobot = c)}
        />
      </PanelBox>
      <PanelBox>
        {typeof gc.robotIsHolonomic === "boolean" && (
          <FormCheckbox
            label="Holonomic Drive"
            checked={gc.robotIsHolonomic && true}
            onCheckedChange={c => {
              app.history.execute(`Change robot is holonomic drive`, new UpdateProperties(gc, { robotIsHolonomic: c }));
            }}
          />
        )}
      </PanelBox>
      <Typography marginTop="16px" gutterBottom>
        Field & Coordinate
      </Typography>
      <PanelBox>
        <OpenModalButton onClick={() => ui.openModal(AssetManagerModalSymbol)}>
          {gc.fieldImage.displayName}
        </OpenModalButton>
      </PanelBox>
      <PanelBox>
        <OpenModalButton onClick={() => ui.openModal(CoordinateSystemModalSymbol)}>
          {gc.coordinateSystem}
        </OpenModalButton>
      </PanelBox>
      {/* {appPreferences.isExperimentalFeaturesEnabled && (
        <PanelBox>
          <FormButton
            onClick={() => {
              const canvas = document.querySelector(".FieldCanvas canvas") as HTMLCanvasElement;
              canvas.toBlob(blob => {
                if (!blob) return;
                const item = new ClipboardItem({ "image/png": blob });
                navigator.clipboard.write([item]);
              });
            }}>
            Capture Canvas
          </FormButton>
        </PanelBox>
      )} */}
      {gc.getAdditionalConfigUI()}
    </>
  );
});

export const GeneralConfigPanel = (props: PanelBuilderProps): PanelInstanceProps => {
  return {
    id: "GeneralConfigPanel",
    header: "Configuration",
    children: <GeneralConfigPanelBody />,
    icon: <TuneIcon fontSize="large" />
  };
};
