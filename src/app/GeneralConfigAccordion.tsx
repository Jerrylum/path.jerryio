import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography
} from "@mui/material";
import { action } from "mobx";
import { observer } from "mobx-react-lite";
import { getAllFormats } from "../format/Format";
import { ObserverInput, clampQuantity } from "../component/ObserverInput";
import { Quantity, UnitOfLength } from "../core/Unit";
import { UpdateProperties } from "../core/Command";
import { getAppStores } from "../core/MainApp";
import { ObserverEnumSelect } from "../component/ObserverEnumSelect";
import { ObserverCheckbox } from "../component/ObserverCheckbox";
import { NumberUOL } from "../token/Tokens";
import { parseFormula } from "../core/Util";
import { ObserverItemsSelect } from "../component/ObserverItemsSelect";
import { FieldImageAsset, FieldImageOriginType } from "../core/Asset";
import { AssetManagerModalSymbol } from "./AssetManagerModal";

const GeneralConfigPanel = observer((props: {}) => {
  const { app, assetManager, confirmation, modals, appPreferences } = getAppStores();

  const gc = app.gc;

  const formats = getAllFormats();

  const changeFormat = action((index: number) => {
    const oldFormat = app.format;
    const newFormat = formats[index];

    appPreferences.lastSelectedFormat = newFormat.getName();

    const newPaths = newFormat.convertFromFormat(oldFormat, app.paths);

    app.format = newFormat;
    app.paths = newPaths;
  });

  return (
    <>
      <Typography gutterBottom>Format</Typography>
      <Box className="panel-box">
        <Select
          size="small"
          sx={{ maxWidth: "100%" }}
          value={formats.findIndex(x => x.getName() === app.format.getName())}
          onChange={action((e: SelectChangeEvent<number>) => {
            if (app.history.undoHistorySize === 0 && app.history.redoHistorySize === 0 && app.paths.length === 0) {
              changeFormat(parseInt(e.target.value + ""));
            } else {
              confirmation.prompt({
                title: "Change Format",
                description:
                  "Some incompatible path configurations will be discarded. Edit history will be reset. Are you sure?",
                buttons: [
                  { label: "Confirm", onClick: () => changeFormat(parseInt(e.target.value + "")) },
                  { label: "Cancel" }
                ]
              });
            }
          })}>
          {formats.map((x, i) => {
            return (
              <MenuItem key={i} value={i}>
                {x.getName()}
              </MenuItem>
            );
          })}
        </Select>
      </Box>
      <Box className="flex-editor-panel" sx={{ marginTop: "16px" }}>
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
      <Box className="flex-editor-panel">
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
      <Box className="flex-editor-panel">
        <ObserverCheckbox
          label="Holonomic Drive"
          checked={gc.robotIsHolonomic}
          onCheckedChange={c => {
            app.history.execute(`Change robot is holonomic drive`, new UpdateProperties(gc, { robotIsHolonomic: c }));
          }}
        />
      </Box>
      <Typography sx={{ marginTop: "16px" }} gutterBottom>
        Field Layer
      </Typography>
      <Box className="flex-editor-panel">
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
              modals.open(AssetManagerModalSymbol);
            } else if (asset instanceof FieldImageAsset) {
              app.history.execute(
                `Change field layer`,
                new UpdateProperties(gc, { fieldImage: asset?.getSignatureAndOrigin() })
              );
            }
          }}
        />
      </Box>
      {gc.getConfigPanel()}
    </>
  );
});

const GeneralConfigAccordion = observer((props: {}) => {
  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Configuration</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <GeneralConfigPanel />
      </AccordionDetails>
    </Accordion>
  );
});

const GeneralConfigFloatingPanel = observer((props: {}) => {
  return (
    <Box className="floating-panel">
      <Typography className="floating-panel-title">Configuration</Typography>
      <GeneralConfigPanel />
    </Box>
  );
});

export { GeneralConfigAccordion, GeneralConfigFloatingPanel };
