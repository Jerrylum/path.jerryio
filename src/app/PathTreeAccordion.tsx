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
import { Segment, EndControl, Path, Control, PathTreeItem } from "../core/Path";
import {
  AddPath,
  MovePathTreeItem,
  MovePath,
  RemovePathsAndEndControls,
  UpdatePathTreeItems,
  UpdateProperties
} from "../core/Command";
import { getAppStores } from "../core/MainApp";
import { Quantity, UnitOfLength } from "../core/Unit";
import classNames from "classnames";
import { IS_MAC_OS } from "../core/Util";
import React from "react";
import { APP_VERSION_STRING } from "../Version";

const MIME_TYPE = `application/x-item-uid-path.jerryio.com-${APP_VERSION_STRING}`;

function getItemNameRegex() {
  return new RegExp(/^[^<>\r\n]+$/g); /* eslint-disable-line */
}

function touchItem(
  variables: PathTreeVariables,
  entity: PathTreeItem,
  isRangeSelect: boolean,
  isMultiSelect: boolean,
  isSelectSingleItem: boolean
) {
  const { app } = getAppStores();

  if (isRangeSelect) {
    if (variables.rangeStart === undefined) return;

    const entities = app.allNavigableEntityIds;

    const helper = function (fromUid: string, toUid: string, cb: (target: string) => void) {
      const fromIndex = entities.indexOf(fromUid);
      const toIndex = entities.indexOf(toUid);

      if (fromIndex === -1 || toIndex === -1) return;

      const a = Math.min(fromIndex, toIndex);
      const b = Math.max(fromIndex, toIndex);

      for (let i = a; i <= b; i++) {
        cb(entities[i]);
      }
    };

    if (variables.rangeEnd !== undefined) {
      helper(entity.uid, variables.rangeEnd.uid, app.unselect.bind(app));
    }

    helper(entity.uid, variables.rangeStart.uid, app.select.bind(app));

    variables.rangeEnd = entity;
  } else if (isMultiSelect) {
    if (app.isSelected(entity)) {
      app.unselect(entity);
    } else {
      app.select(entity);
    }
    variables.rangeStart = entity;
    variables.rangeEnd = undefined;
  } else if (isSelectSingleItem) {
    app.setSelected([entity]);
    variables.rangeStart = entity;
    variables.rangeEnd = undefined;
  } else {
    variables.rangeStart = entity;
    variables.rangeEnd = undefined;
  }
  variables.focused = entity;
}

function moveItem(variables: PathTreeVariables, dropTo: PathTreeItem, draggingEntityId: string) {
  const { app } = getAppStores();

  const dropToIdx = app.allEntities.indexOf(dropTo);
  const allowDrop = variables.isAllowDrop(dropTo);

  if (allowDrop === false) return;
  if (variables.dragging === undefined) return;
  if (draggingEntityId !== variables.dragging.entity.uid) return;

  const moving = variables.dragging.entity;
  if (moving instanceof Path) {
    if (dropTo instanceof Path === false) return;

    const fromIdx = app.paths.indexOf(moving);
    const toIdx = app.paths.indexOf(dropTo as Path); // ALGO: Can be used directly, because the path is removed from the array before inserting it back
    variables.dragging = undefined; // IMPORTANT: Set to undefined before executing the command, because the command will trigger a re-render

    app.history.execute(`Move path ${moving.uid}`, new MovePath(app.paths, fromIdx, toIdx));
  } else {
    const fromIdx = variables.dragging.idx;
    const toIdx = dropToIdx;
    variables.dragging = undefined; // IMPORTANT: Set to undefined before executing the command, because the command will trigger a re-render

    app.history.execute(`Move path tree item ${moving.uid}`, new MovePathTreeItem(app.allEntities, fromIdx, toIdx));
  }
}

class PathTreeVariables {
  // UX: Arrow keys
  focused: PathTreeItem | undefined = undefined;
  // UX: Left click or Arrow keys
  rangeStart: PathTreeItem | undefined = undefined;
  // UX: Shift + Left click or Shift + Arrow keys
  rangeEnd: PathTreeItem | undefined = undefined;

  dragging:
    | {
        entity: Path | EndControl;
        idx: number;
        dragOverIdx: number;
      }
    | undefined = undefined;

  constructor() {
    makeAutoObservable(this);
  }

  isDraggable(entity: PathTreeItem): boolean {
    return entity instanceof Path || entity instanceof EndControl;
  }

  isParentDragging(entity: PathTreeItem): boolean {
    return (entity instanceof Control || entity instanceof EndControl) && this.dragging?.entity instanceof Path;
  }

  isAllowDrop(destEntity: PathTreeItem): boolean {
    if (this.dragging === undefined) return true;

    if (this.dragging.entity instanceof Path) {
      if (destEntity instanceof Path) {
        return this.dragging.entity !== destEntity;
      } else {
        return false;
      }
    } else {
      // dragging entity is EndControl
      if (destEntity instanceof EndControl) {
        return this.dragging.entity !== destEntity;
      } else if (destEntity instanceof Control) {
        return true;
      } else {
        return true;
      }
    }
  }
}

interface TreeItemProps {
  entity: PathTreeItem;
  parent?: Path;
  variables: PathTreeVariables;
  treeViewRef: React.RefObject<HTMLUListElement>;
}

const TreeItem = observer((props: TreeItemProps) => {
  const { app } = getAppStores();

  const { entity, parent, variables, treeViewRef } = props;

  const nameRef = React.useRef<HTMLSpanElement>(null);
  const initialValue = React.useRef(entity.name);
  const lastValidName = React.useRef(entity.name);
  const [isEditingName, setIsEditingName] = React.useState(false);

  const entityIdx = app.allEntityIds.indexOf(entity.uid);
  const children = entity instanceof Path ? entity.controls : undefined;
  const isNameEditable = entity instanceof Path;
  const isDraggable = variables.isDraggable(entity);
  const isParentDragging = variables.isParentDragging(entity);
  const isFocused = variables.focused === entity;
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

      // UX: Press enter to confirm name change
      onItemNameConfirm(event);
    } else if (event.code === "Escape") {
      event.preventDefault();
      event.currentTarget.innerText = initialValue.current;
      event.currentTarget.blur();

      // UX: Press escape to cancel name change
      onItemNameConfirm(event);
    }
  }

  function onItemNameDoubleClick(event: React.MouseEvent<HTMLSpanElement, MouseEvent>) {
    setIsEditingName(true);
  }

  React.useEffect(() => {
    if (isEditingName && nameRef.current) {
      // UX: Highlight all text when editing name
      // ALGO: This should be called after contenteditable is true
      // See: https://stackoverflow.com/a/4238971/11571888
      const range = document.createRange();
      range.selectNodeContents(nameRef.current);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isEditingName]);

  function onItemNameConfirm(event: React.SyntheticEvent<HTMLSpanElement, Event>) {
    if (event.currentTarget.innerText === "") event.currentTarget.innerText = initialValue.current;
    const pathName = (initialValue.current = lastValidName.current = event.currentTarget.innerText);

    app.history.execute(`Update path tree item name to ${pathName}`, new UpdateProperties(entity, { name: pathName }));
    setIsEditingName(false);
  }

  function onDraggableFalseMouseDown(event: React.MouseEvent<HTMLLIElement, MouseEvent>) {
    event.stopPropagation();
    event.preventDefault();
    // UX: Make it possible to click control to focus on the tree view and use keyboard navigation
    treeViewRef.current?.focus();
  }

  function onDragStart(event: React.DragEvent<HTMLLIElement>) {
    event.stopPropagation();

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(MIME_TYPE, entity.uid);

    variables.dragging = {
      entity: entity as Path | EndControl,
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
    const isEntityDragging = event.dataTransfer.types.includes(MIME_TYPE);
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
    moveItem(variables, entity, event.dataTransfer.getData(MIME_TYPE));
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
    touchItem(variables, entity, event.shiftKey, IS_MAC_OS ? event.metaKey : event.ctrlKey, true);
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
      onMouseEnter={action(() => children === undefined && (app.hoverItem = entity.uid))}
      onMouseMove={action(() => children === undefined && (app.hoverItem = entity.uid))}
      onMouseLeave={action(() => (app.hoverItem = undefined))}
      onContextMenu={event => event.preventDefault()}
      draggable={isDraggable && !isEditingName} /* UX: No dragging path name */
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
          focused: isFocused,
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
          {isNameEditable ? (
            <span
              className={classNames("tree-item-name", { preview: !isEditingName, edit: isEditingName })}
              onInput={e => onItemNameChange(e)}
              onKeyDown={action(onItemNameKeyDown)}
              onDoubleClick={action(onItemNameDoubleClick)}
              onBlur={action(onItemNameConfirm)}
              ref={nameRef}
              {...(isEditingName
                ? {
                    contentEditable: true,
                    suppressContentEditableWarning: true,
                    dangerouslySetInnerHTML: { __html: initialValue.current } // SECURITY: Beware of XSS attack from the path file
                  }
                : {
                    children: entity.name,
                    title: entity.name
                  })}
              onClick={e => e.preventDefault()}
            />
          ) : (
            <span className="tree-item-name preview">{entity.name}</span>
          )}
          {isEditingName === false && (
            <>
              {isDraggable && <DeleteIcon className="tree-func-icon" onClick={action(onDeleteClick)} />}
              {entity.lock === false ? (
                parent?.lock === true ? (
                  <FiberManualRecordOutlinedIcon className="tree-func-icon show" onClick={action(onLockClick)} />
                ) : (
                  <LockOpenIcon className="tree-func-icon" onClick={action(onLockClick)} />
                )
              ) : (
                <LockOutlinedIcon className="tree-func-icon show" onClick={action(onLockClick)} />
              )}
              {entity.visible === true ? (
                parent?.visible === false ? (
                  <FiberManualRecordOutlinedIcon className="tree-func-icon show" onClick={action(onVisibleClick)} />
                ) : (
                  <VisibilityIcon className="tree-func-icon" onClick={action(onVisibleClick)} />
                )
              ) : (
                <VisibilityOffOutlinedIcon className="tree-func-icon show" onClick={action(onVisibleClick)} />
              )}
            </>
          )}
        </div>
      </div>
      <ul className="tree-item-children-group">
        {children !== undefined &&
          app.isExpanded(entity as Path) &&
          children.map(child => (
            <TreeItem
              key={child.uid}
              entity={child}
              parent={entity as Path}
              variables={variables}
              treeViewRef={treeViewRef}
            />
          ))}
      </ul>
    </li>
  );
});

const TreeView = observer((props: { variables: PathTreeVariables }) => {
  const { app } = getAppStores();

  const { variables } = props;

  // TODO: Left click to focus on the tree view

  function pressSpaceToToggleSelection(e: React.KeyboardEvent<HTMLUListElement>): boolean {
    const current = variables.focused;
    if (current === undefined) return false;

    touchItem(variables, current, false, true, false);

    return true;
  }

  function pressEnterToToggleExpansionOrSelection(e: React.KeyboardEvent<HTMLUListElement>): boolean {
    const current = variables.focused;
    if (current === undefined) return false;

    if (current instanceof Path) {
      if (app.isExpanded(current)) app.removeExpanded(current);
      else app.addExpanded(current);
    } else {
      touchItem(variables, current, false, true, false);
    }

    return true;
  }

  function focusPrevious(e: React.KeyboardEvent<HTMLUListElement>): boolean {
    const entities = app.allNavigableEntities;

    let idx: number;

    if (variables.focused === undefined) {
      // if the list is empty, idx = -1
      idx = entities.length - 1;
    } else {
      const current = entities.indexOf(variables.focused);
      if (current === -1) {
        idx = entities.length - 1;
      } else {
        idx = Math.max(0, current - 1);
      }
    }

    if (idx >= 0 && idx < entities.length) {
      touchItem(variables, entities[idx], e.shiftKey, false, false);
    } else {
      variables.focused = undefined;
    }

    return variables.focused !== undefined;
  }

  function focusNext(e: React.KeyboardEvent<HTMLUListElement>): boolean {
    const entities = app.allNavigableEntities;

    let idx: number;

    if (variables.focused === undefined) {
      // if the list is empty, idx = 0 and target = undefined
      idx = 0;
    } else {
      const current = entities.indexOf(variables.focused);
      if (current === -1) {
        idx = 0;
      } else {
        idx = Math.min(entities.length - 1, current + 1);
      }
    }

    if (idx >= 0 && idx < entities.length) {
      touchItem(variables, entities[idx], e.shiftKey, false, false);
    } else {
      variables.focused = undefined;
    }

    return variables.focused !== undefined;
  }

  function focusParent(e: React.KeyboardEvent<HTMLUListElement>): boolean {
    const current = variables.focused;
    if (current === undefined || current instanceof Path) return false;

    const path = app.paths.find(path => path.controls.includes(current));
    if (path === undefined) return false;

    touchItem(variables, path, false, false, false);

    return true;
  }

  function focusFirstChild(e: React.KeyboardEvent<HTMLUListElement>): boolean {
    const current = variables.focused;
    if (current === undefined || current instanceof Control || current instanceof EndControl) return false;

    const control = current.controls[0];
    if (control === undefined || app.allNavigableEntities.includes(control) === false) return false;

    touchItem(variables, control, false, false, false);

    return true;
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    let flag: boolean;

    const key = e.key;

    if (key === " ") {
      flag = pressSpaceToToggleSelection(e);
    } else if (key === "Enter") {
      flag = pressEnterToToggleExpansionOrSelection(e);
    } else if (key === "ArrowUp") {
      flag = focusPrevious(e);
    } else if (key === "ArrowDown") {
      flag = focusNext(e);
    } else if (key === "ArrowLeft") {
      flag = focusParent(e);
    } else if (key === "ArrowRight") {
      flag = focusFirstChild(e);
    } else {
      flag = false;
    }

    if (flag === true) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (variables.focused !== undefined) {
      app.hoverItem = variables.focused instanceof Path ? undefined : variables.focused.uid;
    }
  }

  function onBlur() {
    if (app.hoverItem === variables.focused?.uid) app.hoverItem = undefined;
    variables.focused = undefined;
  }

  function onDrop(event: React.DragEvent<HTMLUListElement>) {
    event.stopPropagation();
    event.preventDefault();
    const entities = app.allEntities; // UX: It is acceptable to drop an entity to the end of the last path
    if (entities.length === 0) return;

    // ALGO: Find the last entity that is allowed to drop
    let entity: PathTreeItem | undefined;
    for (let i = entities.length - 1; i >= 0; i--) {
      const e = entities[i];
      if (variables.isAllowDrop(e)) {
        entity = e;
        break;
      }
    }

    if (entity === undefined) return;
    moveItem(variables, entity, event.dataTransfer.getData(MIME_TYPE));
  }

  const ref = React.useRef<HTMLUListElement>(null);

  return (
    <ul
      className="tree-view"
      ref={ref}
      tabIndex={0}
      onKeyDown={action(onKeyDown)}
      onBlur={action(onBlur)}
      onDrop={action(onDrop)}>
      {app.paths.map(path => {
        return <TreeItem key={path.uid} entity={path} variables={props.variables} treeViewRef={ref} />;
      })}
    </ul>
  );
});

function onAddPathClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
  const { app } = getAppStores();

  const cm60 = new Quantity<UnitOfLength>(60, UnitOfLength.Centimeter);
  const cm60inUOL = cm60.to(app.gc.uol);

  const newPath = app.format.createPath(
    new Segment(new EndControl(-cm60inUOL, -cm60inUOL, 0), new EndControl(-cm60inUOL, cm60inUOL, 0))
  );
  app.history.execute(`Add path ${newPath.uid}`, new AddPath(app.paths, newPath));
  app.addExpanded(newPath);
}

function onExpandAllClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
  const { app } = getAppStores();

  if (app.expandedEntityIds.length !== app.paths.length) {
    app.clearExpanded();
    app.paths.forEach(path => app.addExpanded(path));
  } else {
    app.clearExpanded();
  }
}

const PathTreeAccordion = observer((props: {}) => {
  const { app } = getAppStores();

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
      <AccordionDetails>
        <TreeView variables={variables} />
      </AccordionDetails>
    </Card>
  );
});

const PathTreeFloatingPanel = observer((props: {}) => {
  const { app } = getAppStores();
  const [variables] = React.useState(() => new PathTreeVariables());

  return (
    <Box id="path-tree" className="floating-panel">
      <Box id="path-tree-title">
        <Typography className="floating-panel-title">Paths</Typography>
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
      </Box>
      <TreeView variables={variables} />
      {app.paths.length === 0 && <Typography>(The file is empty)</Typography>}
    </Box>
  );
});

export { PathTreeAccordion, PathTreeFloatingPanel };
