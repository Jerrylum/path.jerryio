import { observer } from "mobx-react-lite";
import "./CoordinateSystemModal.scss";
import { Modal } from "./Modal";
import { Box, Card, Typography } from "@mui/material";

export const CoordinateSystemModalSymbol = Symbol("CoordinateSystemModal");

export const CoordinateSystemSection = observer(() => {
  return (
    <Box>
      <Typography variant="h3" fontSize={18} gutterBottom>
        Field Image
      </Typography>
      <Box id="CoordinateSystem">
        <Box id="CoordinateSystems-Body"></Box>
        <Box id="CoordinateSystems-PreviewSection"></Box>
      </Box>
    </Box>
  );
});

export const CoordinateSystemModal = observer(() => {
  return (
    <Modal symbol={CoordinateSystemModalSymbol}>
      <Card id="CoordinateSystemModal" className="Modal-Container">
        <CoordinateSystemSection />
      </Card>
    </Modal>
  );
});
