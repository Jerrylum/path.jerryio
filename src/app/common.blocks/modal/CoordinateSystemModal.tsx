import { makeAutoObservable, action } from "mobx";
import { observer } from "mobx-react-lite";
import { Modal } from "./Modal";
import {
  Box,
  Card,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography
} from "@mui/material";

import { NamedCoordinateSystem, getNamedCoordinateSystems } from "@src/core/CoordinateSystem";
import { getAppStores } from "@src/core/MainApp";
import { UpdateProperties } from "@src/core/Command";
import { useMobxStorage } from "@src/core/Hook";
import "./CoordinateSystemModal.scss";
import InputIcon from "@mui/icons-material/Input";
import DoneIcon from "@mui/icons-material/Done";
import React from "react";

export const CoordinateSystemModalSymbol = Symbol("CoordinateSystemModal");

class CoordinateSystemVariables {
  selected: NamedCoordinateSystem | null = null;

  constructor() {
    makeAutoObservable(this);
  }
}

export const CoordinateSystemItem = observer(
  (props: { variables: CoordinateSystemVariables; system: NamedCoordinateSystem }) => {
    const { variables, system } = props;
    const { app, ui } = getAppStores();

    const isSelected = variables.selected?.name === system.name;

    const isUsing = system.name === app.gc.coordinateSystem;

    const onApply = action(() => {
      app.history.execute(
        `Change coordinate system to ${system.name}`,
        new UpdateProperties(app.gc, { coordinateSystem: system.name })
      );
      ui.closeModal(CoordinateSystemModalSymbol);
    });

    return (
      <ListItem
        className="CoordinateSystemsList-Item"
        disablePadding
        secondaryAction={
          !isUsing && (
            <Tooltip title="Apply This Coordinate System">
              <IconButton edge="end" className="CoordinateSystemsList-ItemApplyButton" onClick={action(onApply)}>
                <InputIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )
        }>
        <ListItemButton
          selected={isSelected}
          onClick={action(() => {
            variables.selected = system;
          })}>
          <ListItemText
            sx={{ textWrap: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            primary={
              <>
                {system.name}
                <Chip label="Local" size="small" sx={{ marginLeft: "8px" }} />
              </>
            }
          />
          {isUsing && <DoneIcon />}
        </ListItemButton>
      </ListItem>
    );
  }
);

export const CoordinateSystemList = observer((props: { variables: CoordinateSystemVariables }) => {
  const { variables } = props;
  const { app } = getAppStores();

  const systems = getNamedCoordinateSystems();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(
    action(() => {
      variables.selected = systems.find(system => system.name === app.gc.coordinateSystem) || systems[0];
    }),
    []
  );

  return (
    <Box>
      <Box id="CoordinateSystemsList">
        {/* Using the SVG viewBox solution to allow the use of min-height */}
        <svg viewBox="0 0 0.6 0.4"></svg>
        <Box id="CoordinateSystemsList-Content">
          <List dense>
            {systems.map(system => (
              <CoordinateSystemItem key={system.name} variables={variables} system={system} />
            ))}
          </List>
        </Box>
      </Box>
    </Box>
  );
});

export const CoordinateSystemSection = observer(() => {
  const variables = useMobxStorage(() => new CoordinateSystemVariables(), []);

  const selected = variables.selected;

  return (
    <Box>
      <Typography variant="h3" fontSize={18} gutterBottom>
        Frontend Coordinate System
      </Typography>
      <Box id="CoordinateSystem">
        <Box id="CoordinateSystems-Body">
          <CoordinateSystemList variables={variables} />
        </Box>
        {selected && (
          <Box id="CoordinateSystems-PreviewSection">
            <Box id="CoordinateSystems-ImagePreview">
              <svg viewBox="0 0 1 1"></svg>
              <Box component="img" src={selected.previewImageUrl} alt="" />
            </Box>
            <Box minHeight="100px">
              <Box marginTop="16px">
                <Typography variant="body1">{selected.name}</Typography>
              </Box>
              <Box marginTop="16px" minHeight="100px">
                <Typography variant="body1">{selected.description}</Typography>
              </Box>
            </Box>
          </Box>
        )}
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
