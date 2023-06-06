import { styled } from '@mui/material';
import { MaterialDesignContent, SnackbarProvider, enqueueSnackbar } from 'notistack'

const StyledMaterialDesignContent = styled(MaterialDesignContent)(() => ({
  '&.notistack-MuiContent-success': {
    maxWidth: '16rem',
  },
  '&.notistack-MuiContent-error': {
    maxWidth: '16rem',
  },
}));

export function enqueueSuccessSnackbar(message: string) {
  enqueueSnackbar(message, { variant: "success" });
}

export function enqueueErrorSnackbar(err: unknown) {
  console.log(err);
  const errMsg = err instanceof Error ? err.message : err + "";
  enqueueSnackbar(errMsg, { variant: "error" });
}

export function NoticeProvider() {
  return <SnackbarProvider maxSnack={3} Components={{
    success: StyledMaterialDesignContent,
    error: StyledMaterialDesignContent,
  }} />;
}
