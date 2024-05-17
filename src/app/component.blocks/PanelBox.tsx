import { BoxProps, Box } from "@mui/material";
import { observer } from "mobx-react-lite";

export const PanelBox = observer((props: {} & BoxProps) => {
  const { ...rest } = props;

  return (
    <Box
      display="flex"
      flexDirection="row"
      flexWrap="nowrap"
      justifyContent="flex-start"
      alignItems="center"
      gap="8px"
      marginTop="8px"
      {...rest}
    />
  );
});
