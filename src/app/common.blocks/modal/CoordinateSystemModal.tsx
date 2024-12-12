import { makeAutoObservable, action } from "mobx";
import { observer } from "mobx-react-lite";
import { Modal } from "./Modal";
import {
  Box,
  Button,
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

import { NamedCoordinateSystem, getNamedCoordinateSystems } from "@core/CoordinateSystem";
import { getAppStores } from "@core/MainApp";
import { UpdateProperties } from "@core/Command";
import { useMobxStorage } from "@core/Hook";
import { LayoutContext, LayoutType } from "@core/Layout";
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

export const CoordinateSystemPreview = observer((props: { preview: NamedCoordinateSystem }) => {
  const { preview } = props;

  return (
    <Box id="CoordinateSystems-PreviewSection">
      <Box maxWidth="360px" width="100%">
        <Box id="CoordinateSystems-ImagePreview">
          <svg viewBox="0 0 1 1"></svg>
          <Box component="img" src={preview.previewImageUrl} alt="" />
        </Box>
      </Box>
      <Box minHeight="100px" width="100%">
        <Box marginTop="16px">
          <Typography variant="body1">{preview.name}</Typography>
        </Box>
        <Box marginTop="16px" minHeight="100px">
          <Typography variant="body1">{preview.description}</Typography>
        </Box>
      </Box>
    </Box>
  );
});

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

    const isMobileLayout = React.useContext(LayoutContext) === LayoutType.Mobile;

    return (
      <ListItem
        className="CoordinateSystemsList-Item"
        disablePadding
        secondaryAction={
          !isUsing &&
          !isMobileLayout && (
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
          {isUsing && !isMobileLayout && <DoneIcon />}
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
        <List dense>
          {systems.map(system => (
            <CoordinateSystemItem key={system.name} variables={variables} system={system} />
          ))}
        </List>
      </Box>
    </Box>
  );
});

export const CoordinateSystemSection = observer(() => {
  const { app, ui } = getAppStores();

  const variables = useMobxStorage(() => new CoordinateSystemVariables(), []);

  const selected = variables.selected;
  const hasSelected = !!selected;
  const isAppliedSelected = selected?.name === getAppStores().app.gc.coordinateSystem;

  const onApply = action(() => {
    if (!selected) return;

    app.history.execute(
      `Change coordinate system to ${selected.name}`,
      new UpdateProperties(app.gc, { coordinateSystem: selected.name })
    );

    ui.closeModal(CoordinateSystemModalSymbol);
  });

  const onClose = () => {
    ui.closeModal(CoordinateSystemModalSymbol);
  };

  const isMobileLayout = React.useContext(LayoutContext) === LayoutType.Mobile;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="left">
        <Typography className="CoordinateSystem-Title" variant="h3" fontSize={18} gutterBottom>
          Frontend Coordinate System
        </Typography>
        {isMobileLayout && (
          <Box textAlign="right">
            <Button onClick={onClose}>Back</Button>
          </Box>
        )}
      </Box>
      <Box id="CoordinateSystem-Body">
        <Box id="CoordinateSystems-LeftSide">
          <CoordinateSystemList variables={variables} />
        </Box>
        {selected && <CoordinateSystemPreview preview={selected} />}
      </Box>
      <Box marginTop="16px" display="flex" gap="8px" justifyContent="end" alignItems="center">
        <Typography variant="body2" color="textSecondary">
          Note: the coordinate system you choose does not affect the output file.
        </Typography>
        <Button
          variant="outlined"
          color="primary"
          disabled={!hasSelected || isAppliedSelected}
          disableElevation
          onClick={onApply}>
          {isAppliedSelected ? "Applied" : "Apply"}
        </Button>
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
