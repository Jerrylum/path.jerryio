import { Box } from "@mui/material";
import { observer } from "mobx-react-lite";
import { FormStyleButton } from "./FormStyleButton";
import MenuIcon from "@mui/icons-material/Menu";

export const OpenModalButton = observer((props: React.ComponentProps<typeof FormStyleButton>) => {
  const { children, ...rest } = props;

  return (
    <FormStyleButton {...rest}>
      <Box display="flex" gap="4px" alignItems="center" width="100%">
        <Box minWidth="0" overflow="hidden" textOverflow="ellipsis" sx={{ textWrap: "nowrap" }}>
          {children}
        </Box>
        <MenuIcon fontSize="inherit" />
      </Box>
    </FormStyleButton>
  );
});
