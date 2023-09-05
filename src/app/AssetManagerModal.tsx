import { observer } from "mobx-react-lite";
import { Modal } from "../component/Modal";
import { MuiFileInput } from "mui-file-input";
import {
  Box,
  Button,
  Card,
  Chip,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Radio,
  RadioGroup,
  Typography
} from "@mui/material";
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

  draft: {
    name: string;
    heightInMM: number;
    url: string;
    upload: File | null;
  } | null = null;

  newDraft() {
    this.draft = {
      name: "My Custom Field Image",
      heightInMM: 100,
      url: "",
      upload: null
    };
  }

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

export const FieldImageList = observer((props: { variables: FieldImageManagerVariables }) => {
  const { assetManager } = getAppStores();

  const { variables } = props;

  return (
    <Box>
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
      <Button
        variant="contained"
        color="primary"
        disableElevation
        sx={{ marginTop: "12px" }}
        onClick={() => variables.newDraft()}>
        Add
      </Button>
    </Box>
  );
});

export const NewFieldImageForm = observer((props: { variables: FieldImageManagerVariables }) => {
  const { assetManager } = getAppStores();

  const { variables } = props;

  const draft = variables.draft;
  if (draft === null) return null;

  return (
    <Box>
      {/* <Typography variant="h4" gutterBottom>
        New image
      </Typography> */}
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
          getValue={() => draft.name}
          setValue={(value: string) => (draft.name = value)}
          isValidIntermediate={() => true}
          isValidValue={value => value !== ""}
          sx={{ flexGrow: 1 }}
          onKeyDown={e => e.stopPropagation()}
        />
        <ObserverInput
          label="Height (mm)"
          getValue={() => draft.heightInMM + ""}
          setValue={(value: string) => {
            const setValue = parseFormula(value, NumberUOL.parse)!.compute(UnitOfLength.Millimeter);
            draft.heightInMM = Math.max(100, setValue);
          }}
          isValidIntermediate={() => true}
          isValidValue={(candidate: string) => parseFormula(candidate, NumberUOL.parse) !== null}
          numeric
          sx={{ width: "100px" }}
          onKeyDown={e => e.stopPropagation()}
        />
      </Box>

      {/* <Typography variant="h4" gutterBottom>
        Source
      </Typography> */}
      {/* <Box
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
          getValue={() => draft.url}
          setValue={(value: string) => (draft.url = value)}
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
          value={draft.upload}
          onChange={action((file: File | null) => (draft.upload = file))}
          size="small"
        />
      </Box> */}
      <Box
        sx={{
          marginTop: "1em"
        }}>
        <FormControl>
          <FormLabel id="demo-radio-buttons-group-label">Source</FormLabel>
          <RadioGroup aria-labelledby="demo-radio-buttons-group-label" defaultValue="" row name="radio-buttons-group">
            <FormControlLabel
              value="url"
              control={<Radio />}
              label={
                <ObserverInput
                  label="URL"
                  getValue={() => draft.url}
                  setValue={(value: string) => (draft.url = value)}
                  isValidIntermediate={() => true}
                  isValidValue={value => value !== ""} // TODO
                  // sx={{ flexGrow: 1 }}
                  onKeyDown={e => e.stopPropagation()}
                />
              }
            />
            <FormControlLabel
              value="male"
              control={<Radio />}
              label={
                <MuiFileInput
                  // sx={{ flexGrow: 1 }}
                  placeholder="File Upload"
                  value={draft.upload}
                  onChange={action((file: File | null) => (draft.upload = file))}
                  size="small"
                />
              }
            />
          </RadioGroup>
        </FormControl>

        <Typography variant="body1" sx={{}}>
          If the url is provided, the image will be downloaded and cached in your computer. The url will also be
          included in the path file. The image will be automatically downloaded when the path file is opened on a
          different computer.
        </Typography>
      </Box>
    </Box>
  );
});

export const FieldImageSection = observer(() => {
  const { assetManager } = getAppStores();

  const variables = useMobxStorage(() => new FieldImageManagerVariables(), []);

  const selected = variables.selected;

  return (
    <Box>
      <Typography variant="h3" fontSize={18} gutterBottom>
        Field Image
      </Typography>
      <Box id="field-image-assets">
        <Box id="assets-list-add">
          {!variables.draft && <FieldImageList variables={variables} />}
          {variables.draft && <NewFieldImageForm variables={variables} />}
        </Box>
        {selected && <FieldImagePreview preview={selected} />}
      </Box>
    </Box>
  );
});

export const AssetManagerModal = observer(() => {
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

  If the file is uploaded, the image will be stored in your computer, but not embed in the path file.
  The image needs to be uploaded again if the path file is opened on a different computer.
  */

  return (
    <Modal symbol={AssetManagerModalSymbol}>
      <Card id="asset-manager-modal" className="modal-container">
        <FieldImageSection />
      </Card>
    </Modal>
  );
});
