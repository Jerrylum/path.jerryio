import DeleteIcon from '@mui/icons-material/Delete';
import FiberManualRecordOutlinedIcon from '@mui/icons-material/FiberManualRecordOutlined';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';

import { action } from "mobx"
import { observer } from "mobx-react-lite";
import { TreeItem } from '@mui/lab';
import { AppProps } from '../App';
import { EndPointControl, Path } from '../math/path';
import { useRef } from 'react';
import { InteractiveEntity } from '../math/canvas';

export interface PathTreeProps extends AppProps {
  path: Path;
}

export interface PathTreeItemLabelProps extends PathTreeProps {
  entity: InteractiveEntity;
  parent?: InteractiveEntity;
  onDelete?: () => void;
  children?: React.ReactNode;
}

export function getPathNameRegex() {
  return new RegExp(/^[^<>\r\n]+$/g); /* eslint-disable-line */
}

const PathTreeItemLabel = observer((props: PathTreeItemLabelProps) => {
  const entity = props.entity;
  const parent = props.parent;

  function onVisibleClick(event: React.MouseEvent<SVGSVGElement, MouseEvent>) {
    const setTo = !entity.visible;

    if (props.app.isSelected(entity.uid)) { // UX: batch operation only if the entity is selected
      for (let path of props.paths) {
        for (let control of path.getControlsSet()) {
          if (props.app.isSelected(control.uid)) control.visible = setTo;
        }
      }
    }


    entity.visible = setTo;
  }

  function onLockClick(event: React.MouseEvent<SVGSVGElement, MouseEvent>) {
    const setTo = !entity.lock;

    if (props.app.isSelected(entity.uid)) { // UX: batch operation only if the entity is selected
      for (let path of props.paths) {
        for (let control of path.getControlsSet()) {
          if (props.app.isSelected(control.uid)) control.lock = setTo;
        }
      }
    }

    entity.lock = setTo;
  }

  return (
    <div className='tree-node-label'>
      {props.children}
      <span style={{ display: "inline-block", marginRight: "1em" }}></span>
      {
        entity.visible
          ? (
            parent !== undefined && parent.visible === false
              ? <FiberManualRecordOutlinedIcon className='tree-node-func-icon show' onClick={onVisibleClick} />
              : <VisibilityIcon className='tree-node-func-icon' onClick={onVisibleClick} />
          )
          : <VisibilityOffOutlinedIcon className='tree-node-func-icon show' onClick={onVisibleClick} />
      }
      {
        entity.lock === false
          ? (
            parent !== undefined && parent.lock === true
              ? <FiberManualRecordOutlinedIcon className='tree-node-func-icon show' onClick={onLockClick} />
              : <LockOpenIcon className='tree-node-func-icon' onClick={onLockClick} />
          )
          : <LockOutlinedIcon className='tree-node-func-icon show' onClick={onLockClick} />
      }
      {
        props.onDelete ? <DeleteIcon className='tree-node-func-icon' onClick={props.onDelete} /> : null
      }
    </div>
  )
});

const PathTreeItem = observer((props: PathTreeProps) => {
  const path = props.path;

  const initialValue = useRef(path.name);
  const lastValidName = useRef(path.name);

  function onPathNameChange(event: React.FormEvent<HTMLSpanElement>) {
    const candidate = event.currentTarget.innerText;
    if (!getPathNameRegex().test(candidate) && candidate.length !== 0) {
      event.preventDefault();

      event.currentTarget.innerText = lastValidName.current;
    } else {
      lastValidName.current = event.currentTarget.innerText;
    }
  }

  function onPathNameKeyDown(event: React.KeyboardEvent<HTMLSpanElement>) {
    if (event.code === "Enter" || event.code === "NumpadEnter") {
      event.preventDefault();
      event.currentTarget.blur();

      onPathNameConfirm(event);
    }
  }

  function onPathNameConfirm(event: React.SyntheticEvent<HTMLSpanElement, Event>) {
    if (event.currentTarget.innerText === "") event.currentTarget.innerText = initialValue.current;
    path.name = initialValue.current = lastValidName.current = event.currentTarget.innerText;
  }

  function onPathDeleteClick() {
    props.paths.splice(props.paths.indexOf(path), 1);
    props.app.removeSelected(path.uid);
    props.app.removeExpanded(path.uid);
  }

  return (
    <TreeItem nodeId={path.uid} label={
      <PathTreeItemLabel entity={path} onDelete={action(onPathDeleteClick)} {...props}>
        <span contentEditable
          style={{ display: 'inline-block' }}
          onInput={(e) => onPathNameChange(e)}
          onKeyDown={(e) => onPathNameKeyDown(e)}
          onBlur={(e) => onPathNameConfirm(e)}
          suppressContentEditableWarning={true}
          dangerouslySetInnerHTML={{ __html: initialValue.current }} // SECURITY: Beware of XSS attack from the path file
          onClick={(e) => e.preventDefault()}
        />
      </PathTreeItemLabel>
    } >
      {
        path.getControlsSet().map((control) => {
          return (
            <TreeItem nodeId={control.uid} key={control.uid}
              label={control instanceof EndPointControl
                ? <PathTreeItemLabel entity={control} parent={path} onDelete={() => path.removeSpline(control)} {...props}>
                  <span>End Point Control</span>
                </PathTreeItemLabel>
                : <PathTreeItemLabel entity={control} parent={path} {...props}>
                  <span>Control</span>
                </PathTreeItemLabel>} />
          )
        })
      }
    </TreeItem>
  )
});

export { PathTreeItem };
