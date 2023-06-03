import { action } from "mobx"
import DoneIcon from '@mui/icons-material/Done';
import { Button, Card, Divider, ListItemIcon, ListItemText, Menu, MenuItem, MenuList, Typography } from '@mui/material';
import { observer } from "mobx-react-lite";
import { AppProps } from "../App";

import { lightTheme, darkTheme } from "./Theme";
import React from "react";

const MenuAccordion = observer((props: AppProps) => {

  const [isOpenEditMenu, setIsOpenEditMenu] = React.useState(false);

  function onThemeChange() {
    props.app.theme = props.app.theme.palette.mode === lightTheme.palette.mode ? darkTheme : lightTheme;
  }

  return (
    <Card id="main-menu">
      <Button size="small" color="inherit" variant="text">File</Button>
      <Button size="small" color="inherit" variant="text" id="menu-edit-btn" onClick={() => setIsOpenEditMenu(!isOpenEditMenu)}>Edit</Button>
      <Button size="small" color="inherit" variant="text">View</Button>
      <Button size="small" color="inherit" variant="text" onClick={action(onThemeChange)}>Help</Button>

      <Menu anchorEl={document.getElementById('menu-edit-btn')} MenuListProps={{ dense: true }}
        open={isOpenEditMenu} onClose={() => setIsOpenEditMenu(false)}>
        <MenuItem>
          <DoneIcon />
          <ListItemText>Undo</ListItemText>
          <Typography variant="body2" color="text.secondary">Ctrl+Z</Typography>
        </MenuItem>
        <MenuItem>
          <DoneIcon sx={{visibility: "hidden"}} />
          <ListItemText>Redo</ListItemText>
          <Typography variant="body2" color="text.secondary">Ctrl+Y</Typography>
        </MenuItem>
        <Divider />
        <MenuItem>
          <DoneIcon sx={{visibility: "hidden"}} />
          <ListItemText sx={{ marginRight: "1rem" }}>Select all</ListItemText>
          <Typography variant="body2" color="text.secondary">Ctrl+A</Typography>
        </MenuItem>
        <MenuItem>
          <DoneIcon sx={{visibility: "hidden"}} />
          <ListItemText sx={{ marginRight: "1rem" }}>Select none</ListItemText>
          <Typography variant="body2" color="text.secondary"></Typography>
        </MenuItem>
        <MenuItem>
          <DoneIcon sx={{visibility: "hidden"}} />
          <ListItemText sx={{ marginRight: "1rem" }}>Select inverse</ListItemText>
          <Typography variant="body2" color="text.secondary">Ctrl+Shift+A</Typography>
        </MenuItem>
      </Menu>
    </Card>
  );
});

export { MenuAccordion };