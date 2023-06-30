import { styled } from "@mui/material";
import { MaterialDesignContent, SnackbarProvider, enqueueSnackbar } from "notistack";
import { Logger } from "../types/Logger";

const StyledMaterialDesignContent = styled(MaterialDesignContent)(() => ({
  "&.notistack-MuiContent-success": {
    maxWidth: "16rem"
  },
  "&.notistack-MuiContent-error": {
    maxWidth: "16rem"
  }
}));

export function enqueueSuccessSnackbar(logger: Logger, message: string) {
  enqueueSnackbar(message, { variant: "success", autoHideDuration: 2000 });
  logger.log(message);
}

export function enqueueErrorSnackbar(logger: Logger, err: unknown) {
  const errMsg = err instanceof Error ? err.message : err + "";
  enqueueSnackbar(errMsg, { variant: "error" });
  logger.error(errMsg);
}

export function NoticeProvider() {
  return (
    <SnackbarProvider
      maxSnack={3}
      Components={{
        success: StyledMaterialDesignContent,
        error: StyledMaterialDesignContent
      }}
    />
  );
}
