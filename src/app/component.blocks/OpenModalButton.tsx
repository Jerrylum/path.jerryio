import { Box } from "@mui/material";
import { observer } from "mobx-react-lite";
import { FormButton } from "./FormButton";
import MenuIcon from "@mui/icons-material/Menu";

export const OpenModalButton = observer((props: React.ComponentProps<typeof FormButton>) => {
  const { children, ...rest } = props;

  return (
    <FormButton {...rest}>
      <Box display="flex" gap="4px" alignItems="center" width="100%">
        <Box minWidth="0" overflow="hidden" textOverflow="ellipsis" sx={{ textWrap: "nowrap" }}>
          {children}
        </Box>
        <MenuIcon fontSize="inherit" />
      </Box>
    </FormButton>
  );
});
