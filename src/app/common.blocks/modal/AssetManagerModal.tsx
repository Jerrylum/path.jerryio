import { observer } from "mobx-react-lite";
import { Modal } from "./Modal";
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
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Radio,
  RadioGroup,
  Tooltip,
  Typography
} from "@mui/material";
import { action, makeAutoObservable } from "mobx";
import {
  FieldImageAsset,
  FieldImageOriginType,
  createExternalFieldImage,
  createLocalFieldImage,
  getDefaultBuiltInFieldImage,
  getFieldImageOriginTypeDescription,
  validateAndPurifyFieldImageURL
} from "@core/Asset";
import { getAppStores } from "@core/MainApp";
import { useFieldImageAsset, useImageState, useMobxStorage } from "@core/Hook";
import { FormInputField } from "@app/component.blocks/FormInputField";
import { NumberUOL } from "@token/Tokens";
import { makeId, parseFormula, runInActionAsync } from "@core/Util";
import { UnitOfLength } from "@core/Unit";
import React from "react";
import { Vector } from "@core/Path";
import InputIcon from "@mui/icons-material/Input";
import GetAppIcon from "@mui/icons-material/GetApp";
import AddIcon from "@mui/icons-material/Add";
import DoneIcon from "@mui/icons-material/Done";
import { UpdateProperties } from "@core/Command";

import "./AssetManagerModal.scss";

export const AssetManagerModalSymbol = Symbol("AssetManagerModalSymbol");

class FieldImageManagerVariables {
  selected: FieldImageAsset<FieldImageOriginType> | null = null;

  draft: {
    name: string;
    heightInMM: number;
    urlInput: string;
    urlValidateResult: ReturnType<typeof validateAndPurifyFieldImageURL> | null;
    upload: File | null;
  } | null = null;

  newDraft() {
    this.selected = null;
    this.draft = {
      name: "My Custom Field Image",
      heightInMM: 100,
      urlInput: "",
      urlValidateResult: null,
      upload: null
    };
  }

  constructor() {
    makeAutoObservable(this);
  }
}

export const FieldImageAssetItem = observer(
  (props: { variables: FieldImageManagerVariables; asset: FieldImageAsset<FieldImageOriginType> }) => {
    const { variables, asset } = props;
    const { app, ui } = getAppStores();

    const isSelected = variables.selected === asset;
    const isUsing = asset.signature === app.gc.fieldImage.signature;

    const onApply = action(() => {
      app.history.execute(
        `Change field layer`,
        new UpdateProperties(app.gc, { fieldImage: asset?.getSignatureAndOrigin() })
      );
      ui.closeModal(AssetManagerModalSymbol);
    });

    return (
      <ListItem
        className="FieldImageAssetsList-Item"
        disablePadding
        secondaryAction={
          !isUsing && (
            <Tooltip title="Apply This Image">
              <IconButton edge="end" className="FieldImageAssetsList-ItemApplyButton" onClick={action(onApply)}>
                <InputIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )
        }>
        <ListItemButton
          selected={isSelected}
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
          {isUsing && <DoneIcon />}
        </ListItemButton>
      </ListItem>
    );
  }
);

export const FieldImagePreview = observer((props: { preview: FieldImageAsset<FieldImageOriginType> }) => {
  const { preview } = props;

  const { assetManager } = getAppStores();

  const source = useFieldImageAsset(preview);
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const [imageKey, setImageKey] = React.useState(makeId(10));
  const imageState = useImageState(imageRef, [imageKey]);

  const size = (() => {
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
  })();

  return (
    <Box id="FieldImageAssets-PreviewSection">
      <Box id="FieldImageAssets-AssetImagePreview">
        <svg viewBox="0 0 1 1"></svg>
        <img key={imageKey} ref={imageRef} alt="" src={source} />
        <Box id="FieldImageAssets-ReloadButton" onClick={() => setImageKey(makeId(10))}>
          <Typography variant="body1">Click To Reload</Typography>
        </Box>
        {imageState === "failed" && (
          <Box id="FieldImageAssets-FailedMessage">
            <Typography variant="body1">
              Can't load this image. Check your internet connection and try again.
            </Typography>
          </Box>
        )}
      </Box>
      <Box minHeight="100px">
        <Box marginTop="16px">
          {preview.isOriginType(FieldImageOriginType.BuiltIn) ? (
            <Typography variant="body1">{preview.displayName}</Typography>
          ) : (
            <FormInputField
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
        <Box marginTop="8px">
          {size !== null && (
            <Typography variant="body1">
              Width: {size[0].x.toUser()}px ({size[1].x.toUser()}mm)
              <br />
              Height: {size[0].y.toUser()}px ({size[1].y.toUser()}mm)
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
});

export const FieldImagePreviewPlaceholder = observer(() => {
  return (
    <Box id="FieldImageAssets-PreviewSection">
      <Box id="FieldImageAssets-AssetImagePreview">
        <svg viewBox="0 0 1 1"></svg>
      </Box>
      <Box marginTop="16px" minHeight="100px"></Box>
    </Box>
  );
});

export const FieldImageList = observer((props: { variables: FieldImageManagerVariables }) => {
  const { assetManager } = getAppStores();
  const { variables } = props;

  return (
    <Box>
      <Box id="FieldImageAssetsList">
        {/* Using the SVG viewBox solution to allow the use of min-height */}
        <svg viewBox="0 0 1 1"></svg>
        <Box id="FieldImageAssetsList-Content">
          <List dense>
            {assetManager.assets.map(asset => (
              <FieldImageAssetItem key={asset.signature} variables={variables} asset={asset} />
            ))}
          </List>
        </Box>
      </Box>
    </Box>
  );
});

export const NewFieldImageForm = observer((props: { variables: FieldImageManagerVariables }) => {
  const { variables } = props;
  const draft = variables.draft;

  const { assetManager } = getAppStores();

  const [sourceType, setSourceType] = React.useState<"" | "url" | "file">("");

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(
    action(() => {
      if (draft === null) return;

      if (sourceType === "url") {
        draft.upload = null;
      } else if (sourceType === "file") {
        draft.urlInput = "";
        draft.urlValidateResult = null;
      }
      onReloadPreview();
    }),
    [sourceType]
  );

  const onReloadPreview = () => {
    const draft = variables.draft;
    if (draft === null) return;

    const url: string | null = draft.upload
      ? URL.createObjectURL(draft.upload)
      : draft.urlValidateResult?.[0]?.toString() ?? null;

    if (url === null) {
      variables.selected = null;
    } else {
      variables.selected = new FieldImageAsset<FieldImageOriginType.BuiltIn>(
        FieldImageOriginType.BuiltIn,
        draft.name,
        draft.heightInMM,
        url,
        "ignored"
      );
    }
  };

  const onSubmit = async () => {
    const draft = variables.draft;
    if (draft === null) return;

    const asset = await (async () => {
      if (draft.urlValidateResult?.[0]) {
        return await createExternalFieldImage(draft.name, draft.heightInMM, draft.urlValidateResult[0].toString());
      } else if (draft.upload) {
        return await createLocalFieldImage(draft.name, draft.heightInMM, draft.upload.slice());
      } else {
        return undefined;
      }
    })();

    if (asset !== undefined) assetManager.addAsset(asset);

    await runInActionAsync(() => (variables.draft = null));
  };

  if (draft === null) return null;

  return (
    <Box>
      <Box marginTop="16px" display="flex" gap="12px" flexWrap="wrap" alignItems="center" width="100%">
        <FormInputField
          label="Name"
          getValue={() => draft.name}
          setValue={(value: string) => {
            draft.name = value;
            onReloadPreview();
          }}
          isValidIntermediate={() => true}
          isValidValue={value => value !== ""}
          sx={{ flexGrow: 1 }}
          onKeyDown={e => e.stopPropagation()}
        />
        <FormInputField
          label="Height (mm)"
          getValue={() => draft.heightInMM + ""}
          setValue={(value: string) => {
            const setValue = parseFormula(value, NumberUOL.parse)!.compute(UnitOfLength.Millimeter);
            draft.heightInMM = Math.max(100, setValue);
            onReloadPreview();
          }}
          isValidIntermediate={() => true}
          isValidValue={(candidate: string) => parseFormula(candidate, NumberUOL.parse) !== null}
          numeric
          sx={{ width: "100px" }}
          onKeyDown={e => e.stopPropagation()}
        />
      </Box>
      <Box marginTop="16px">
        <FormControl>
          <FormLabel id="source-radio-buttons-group-label" sx={{ marginBottom: "4px" }}>
            Source (Choose One)
          </FormLabel>
          <RadioGroup
            aria-labelledby="source-radio-buttons-group-label"
            value={sourceType}
            row
            name="radio-buttons-group">
            <FormControlLabel
              value="url"
              control={<Radio />}
              label={
                <FormInputField
                  label=""
                  fullWidth
                  placeholder="Image URL"
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  {...(!draft.urlValidateResult?.[0]
                    ? {}
                    : {
                        InputProps: {
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={action(onReloadPreview)} size="small">
                                <GetAppIcon />
                              </IconButton>
                            </InputAdornment>
                          )
                        }
                      })}
                  getValue={() => draft.urlInput}
                  setValue={(value: string) => {
                    draft.urlInput = value;
                    const isUsingUrl = draft.urlValidateResult?.[0] !== null;
                    setSourceType(isUsingUrl ? "url" : sourceType === "url" ? "" : sourceType);
                    onReloadPreview();
                  }}
                  isValidIntermediate={value => {
                    draft.urlValidateResult = validateAndPurifyFieldImageURL(
                      value,
                      window.location.protocol === "https:"
                    );
                    return true;
                  }}
                  isValidValue={value => true}
                />
              }
              componentsProps={{ typography: { sx: { flexGrow: 1 } } }}
              sx={{ margin: "4px 0", flexGrow: 1 }}
            />
            <FormControlLabel
              value="file"
              control={<Radio />}
              label={
                <MuiFileInput
                  fullWidth
                  placeholder="File Upload"
                  value={draft.upload}
                  onChange={action((file: File | null) => {
                    draft.upload = file;
                    const isUsingFile = file !== null;
                    setSourceType(isUsingFile ? "file" : sourceType === "file" ? "" : sourceType);
                    onReloadPreview();
                  })}
                  size="small"
                />
              }
              componentsProps={{ typography: { sx: { flexGrow: 1 } } }}
              sx={{ margin: "4px 0", flexGrow: 1 }}
            />
          </RadioGroup>
        </FormControl>

        {draft.urlValidateResult?.[1] && (
          <Typography variant="body1" marginTop="8px">
            {draft.urlValidateResult?.[1]}
          </Typography>
        )}
        <Box marginTop="16px" display="flex" gap="12px">
          <Button
            variant="outlined"
            color="primary"
            disableElevation
            onClick={action(onSubmit)}
            disabled={variables.selected === null}>
            Submit
          </Button>
          <Button variant="outlined" color="primary" disableElevation onClick={action(() => (variables.draft = null))}>
            Cancel
          </Button>
        </Box>
      </Box>
    </Box>
  );
});

export const FieldImageSection = observer(() => {
  const { app, ui, assetManager } = getAppStores();

  const variables = useMobxStorage(() => new FieldImageManagerVariables(), []);

  const selected = variables.selected;
  const hasSelected = selected !== null;
  const isAppliedSelected = selected?.signature === app.gc.fieldImage.signature;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(
    action(() => {
      variables.selected = assetManager.assets[0] ?? null;
    }),
    []
  );

  const onApply = action(() => {
    if (selected === null) return;
    app.history.execute(
      `Change field layer`,
      new UpdateProperties(app.gc, { fieldImage: selected?.getSignatureAndOrigin() })
    );
    ui.closeModal(AssetManagerModalSymbol);
  });

  const onDelete = action(() => {
    if (selected === null) return;
    variables.selected = null;
    if (app.gc.fieldImage.signature === selected.signature) {
      app.history.execute(
        `Use default field layer`,
        new UpdateProperties(app.gc, { fieldImage: getDefaultBuiltInFieldImage().getSignatureAndOrigin() })
      );
    }

    if (selected.isOriginType(FieldImageOriginType.External) || selected.isOriginType(FieldImageOriginType.Local))
      assetManager.removeAsset(selected);
  });

  return (
    <Box>
      <Box>
        <Typography variant="h3" fontSize={18} gutterBottom>
          Field Image
          <Tooltip title="Create Field Image">
            <IconButton
              className="FieldImageAssets-FunctionButton"
              onClick={() => {
                if (variables.draft === null) variables.newDraft();
              }}>
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Typography>
      </Box>
      <Box id="FieldImageAssets-Body">
        <Box id="FieldImageAssets-LeftSide">
          {!variables.draft && <FieldImageList variables={variables} />}
          {variables.draft && <NewFieldImageForm variables={variables} />}
        </Box>
        {selected ? <FieldImagePreview preview={selected} /> : <FieldImagePreviewPlaceholder />}
      </Box>
      {!variables.draft && (
        <Box marginTop="16px" display="flex" gap="8px" justifyContent="end">
          <Button
            variant="outlined"
            color="primary"
            disabled={!hasSelected || isAppliedSelected}
            disableElevation
            onClick={onApply}>
            {isAppliedSelected ? "Applied" : "Apply"}
          </Button>
          <Button
            variant="outlined"
            color="primary"
            disabled={!hasSelected || selected.isOriginType(FieldImageOriginType.BuiltIn)}
            disableElevation
            onClick={onDelete}>
            Delete
          </Button>
        </Box>
      )}
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
      <Card id="AssetManagerModal" className="Modal-Container">
        <FieldImageSection />
      </Card>
    </Modal>
  );
});
