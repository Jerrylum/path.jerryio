import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteIcon from "@mui/icons-material/Delete";
import FiberManualRecordOutlinedIcon from "@mui/icons-material/FiberManualRecordOutlined";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import AddIcon from "@mui/icons-material/Add";
import KeyboardDoubleArrowDownIcon from "@mui/icons-material/KeyboardDoubleArrowDown";
import KeyboardDoubleArrowUpIcon from "@mui/icons-material/KeyboardDoubleArrowUp";
import { AccordionDetails, AccordionSummary, Box, Card, IconButton, Tooltip, Typography } from "@mui/material";
import { action } from "mobx";
import { observer, useLocalObservable } from "mobx-react-lite";
import { Segment, EndPointControl, Path } from "../core/Path";
import { AddPath, RemovePathsAndEndControls, UpdateInteractiveEntities } from "../core/Command";
import { useAppStores } from "../core/MainApp";
import { Quantity, UnitOfLength } from "../core/Unit";
import { InteractiveEntity, InteractiveEntityParent } from "../core/Canvas";
import classNames from "classnames";
import { useIsMacOS } from "../core/Util";
import React from "react";

interface PathTreeVariables {
  lastFocused: InteractiveEntity | undefined;
  rangeEnd: InteractiveEntity | undefined;
}

const TreeItem = observer(
  (props: {
    entity: InteractiveEntity;
    parent?: InteractiveEntity;
    isNameEditable?: boolean; // TODO
    variables: PathTreeVariables;
  }) => {
    const { app } = useAppStores();

    const { entity, parent, variables } = props;

    const isMacOS = useIsMacOS();

    const children = "children" in entity ? (entity as InteractiveEntityParent).children : undefined;
    const canDeleteBool = entity instanceof Path || entity instanceof EndPointControl;

    function onExpandIconClick(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
      event.stopPropagation();
      if (app.isExpanded(entity)) {
        app.removeExpanded(entity);
      } else {
        app.addExpanded(entity);
      }
    }

    function onLabelClick(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
      event.preventDefault();
      event.stopPropagation();
      if (event.shiftKey) {
        // TODO
        const entityFlattened = app.paths.flatMap(path => [path, ...path.controls]).map(entity => entity.uid);

        if (variables.lastFocused === undefined) return;

        const helper = function (fromUid: string, toUid: string, cb: (target: string) => void) {
          const fromIndex = entityFlattened.indexOf(fromUid);
          const toIndex = entityFlattened.indexOf(toUid);

          if (fromIndex === -1 || toIndex === -1) return;

          const a = Math.min(fromIndex, toIndex);
          const b = Math.max(fromIndex, toIndex);

          for (let i = a; i <= b; i++) {
            cb(entityFlattened[i]);
          }
        };

        if (variables.rangeEnd !== undefined) {
          helper(entity.uid, variables.rangeEnd.uid, app.unselect.bind(app));
        }

        helper(entity.uid, variables.lastFocused.uid, app.select.bind(app));

        variables.rangeEnd = entity;
      } else if (isMacOS ? event.metaKey : event.ctrlKey) {
        if (app.isSelected(entity)) {
          app.unselect(entity);
        } else {
          app.select(entity);
        }
        variables.lastFocused = entity;
        variables.rangeEnd = undefined;
      } else {
        app.setSelected([entity]);
        variables.lastFocused = entity;
        variables.rangeEnd = undefined;
      }
    }

    function onVisibleClick(event: React.MouseEvent<SVGSVGElement, MouseEvent>) {
      const setTo = !entity.visible;
      const affected = app.isSelected(entity) ? app.selectedEntities : [entity];

      app.history.execute(
        `Update entities visibility to ${setTo}`,
        new UpdateInteractiveEntities(affected, { visible: setTo }),
        0 // Disable merge
      );
    }

    function onLockClick(event: React.MouseEvent<SVGSVGElement, MouseEvent>) {
      const setTo = !entity.lock;
      const affected = app.isSelected(entity) ? app.selectedEntities : [entity];

      app.history.execute(
        `Update entities lock to ${setTo}`,
        new UpdateInteractiveEntities(affected, { lock: setTo }),
        0 // Disable merge
      );
    }

    function onDeleteClick(event: React.MouseEvent<SVGSVGElement, MouseEvent>) {
      const target = entity.uid; // ALGO: use uid to have better performance
      const affected = app.isSelected(target) ? app.selectedEntityIds : [target];
      const command = new RemovePathsAndEndControls(app.paths, affected);
      app.history.execute(`Remove paths and end controls`, command);
      for (const id of command.removedEntities) {
        app.unselect(id);
        app.removeExpanded(id);
      }
    }

    return (
      <li className="tree-item" onContextMenu={event => event.preventDefault()}>
        <div className={classNames("tree-item-content", { selected: app.isSelected(entity) })}>
          <div className="tree-item-icon-container" onClick={action(onExpandIconClick)}>
            {children !== undefined && (
              <>
                {app.isExpanded(entity) ? <ExpandMoreIcon fontSize="medium" /> : <ChevronRightIcon fontSize="medium" />}
              </>
            )}
          </div>
          <div className="tree-item-label" onClick={action(onLabelClick)}>
            <div className="tree-item-label-content">
              {/* TODO */}
              <span>{entity.name}</span>
              <span style={{ display: "inline-block", marginRight: "1em" }}></span>
              {entity.visible === true ? (
                parent?.visible === false ? (
                  <FiberManualRecordOutlinedIcon className="tree-func-icon show" onClick={action(onVisibleClick)} />
                ) : (
                  <VisibilityIcon className="tree-func-icon" onClick={action(onVisibleClick)} />
                )
              ) : (
                <VisibilityOffOutlinedIcon className="tree-func-icon show" onClick={action(onVisibleClick)} />
              )}
              {entity.lock === false ? (
                parent?.lock === true ? (
                  <FiberManualRecordOutlinedIcon className="tree-func-icon show" onClick={action(onLockClick)} />
                ) : (
                  <LockOpenIcon className="tree-func-icon" onClick={action(onLockClick)} />
                )
              ) : (
                <LockOutlinedIcon className="tree-func-icon show" onClick={action(onLockClick)} />
              )}
              {canDeleteBool && <DeleteIcon className="tree-func-icon" onClick={action(onDeleteClick)} />}
            </div>
          </div>
        </div>
        <ul className="tree-item-children-group">
          {app.isExpanded(entity) &&
            children?.map(child => <TreeItem key={child.uid} entity={child} parent={entity} variables={variables} />)}
        </ul>
      </li>
    );
  }
);

const PathTreeAccordionV2 = observer((props: {}) => {
  const { app } = useAppStores();

  function onAddPathClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    const cm60 = new Quantity<UnitOfLength>(60, UnitOfLength.Centimeter);
    const cm60inUOL = cm60.to(app.gc.uol);

    const newPath = new Path(
      app.format.buildPathConfig(),
      new Segment(new EndPointControl(-cm60inUOL, -cm60inUOL, 0), [], new EndPointControl(-cm60inUOL, cm60inUOL, 0))
    );
    app.history.execute(`Add path ${newPath.uid}`, new AddPath(app.paths, newPath));
    app.addExpanded(newPath);
  }

  function onExpandAllClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    if (app.expandedEntityIds.length !== app.paths.length) {
      app.clearExpanded();
      app.paths.forEach(path => app.addExpanded(path));
    } else {
      app.clearExpanded();
    }
  }

  const variables = useLocalObservable<PathTreeVariables>(() => ({
    lastFocused: undefined,
    rangeEnd: undefined
  }));

  return (
    <Card id="path-tree">
      <AccordionSummary>
        <Typography>Paths</Typography>
        <Box>
          <Tooltip title="Add New Path">
            <IconButton className="icon" onClick={action(onAddPathClick)}>
              <AddIcon />
            </IconButton>
          </Tooltip>
          {app.paths.length === 0 ? (
            <IconButton className="icon" onClick={action(onExpandAllClick)} disabled={app.paths.length === 0}>
              <KeyboardDoubleArrowUpIcon />
            </IconButton>
          ) : (
            <Tooltip title={app.expandedEntityIds.length !== app.paths.length ? "Expand All" : "Collapse All"}>
              <IconButton className="icon" onClick={action(onExpandAllClick)}>
                {app.expandedEntityIds.length !== app.paths.length ? (
                  <KeyboardDoubleArrowDownIcon />
                ) : (
                  <KeyboardDoubleArrowUpIcon />
                )}
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <ul className="tree-view">
          {app.paths.map(path => {
            return <TreeItem key={path.uid} entity={path} variables={variables} />;
          })}
        </ul>
      </AccordionDetails>
    </Card>
  );
});

export { PathTreeAccordionV2 };
