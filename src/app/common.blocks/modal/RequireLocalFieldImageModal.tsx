import { getAppStores } from "@core/MainApp";
import { createLocalFieldImage } from "@core/Asset";
import { observer } from "mobx-react-lite";
import { action } from "mobx";
import { Card, Typography, Box, Button } from "@mui/material";
import { MuiFileInput } from "mui-file-input";
import { Modal } from "./Modal";
import React from "react";
import { RequireLocalFieldImageModalSymbol } from "@core/FieldImagePrompt";
import "./RequireLocalFieldImageModal.scss";

export const RequireLocalFieldImageModal = observer(() => {
  const { assetManager, ui } = getAppStores();

  const [errorMessage, setErrorMessage] = React.useState<string | undefined>(undefined);

  const requirement = assetManager.requiringLocalFieldImage;
  if (requirement === null) return <></>;

  const signAndOrigin = requirement.requireSignAndOrigin;

  return (
    <Modal symbol={RequireLocalFieldImageModalSymbol} onClose={action(() => ui.closeModal())}>
      <Card id="ConfirmationModal" className="Modal-Container">
        <Typography variant="h2" gutterBottom>
          Upload Missing Field Image
        </Typography>
        {/* https://stackoverflow.com/questions/9769587/set-div-to-have-its-siblings-width */}
        <Box className="ConfirmationModal-DescriptionBox">
          <Typography component="div" variant="body1" gutterBottom>
            This path file recommends the use of a custom field image and it is missing from your local storage. <br />
            <br />
            You can upload and install the image file or click "No" to use the default field image instead. <br />
            <br />
            Name: {signAndOrigin.displayName} <br />
            Height {signAndOrigin.origin.heightInMM}mm
            {errorMessage !== undefined && (
              <>
                <br />
                <br />
                <span>{errorMessage}</span>
              </>
            )}
          </Typography>
        </Box>
        <MuiFileInput
          fullWidth
          placeholder="File Upload"
          onChange={action(async (file: File | null) => {
            if (file === null) return;

            const asset = await createLocalFieldImage(
              signAndOrigin.displayName,
              signAndOrigin.origin.heightInMM,
              file.slice()
            );
            if (asset === undefined) {
              setErrorMessage("*The field image is invalid.");
              return;
            }
            if (asset.signature !== signAndOrigin.signature) {
              setErrorMessage(
                "*The signature of the field image does not match the recommended field image. Try again."
              );
              asset.removeFromStorage();
              return;
            }

            requirement.answer = asset;

            ui.closeModal();
          })}
          size="small"
        />
        <Box className="ConfirmationModal-ButtonBox">
          <Button
            disableRipple
            variant="text"
            color={"inherit"}
            onClick={action(() => {
              requirement.answer = null;
              ui.closeModal();
            })}>
            No
          </Button>
        </Box>
      </Card>
    </Modal>
  );
});
