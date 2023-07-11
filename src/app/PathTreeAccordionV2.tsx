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
import { action, makeAutoObservable } from "mobx";
import { observer } from "mobx-react-lite";
import { Segment, EndPointControl, Path, Control, PathTreeItem } from "../core/Path";
import {
  AddPath,
  MoveEndControl,
  MovePath,
  RemovePathsAndEndControls,
  UpdatePathTreeItems,
  UpdateProperties
} from "../core/Command";
import { useAppStores } from "../core/MainApp";
import { Quantity, UnitOfLength } from "../core/Unit";
import classNames from "classnames";
import { useIsMacOS } from "../core/Util";
import React from "react";

function getItemNameRegex() {
  return new RegExp(/^[^<>\r\n]+$/g); /* eslint-disable-line */
}

class PathTreeVariables {
  lastFocused: PathTreeItem | undefined = undefined;
  rangeEnd: PathTreeItem | undefined = undefined;

  dragging:
    | {
        entity: Path | EndPointControl;
        idx: number;
        dragOverIdx: number;
      }
    | undefined = undefined;

  constructor() {
    makeAutoObservable(this);
  }

  isDraggable(entity: PathTreeItem): boolean {
    return entity instanceof Path || entity instanceof EndPointControl;
  }

  isParentDragging(entity: PathTreeItem): boolean {
    return entity instanceof Control && this.dragging?.entity instanceof Path;
  }

  isAllowDrop(selfEntity: PathTreeItem): boolean {
    if (this.dragging === undefined) return true;

    if (this.dragging.entity instanceof Path) {
      if (selfEntity instanceof Path) {
        return this.dragging.entity !== selfEntity;
      } else {
        return false;
      }
    } else {
      // dragging entity is EndPointControl
      if (selfEntity instanceof EndPointControl) {
        return this.dragging.entity !== selfEntity;
      } else if (selfEntity instanceof Control) {
        return true;
      } else {
        return true;
      }
    }
  }
}

const TreeItem = observer((props: { entity: PathTreeItem; parent?: Path; variables: PathTreeVariables }) => {
  const { app } = useAppStores();

  const { entity, parent, variables } = props;

  const isMacOS = useIsMacOS();

  const initialValue = React.useRef(entity.name);
  const lastValidName = React.useRef(entity.name);

  const entityIdx = app.allEntityIds.indexOf(entity.uid);
  const isNameEditable = entity instanceof Path;
  const children = entity instanceof Path ? entity.controls : undefined;
  const isDraggable = variables.isDraggable(entity);
  const isParentDragging = variables.isParentDragging(entity);
  const allowDrop = variables.isAllowDrop(entity);
  const showDraggingDivider = allowDrop && entityIdx === variables.dragging?.dragOverIdx;

  function onItemNameChange(event: React.FormEvent<HTMLSpanElement>) {
    const candidate = event.currentTarget.innerText;
    if (!getItemNameRegex().test(candidate) && candidate.length !== 0) {
      event.preventDefault();

      event.currentTarget.innerText = lastValidName.current;
    } else {
      lastValidName.current = event.currentTarget.innerText;
    }
  }

  function onItemNameKeyDown(event: React.KeyboardEvent<HTMLSpanElement>) {
    if (event.code === "Enter" || event.code === "NumpadEnter") {
      event.preventDefault();
      event.currentTarget.blur();

      onItemNameConfirm(event);
    }
  }

  function onItemNameConfirm(event: React.SyntheticEvent<HTMLSpanElement, Event>) {
    if (event.currentTarget.innerText === "") event.currentTarget.innerText = initialValue.current;
    const pathName = (initialValue.current = lastValidName.current = event.currentTarget.innerText);

    app.history.execute(`Update path tree item name to ${pathName}`, new UpdateProperties(entity, { name: pathName }));
  }

  function onDraggableFalseMouseDown(event: React.MouseEvent<HTMLLIElement, MouseEvent>) {
    event.stopPropagation();
    event.preventDefault();
  }

  function onDragStart(event: React.DragEvent<HTMLLIElement>) {
    event.stopPropagation();

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/path-dot-jerryio-entity-uid", entity.uid);

    variables.dragging = {
      entity: entity as Path | EndPointControl,
      idx: entityIdx,
      dragOverIdx: entityIdx
    };
  }

  function onDragEnter(event: React.DragEvent<HTMLLIElement>) {
    event.stopPropagation();
  }

  function onDragLeave(event: React.DragEvent<HTMLLIElement>) {
    event.stopPropagation();
  }

  function onDragOver(event: React.DragEvent<HTMLLIElement>) {
    event.stopPropagation();
    event.preventDefault();
    const isEntityDragging = event.dataTransfer.types.includes("application/path-dot-jerryio-entity-uid");
    if (isEntityDragging === false) return;
    if (variables.dragging === undefined) return;

    variables.dragging.dragOverIdx = entityIdx;
  }

  function onDragEnd(event: React.DragEvent<HTMLLIElement>) {
    variables.dragging = undefined;
  }

  function onDrop(event: React.DragEvent<HTMLLIElement>) {
    event.stopPropagation();
    event.preventDefault();
    if (allowDrop === false) return;
    if (variables.dragging === undefined) return;
    const isEntityDragging = event.dataTransfer.getData("application/path-dot-jerryio-entity-uid");
    if (isEntityDragging !== variables.dragging.entity.uid) return;

    const moving = variables.dragging.entity;
    if (moving instanceof Path) {
      if (entity instanceof Path === false) return;

      const fromIdx = app.paths.indexOf(moving);
      const toIdx = app.paths.indexOf(entity as Path); // ALGO: Can be used directly, because the path is removed from the array before inserting it back
      variables.dragging = undefined; // ALGO: import to set to undefined before executing the command, because the command will trigger a re-render

      app.history.execute(`Move path ${moving.uid}`, new MovePath(app.paths, fromIdx, toIdx));
    } else {
      const fromIdx = variables.dragging.idx;
      const toIdx = entityIdx;
      variables.dragging = undefined; // ALGO: import to set to undefined before executing the command, because the command will trigger a re-render

      app.history.execute(`Move end control ${moving.uid}`, new MoveEndControl(app.allEntities, fromIdx, toIdx));
    }
  }

  function onExpandIconClick(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    event.stopPropagation();
    if (entity instanceof Path) {
      if (app.isExpanded(entity)) {
        app.removeExpanded(entity);
      } else {
        app.addExpanded(entity);
      }
    }
  }

  function onLabelClick(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    event.preventDefault();
    event.stopPropagation();
    if (event.shiftKey) {
      if (variables.lastFocused === undefined) return;

      const entityFlattened = app.allEntityIds;

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
      new UpdatePathTreeItems(affected, { visible: setTo }),
      0 // Disable merge
    );
  }

  function onLockClick(event: React.MouseEvent<SVGSVGElement, MouseEvent>) {
    const setTo = !entity.lock;
    const affected = app.isSelected(entity) ? app.selectedEntities : [entity];

    app.history.execute(
      `Update entities lock to ${setTo}`,
      new UpdatePathTreeItems(affected, { lock: setTo }),
      0 // Disable merge
    );
  }

  function onDeleteClick(event: React.MouseEvent<SVGSVGElement, MouseEvent>) {
    const target = entity.uid; // ALGO: use uid to have better performance
    const affected = app.isSelected(target) ? app.selectedEntityIds : [target];
    const command = new RemovePathsAndEndControls(app.paths, affected);
    app.history.execute(`Remove paths and end controls`, command);
  }

  return (
    <li
      className={classNames("tree-item", {
        "dragging-divider-bottom":
          showDraggingDivider && entityIdx > variables.dragging!.idx && variables.dragging!.entity instanceof Path
      })}
      onContextMenu={event => event.preventDefault()}
      draggable={isDraggable}
      {...(!isParentDragging
        ? {
            onDragStart: action(onDragStart),
            onDragEnd: action(onDragEnd),
            onDragEnter: action(onDragEnter),
            onDragOver: action(onDragOver),
            onDragLeave: action(onDragLeave),
            onDrop: action(onDrop)
          }
        : {})}
      {...(!isDraggable && { onMouseDown: action(onDraggableFalseMouseDown) })}>
      <div
        className={classNames("tree-item-content", {
          selected: app.isSelected(entity),
          "deny-drop": !allowDrop,
          "dragging-divider-top": showDraggingDivider && entityIdx <= variables.dragging!.idx,
          "dragging-divider-bottom":
            showDraggingDivider &&
            entityIdx > variables.dragging!.idx &&
            variables.dragging!.entity instanceof Path === false
        })}>
        <div className="tree-item-icon-container" onClick={action(onExpandIconClick)}>
          {children !== undefined && (
            <>
              {app.isExpanded(entity as Path) ? (
                <ExpandMoreIcon fontSize="medium" />
              ) : (
                <ChevronRightIcon fontSize="medium" />
              )}
            </>
          )}
        </div>
        <div className="tree-item-label" onClick={action(onLabelClick)}>
          <div className="tree-item-label-content">
            {isNameEditable ? (
              <span
                contentEditable
                style={{ display: "inline-block" }}
                onInput={e => onItemNameChange(e)}
                onKeyDown={action(onItemNameKeyDown)}
                onBlur={action(onItemNameConfirm)}
                suppressContentEditableWarning={true}
                dangerouslySetInnerHTML={{ __html: initialValue.current }} // SECURITY: Beware of XSS attack from the path file
                onClick={e => e.preventDefault()}
              />
            ) : (
              <span>{entity.name}</span>
            )}

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
            {isDraggable && <DeleteIcon className="tree-func-icon" onClick={action(onDeleteClick)} />}
          </div>
        </div>
      </div>
      <ul className="tree-item-children-group">
        {children !== undefined &&
          app.isExpanded(entity as Path) &&
          children.map(child => (
            <TreeItem key={child.uid} entity={child} parent={entity as Path} variables={variables} />
          ))}
      </ul>
    </li>
  );
});

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

  function onDragEnter(event: React.DragEvent<HTMLDivElement>) {
    // console.log("onDragEnter");
  }

  function onDragLeave(event: React.DragEvent<HTMLDivElement>) {
    // console.log("onDragLeave");
  }

  const [variables] = React.useState(() => new PathTreeVariables());

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
      <AccordionDetails onDragEnter={onDragEnter} onDragLeave={onDragLeave}>
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

