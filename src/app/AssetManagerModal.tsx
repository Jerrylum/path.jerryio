import { observer } from "mobx-react-lite";
import { Modal } from "../component/Modal";
import { Box, Card, Typography } from "@mui/material";
import { makeAutoObservable } from "mobx";
import { FieldImageAsset, FieldImageOriginType } from "../core/Asset";
import { getAppStores } from "../core/MainApp";
import { useImageState, useMobxStorage } from "../core/Hook";
import useImage from "use-image";
import { ObserverInput } from "../component/ObserverInput";
import { NumberUOL } from "../token/Tokens";
import { makeId, parseFormula } from "../core/Util";
import { UnitOfLength } from "../core/Unit";
import React from "react";
import { Vector } from "../core/Path";

export const AssetManagerModalSymbol = Symbol("AssetManagerModalSymbol");

class AssetManagerVariables {
  selected: FieldImageAsset<FieldImageOriginType> | null = null;

  constructor() {
    makeAutoObservable(this);

    const { assetManager } = getAppStores();
    this.selected = assetManager.assets[0] ?? null;
  }
}

// export const BuiltInFieldImagePreview = observer(
//   (props: { preview: FieldImageAsset<FieldImageOriginType.BuiltIn> }) => {
//     const { preview } = props;

//     const imageRef = React.useRef<HTMLImageElement>(null);
//     const imageState = useImageState(imageRef);

//     const size = React.useMemo(() => {
//       const image = imageRef.current;

//       if (imageState === "loaded") {
//         const widthInPx = image?.naturalWidth ?? 0;
//         const heightInPx = image?.naturalHeight ?? 0;
//         const heightInMM = preview.heightInMM;
//         const widthInMM = (widthInPx / heightInPx) * heightInMM;

//         return [new Vector(widthInPx, heightInPx), new Vector(widthInMM, heightInMM)];
//       } else {
//         return null;
//       }
//     }, [imageState, preview.heightInMM]);

//     return (
//       <Box id="asset-preview">
//         <Box id="asset-image-preview">
//           <svg viewBox="0 0 1 1"></svg>
//           {imageState === "failed" ? (
//             <Box id="failed-message">
//               <Typography variant="body1">
//                 Can't load this image. Check your internet connection and try again.
//               </Typography>
//             </Box>
//           ) : (
//             <img ref={imageRef} src={preview?.imageSource() ?? ""} />
//           )}
//         </Box>
//         <Box sx={{ marginTop: "1em" }}>
//           <Typography variant="body1">{preview.displayName}</Typography>
//         </Box>
//         {size !== null && (
//           <Box sx={{ marginTop: "0.5em" }}>
//             <Typography variant="body1">
//               Width: {size[0].x.toUser()}px ({size[1].x.toUser()}mm)
//               <br />
//               Height: {size[0].y.toUser()}px ({size[1].y.toUser()}mm)
//             </Typography>
//           </Box>
//         )}
//       </Box>
//     );
//   }
// );

// export const ExternalFieldImagePreview = observer(
//   (props: { preview: FieldImageAsset<FieldImageOriginType.External> }) => {
//     const { preview } = props;

//     const { assetManager } = getAppStores();

//     const imageRef = React.useRef<HTMLImageElement>(null);
//     const imageState = useImageState(imageRef);

//     const size = React.useMemo(() => {
//       const image = imageRef.current;

//       if (imageState === "loaded") {
//         const widthInPx = image?.naturalWidth ?? 0;
//         const heightInPx = image?.naturalHeight ?? 0;
//         const heightInMM = preview.heightInMM;
//         const widthInMM = (widthInPx / heightInPx) * heightInMM;

//         return [new Vector(widthInPx, heightInPx), new Vector(widthInMM, heightInMM)];
//       } else {
//         return null;
//       }
//     }, [imageState, preview.heightInMM]);

//     return (
//       <Box id="asset-preview">
//         <Box id="asset-image-preview">
//           <svg viewBox="0 0 1 1"></svg>
//           {imageState === "failed" ? (
//             <Box id="failed-message">
//               <Typography variant="body1">
//                 Can't load this image. Check your internet connection and try again.
//               </Typography>
//             </Box>
//           ) : (
//             <img ref={imageRef} src={preview?.imageSource() ?? ""} />
//           )}
//         </Box>
//         <Box sx={{ marginTop: "1em" }}>
//           <ObserverInput
//             label="Name"
//             fullWidth
//             getValue={() => preview.displayName}
//             setValue={(value: string) => {
//               preview.displayName = value;
//               assetManager.saveAssets();
//             }}
//             isValidIntermediate={() => true}
//             isValidValue={value => value !== ""}
//             onKeyDown={e => e.stopPropagation()}
//           />
//         </Box>
//         {size !== null && (
//           <Box sx={{ marginTop: "0.5em" }}>
//             <Typography variant="body1">
//               Width: {size[0].x.toUser()}px ({size[1].x.toUser()}mm)
//               <br />
//               Height: {size[0].y.toUser()}px ({size[1].y.toUser()}mm)
//             </Typography>
//           </Box>
//         )}
//       </Box>
//     );
//   }
// );

export const FieldImagePreview = observer((props: { preview: FieldImageAsset<FieldImageOriginType> }) => {
  const { preview } = props;

  const { assetManager } = getAppStores();

  const imageRef = React.useRef<HTMLImageElement>(null);
  const imageState = useImageState(imageRef);
  const [imageKey, setImageKey] = React.useState(makeId(10));

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
  }, [imageState, preview.heightInMM]);

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
      {size !== null && (
        <Box sx={{ marginTop: "0.5em" }}>
          <Typography variant="body1">
            Width: {size[0].x.toUser()}px ({size[1].x.toUser()}mm)
            <br />
            Height: {size[0].y.toUser()}px ({size[1].y.toUser()}mm)
          </Typography>
        </Box>
      )}
    </Box>
  );
});

export const AssetManagerModal = observer(() => {
  const { assetManager } = getAppStores();

  const variables = useMobxStorage(() => new AssetManagerVariables(), []);

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
        <Typography variant="h2" gutterBottom>
          Asset Manager
        </Typography>
        <Typography variant="h3" gutterBottom>
          Field Image
        </Typography>

        {/* Display Name | Height */}
        <Box id="field-image-assets">
          <Box id="assets-list"></Box>
          <Box id="asset-preview">{selected && <FieldImagePreview preview={selected} />}</Box>
        </Box>
        <Typography variant="body1">New image</Typography>
      </Card>
    </Modal>
  );
});
