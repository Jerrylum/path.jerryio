import { styled } from "@mui/material";
import { MaterialDesignContent, SnackbarProvider, enqueueSnackbar } from "notistack";
import { Logger } from "../core/Logger";

const StyledMaterialDesignContent = styled(MaterialDesignContent)(() => ({
  "&.notistack-MuiContent-success": {
    maxWidth: "16rem"
  },
  "&.notistack-MuiContent-error": {
    maxWidth: "16rem"
  }
}));

export function enqueueSuccessSnackbar(logger: Logger, message: string, autoHideDuration: number | null = 2000) {
  logger.log(message);
  return enqueueSnackbar(message, { variant: "success", autoHideDuration });
}

export function enqueueInfoSnackbar(logger: Logger, message: string, autoHideDuration: number | null = 2000) {
  logger.log(message);
  return enqueueSnackbar(message, { variant: "info", autoHideDuration });
}

export function enqueueErrorSnackbar(logger: Logger, err: unknown, autoHideDuration: number | null = 2000) {
  const errMsg = err instanceof Error ? err.message : err + "";
  logger.error(errMsg);
  return enqueueSnackbar(errMsg, { variant: "error", autoHideDuration });
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

