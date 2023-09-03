import { observer } from "mobx-react-lite";
import { Modal } from "../component/Modal";
import { MuiFileInput } from "mui-file-input";
import { Box, Card, Chip, IconButton, List, ListItem, ListItemButton, ListItemText, Typography } from "@mui/material";
import { action, makeAutoObservable } from "mobx";
import { FieldImageAsset, FieldImageOriginType, getFieldImageOriginTypeDescription } from "../core/Asset";
import { getAppStores } from "../core/MainApp";
import { useImageState, useMobxStorage } from "../core/Hook";
import DeleteIcon from "@mui/icons-material/Delete";
import useImage from "use-image";
import { ObserverInput } from "../component/ObserverInput";
import { NumberUOL } from "../token/Tokens";
import { makeId, parseFormula } from "../core/Util";
import { UnitOfLength } from "../core/Unit";
import React from "react";
import { Vector } from "../core/Path";

export const AssetManagerModalSymbol = Symbol("AssetManagerModalSymbol");

class FieldImageManagerVariables {
  selected: FieldImageAsset<FieldImageOriginType> | null = null;

  newName: string = "My Custom Field Image";
  newHeightInMM: number = 100;
  newUrl: string = "";
  newUpload: File | null = null;

  constructor() {
    makeAutoObservable(this);

    const { assetManager } = getAppStores();
    this.selected = assetManager.assets[0] ?? null;
  }
}

export const FieldImageAssetItem = observer(
  (props: { variables: FieldImageManagerVariables; asset: FieldImageAsset<FieldImageOriginType> }) => {
    const { variables, asset } = props;

    return (
      <ListItem
        className="asset-item"
        disablePadding
        secondaryAction={
          <IconButton edge="end" className="asset-item-delete">
            <DeleteIcon />
          </IconButton>
        }>
        <ListItemButton
          onClick={action(() => {
            variables.selected = asset;
          })}>
          <ListItemText
            sx={{ textWrap: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            primary={
              <>
                {asset.displayName}
                <Chip label={getFieldImageOriginTypeDescription(asset.type)} size="small" sx={{ marginLeft: "8px" }} />
              </>
            }
          />
        </ListItemButton>
      </ListItem>
    );
  }
);

export const FieldImagePreview = observer((props: { preview: FieldImageAsset<FieldImageOriginType> }) => {
  const { preview } = props;

  const { assetManager } = getAppStores();

  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const [imageKey, setImageKey] = React.useState(makeId(10));
  const imageState = useImageState(imageRef, [imageKey]);

  const size = React.useMemo(() => {
    const image = imageRef.current;

    if (imageState === "loaded") {
      const widthInPx = image?.naturalWidth ?? 0;
      const heightInPx = image?.naturalHeight ?? 0;
      const heightInMM = preview.heightInMM;
      const widthInMM = (widthInPx / heightInPx) * heightInMM;

      return [new Vector(widthInPx, heightInPx), new Vector(widthInMM, heightInMM)];
    } else {
      return null;
    }
  }, [imageState, preview.heightInMM, imageKey]);

  return (
    <Box id="asset-preview">
      <Box id="asset-image-preview">
        <svg viewBox="0 0 1 1"></svg>
        {imageState === "failed" ? (
          <>
            <Box id="reload-button" onClick={() => setImageKey(makeId(10))}>
              <Typography variant="body1">Click To Reload</Typography>
            </Box>
            <Box id="failed-message">
              <Typography variant="body1">
                Can't load this image. Check your internet connection and try again.
              </Typography>
            </Box>
          </>
        ) : (
          <>
            <img key={imageKey} ref={imageRef} src={preview?.imageSource() ?? ""} />
            <Box id="reload-button" onClick={() => setImageKey(makeId(10))}>
              <Typography variant="body1">Click To Reload</Typography>
            </Box>
          </>
        )}
      </Box>
      <Box sx={{ marginTop: "1em" }}>
        {preview.isOriginType(FieldImageOriginType.BuiltIn) ? (
          <Typography variant="body1">{preview.displayName}</Typography>
        ) : (
          <ObserverInput
            label="Name"
            fullWidth
            getValue={() => preview.displayName}
            setValue={(value: string) => {
              preview.displayName = value;
              assetManager.saveAssets();
            }}
            isValidIntermediate={() => true}
            isValidValue={value => value !== ""}
            onKeyDown={e => e.stopPropagation()}
          />
        )}
      </Box>
      <Box sx={{ marginTop: "0.5em", minHeight: "60px" }}>
        {size !== null && (
          <Typography variant="body1">
            Width: {size[0].x.toUser()}px ({size[1].x.toUser()}mm)
            <br />
            Height: {size[0].y.toUser()}px ({size[1].y.toUser()}mm)
          </Typography>
        )}
      </Box>
    </Box>
  );
});

export const AssetManagerModal = observer(() => {
  const { assetManager } = getAppStores();

  const variables = useMobxStorage(() => new FieldImageManagerVariables(), []);

  const selected = variables.selected;

  /*
  Message:
  This path file recommends the use of a custom field image. Would you like to download and install it?

  Click "Yes" to download and install the image from https://imgur.com/ only if you trust the source.
  Click "No" to use the default field image instead.

  Name: My Custom VRC Field Image

  Options: Yes | No
  */

  /*
  # New image section:

  Message:
  If the url is provided, the image will be downloaded and cached in your computer.
  The url will also be included in the path file. The image will be automatically downloaded when the path file is opened on a different computer.
  // The url will also be included in the path file. The image will be automatically downloaded when you open the path file on a different computer.
  // The url will also be included in the path file. It will automatically download the image when you open the path file on a different computer.
  // The url will also be included in the path file. It will automatically download the image when you open the path file on a different computer.
  // The url will also be included in the path file that uses this image to allow other users to download the image when they open the path file on their browser.

  If the file is uploaded, the image will be stored in your computer, but not embed in the path file.
  The image needs to be uploaded again if the path file is opened on a different computer.
  // You need to upload the image again if you open the path file on a different computer.
  // When the path file is shared with other users, they will need to upload the image themselves.
  // When the path file is opened on a different browser/computer, the image ...
  */

  return (
    <Modal symbol={AssetManagerModalSymbol}>
      <Card id="asset-manager-modal" className="modal-container">
        <Typography variant="h3" fontSize={18} gutterBottom>
          Field Image
        </Typography>
        <Box id="field-image-assets">
          <Box id="assets-list-add">
            <Box id="assets-list">
              {/* Using the SVG viewBox solution to allow the use of min-height */}
              <svg viewBox="0 0 0.6 0.4"></svg>
              <Box id="assets-list-content">
                <List dense>
                  {assetManager.assets.map(asset => (
                    <FieldImageAssetItem key={asset.signature} variables={variables} asset={asset} />
                  ))}
                </List>
              </Box>
            </Box>
            <Typography variant="h4" gutterBottom>
              New image
            </Typography>
            <Box
              sx={{
                marginTop: "1em",
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                alignItems: "center",
                width: "100%"
              }}>
              <ObserverInput
                label="Name"
                getValue={() => variables.newName}
                setValue={(value: string) => (variables.newName = value)}
                isValidIntermediate={() => true}
                isValidValue={value => value !== ""}
                sx={{ flexGrow: 1 }}
                onKeyDown={e => e.stopPropagation()}
              />
              <ObserverInput
                label="Height (mm)"
                getValue={() => variables.newHeightInMM + ""}
                setValue={(value: string) => {
                  const setValue = parseFormula(value, NumberUOL.parse)!.compute(UnitOfLength.Millimeter);
                  variables.newHeightInMM = Math.max(100, setValue);
                }}
                isValidIntermediate={() => true}
                isValidValue={(candidate: string) => parseFormula(candidate, NumberUOL.parse) !== null}
                numeric
                sx={{ width: "100px" }}
                onKeyDown={e => e.stopPropagation()}
              />
            </Box>
            <Box
              sx={{
                marginTop: "1em",
                display: "flex",
                gap: "12px",
                flexWrap: "nowrap",
                alignItems: "center",
                width: "100%"
              }}>
              <ObserverInput
                label="URL"
                getValue={() => variables.newUrl}
                setValue={(value: string) => (variables.newUrl = value)}
                isValidIntermediate={() => true}
                isValidValue={value => value !== ""} // TODO
                sx={{ flexGrow: 1 }}
                onKeyDown={e => e.stopPropagation()}
              />
              <Typography variant="body1" sx={{}}>
                or
              </Typography>
              <MuiFileInput
                sx={{ flexGrow: 1 }}
                placeholder="File Upload"
                value={variables.newUpload}
                onChange={action((file: File | null) => (variables.newUpload = file))}
                size="small"
              />
            </Box>
          </Box>
          {selected && <FieldImagePreview preview={selected} />}
        </Box>
      </Card>
    </Modal>
  );
});
