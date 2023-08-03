import { observer } from "mobx-react-lite";

import { getAppStores } from "../core/MainApp";

import MenuIcon from "@mui/icons-material/Menu";
import ViewListIcon from "@mui/icons-material/ViewList";
import TuneIcon from "@mui/icons-material/Tune";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import LinearScaleIcon from "@mui/icons-material/LinearScale";
import WidgetsIcon from "@mui/icons-material/Widgets";
import TimelineIcon from "@mui/icons-material/Timeline";
import { Box } from "@mui/material";

const PanelIconBox = observer((props: {}) => {
  const { app, help, appPreferences, clipboard } = getAppStores();

  return (
    <>
      <Box id="panel-icon-box" style={{ left: "1vh", top: "1vh" }}>
        <Box className="panel-icon">
          <MenuIcon fontSize="large" />
        </Box>
        <Box className="panel-icon">
          <ViewListIcon fontSize="large" />
        </Box>
      </Box>
      <Box id="panel-icon-box" style={{ right: "1vh", top: "1vh" }}>
        <Box className="panel-icon">
          <TuneIcon fontSize="large" />
        </Box>
        <Box className="panel-icon">
          <FiberManualRecordIcon fontSize="large" />
        </Box>
        <Box className="panel-icon">
          <LinearScaleIcon fontSize="large" />
        </Box>
        <Box className="panel-icon">
          <WidgetsIcon fontSize="large" />
        </Box>
        <Box className="panel-icon">
          <TimelineIcon fontSize="large" />
        </Box>
      </Box>
    </>
  );
});

export { PanelIconBox };
