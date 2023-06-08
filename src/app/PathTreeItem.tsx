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
import { EndPointControl, Path } from '../math/Path';
import { useRef } from 'react';
import { InteractiveEntity } from '../math/Canvas';
import { UpdateInteractiveEntities } from '../math/Command';

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
    const affected = props.app.isSelected(entity) ? props.app.selectedEntities : [entity];

    props.app.history.execute(`Update entities visibility to ${setTo}`,
      new UpdateInteractiveEntities(affected, { visible: setTo }), 0); // Disable merge
  }

  function onLockClick(event: React.MouseEvent<SVGSVGElement, MouseEvent>) {
    const setTo = !entity.lock;
    const affected = props.app.isSelected(entity) ? props.app.selectedEntities : [entity];

    props.app.history.execute(`Update entities lock to ${setTo}`,
      new UpdateInteractiveEntities(affected, { lock: setTo }), 0); // Disable merge
  }

  return (
    <div className='tree-node-label'>
      {props.children}
      <span style={{ display: "inline-block", marginRight: "1em" }}></span>
      {
        entity.visible
          ? (
            parent !== undefined && parent.visible === false
              ? <FiberManualRecordOutlinedIcon className='tree-node-func-icon show' onClick={action(onVisibleClick)} />
              : <VisibilityIcon className='tree-node-func-icon' onClick={action(onVisibleClick)} />
          )
          : <VisibilityOffOutlinedIcon className='tree-node-func-icon show' onClick={action(onVisibleClick)} />
      }
      {
        entity.lock === false
          ? (
            parent !== undefined && parent.lock === true
              ? <FiberManualRecordOutlinedIcon className='tree-node-func-icon show' onClick={action(onLockClick)} />
              : <LockOpenIcon className='tree-node-func-icon' onClick={action(onLockClick)} />
          )
          : <LockOutlinedIcon className='tree-node-func-icon show' onClick={action(onLockClick)} />
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
    props.app.unselect(path);
    props.app.removeExpanded(path);
  }

  return (
    <TreeItem nodeId={path.uid} label={
      <PathTreeItemLabel entity={path} onDelete={action(onPathDeleteClick)} {...props}>
        <span contentEditable
          style={{ display: 'inline-block' }}
          onInput={(e) => onPathNameChange(e)}
          onKeyDown={action(onPathNameKeyDown)}
          onBlur={action(onPathNameConfirm)}
          suppressContentEditableWarning={true}
          dangerouslySetInnerHTML={{ __html: initialValue.current }} // SECURITY: Beware of XSS attack from the path file
          onClick={(e) => e.preventDefault()}
        />
      </PathTreeItemLabel>
    } >
      {
        path.controls.map((control) => {
          return (
            <TreeItem nodeId={control.uid} key={control.uid}
              label={control instanceof EndPointControl
                ? <PathTreeItemLabel entity={control} parent={path} onDelete={() => path.removeSpline(control)} {...props}>
                  <span>End Control</span>
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
