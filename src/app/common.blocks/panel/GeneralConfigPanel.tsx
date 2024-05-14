import {
  Box,
  Button,
  ListSubheader,
  MenuItem,
  MenuItemProps,
  Select,
  SelectChangeEvent,
  Typography
} from "@mui/material";
import { action } from "mobx";
import { observer } from "mobx-react-lite";
import { Format, getAllDeprecatedFormats, getAllExperimentalFormats, getAllGeneralFormats } from "@format/Format";
import { ObserverInput, clampQuantity } from "@app/component.blocks/ObserverInput";
import { Quantity, UnitOfLength } from "@core/Unit";
import { UpdateProperties } from "@core/Command";
import { getAppStores } from "@core/MainApp";
import { ObserverEnumSelect } from "@app/component.blocks/ObserverEnumSelect";
import { ObserverCheckbox } from "@app/component.blocks/ObserverCheckbox";
import { NumberUOL } from "@token/Tokens";
import { parseFormula } from "@core/Util";
import { ObserverItemsSelect } from "@app/component.blocks/ObserverItemsSelect";
import { FieldImageAsset, FieldImageOriginType } from "@core/Asset";
import { AssetManagerModalSymbol } from "../modal/AssetManagerModal";
import { PanelBuilderProps, PanelInstanceProps } from "@core/Layout";
import TuneIcon from "@mui/icons-material/Tune";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import "./GeneralConfigPanel.scss";
import { isExperimentalFeaturesEnabled } from "@src/core/Preferences";
import { FormStyleButton } from "@src/app/component.blocks/FormStyleButton";

const FormatMenuItem = (props: { format: Format } & MenuItemProps) => {
  const { format, ...rests } = props;

  return (
    <MenuItem {...rests}>
      <Box>
        <Typography variant="body1">{format.getName()}</Typography>
        <Typography variant="body1" color="grey" sx={{ width: "500px", maxWidth: "90vw", textWrap: "wrap" }}>
          {format.getDescription()}
        </Typography>
      </Box>
    </MenuItem>
  );
};

const GeneralConfigPanelBody = observer((props: {}) => {
  const { app, assetManager, confirmation, ui, appPreferences } = getAppStores();

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
      <Box className="Panel-Box">
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
      </Box>
      <Box className="Panel-FlexBox" sx={{ marginTop: "16px" }}>
        <ObserverEnumSelect
          label="Unit of Length"
          enumValue={gc.uol}
          onEnumChange={v => app.history.execute(`Set Unit of Length`, new UpdateProperties(gc, { uol: v }))}
          enumType={UnitOfLength}
        />
        <ObserverInput
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
      </Box>
      <Typography sx={{ marginTop: "16px" }} gutterBottom>
        Robot Visualize
      </Typography>
      <Box className="Panel-FlexBox">
        <ObserverInput
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
        <ObserverInput
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
        <ObserverCheckbox
          label="Visible"
          title="Toggle Robot Visibility (R)"
          checked={gc.showRobot}
          onCheckedChange={c => (gc.showRobot = c)}
        />
      </Box>
      <Box className="Panel-FlexBox">
        {typeof gc.robotIsHolonomic === "boolean" && (
          <ObserverCheckbox
            label="Holonomic Drive"
            checked={gc.robotIsHolonomic && true}
            onCheckedChange={c => {
              app.history.execute(`Change robot is holonomic drive`, new UpdateProperties(gc, { robotIsHolonomic: c }));
            }}
          />
        )}
      </Box>
      <Typography sx={{ marginTop: "16px" }} gutterBottom>
        Field & Coordinate
      </Typography>
      {/* <Box className="Panel-FlexBox">
        <ObserverItemsSelect
          sx={{ width: "auto" }}
          label=""
          selected={gc.fieldImage.signature}
          items={[
            ...assetManager.assets.map(asset => ({ key: asset.signature, value: asset, label: asset.displayName })),
            { key: "open-asset-manager", value: "open-asset-manager", label: "(Custom)" }
          ]}
          onSelectItem={(asset: FieldImageAsset<FieldImageOriginType> | string | undefined) => {
            if (asset === "open-asset-manager") {
              ui.openModal(AssetManagerModalSymbol);
            } else if (asset instanceof FieldImageAsset) {
              app.history.execute(
                `Change field layer`,
                new UpdateProperties(gc, { fieldImage: asset?.getSignatureAndOrigin() })
              );
            }
          }}
        />
      </Box> */}
      <Box className="Panel-FlexBox" marginTop="16px">
        {/* <Button variant="outlined" color="info" size="medium" endIcon={<CreateIcon/>}>
          {gc.fieldImage.displayName}
        </Button> */}
        <FormStyleButton onClick={() => ui.openModal(AssetManagerModalSymbol)}>
          {gc.fieldImage.displayName}
          <ChevronRightIcon fontSize="small" />
        </FormStyleButton>
      </Box>
      <Box className="Panel-FlexBox" marginTop="16px">
        <FormStyleButton onClick={() => {}}>
          VEX Game Positioning System
          <ChevronRightIcon fontSize="small" />
        </FormStyleButton>
      </Box>
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
