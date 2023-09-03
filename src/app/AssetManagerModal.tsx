import { observer } from "mobx-react-lite";
import { Modal } from "../component/Modal";
import { Box, Card, Typography } from "@mui/material";
import { makeAutoObservable } from "mobx";
import { FieldImageAsset } from "../core/Asset";
import { getAppStores } from "../core/MainApp";
import { useMobxStorage } from "../core/Hook";
import useImage from "use-image";
import { ObserverInput } from "../component/ObserverInput";
import { NumberUOL } from "../token/Tokens";
import { parseFormula } from "../core/Util";
import { UnitOfLength } from "../core/Unit";

export const AssetManagerModalSymbol = Symbol("AssetManagerModalSymbol");

class AssetManagerVariables {
  selected: FieldImageAsset | null = null;

  constructor() {
    makeAutoObservable(this);

    const { assetManager } = getAppStores();
    this.selected = assetManager.assets[0] ?? null;
  }
}

export const AssetManagerModal = observer(() => {
  const { assetManager } = getAppStores();

  const variables = useMobxStorage(() => new AssetManagerVariables(), []);

  const selected = variables.selected;

  // const [previewImage, previewImageLoadingState] = useImage(selected?.imageSource() ?? "");

  return (
    <Modal symbol={AssetManagerModalSymbol}>
      <Card id="asset-manager-modal" className="modal-container">
        <Typography variant="h2" gutterBottom>
          Asset Manager
        </Typography>
        <Typography variant="h3" gutterBottom>
          Field Image
        </Typography>

        {/* Display Name | Height */}
        <Box id="field-image-assets">
          <Box id="assets-list"></Box>
          <Box id="asset-preview">
            {selected !== null && (
              <>
                <Box id="asset-image-preview">
                  <svg viewBox="0 0 1 1"></svg>
                  <img src={selected?.imageSource() ?? ""} />
                </Box>
                <ObserverInput
                  label="Name"
                  fullWidth
                  getValue={() => selected.displayName}
                  setValue={(value: string) => {
                    selected.displayName = value;
                    assetManager.saveAssets();
                  }}
                  isValidIntermediate={() => true}
                  isValidValue={(value) => value !== ""}
                  sx={{ marginTop: "16px" }}
                  onKeyDown={(e) => e.stopPropagation()}
                />
                <ObserverInput
                  label="Height (MM)"
                  getValue={() => selected.heightInMM + ""}
                  setValue={(value: string) => {
                    selected.heightInMM = parseFormula(value, NumberUOL.parse)!.compute(UnitOfLength.Millimeter);
                    assetManager.saveAssets();
                  }}
                  isValidIntermediate={() => true}
                  isValidValue={(candidate: string) => parseFormula(candidate, NumberUOL.parse) !== null}
                  numeric
                  sx={{ marginTop: "16px", width: "8rem" }}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </>
            )}
          </Box>
        </Box>
        <Typography variant="body1">New image</Typography>
      </Card>
    </Modal>
  );
});
