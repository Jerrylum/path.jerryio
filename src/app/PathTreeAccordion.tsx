import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { AccordionDetails, AccordionSummary, Button, Card, Typography } from "@mui/material";
import { action } from "mobx"
import { observer } from "mobx-react-lite";
import { TreeView } from '@mui/lab';
import { AppProps } from '../App';
import { PathTreeItem } from './PathTreeItem';
import { Spline, EndPointControl, Path } from '../math/Path';

const PathTreeAccordion = observer((props: AppProps) => {
  function onAddPathClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    const newPath = new Path(props.app.format.buildSpeedConfig(), new Spline(new EndPointControl(-60, -60, 0), [], new EndPointControl(-60, 60, 0)));
    props.paths.push(newPath);
    props.app.addExpanded(newPath);
  }

  function onExpandAllClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    props.app.expanded = props.app.expanded.length !== props.paths.length ? props.paths.map((path) => path.uid) : [];
  }

  function onTreeViewNodeToggle(event: React.SyntheticEvent, nodeIds: string[]) {
    event.persist()
    // UX: Expand/Collapse if: the icon is clicked
    let iconClicked = (event.target as HTMLElement).closest(".MuiTreeItem-iconContainer")
    if (iconClicked) {
      props.app.expanded = nodeIds;
    }
  }

  return (
    <Card className='left-editor-container'>
      <AccordionSummary>
        <Typography>Paths</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <div style={{ marginTop: "1vh" }}>
          <Button variant="text" onClick={action(onAddPathClick)}>Add Path</Button>
          {
            props.paths.length > 0
              ? <Button variant="text" onClick={action(onExpandAllClick)}>{props.app.expanded.length !== props.paths.length ? "Expand All" : "Collapse All"}</Button>
              : null
          }
        </div>
        <TreeView
          defaultCollapseIcon={<ExpandMoreIcon />}
          defaultExpandIcon={<ChevronRightIcon />}
          multiSelect
          expanded={props.app.expanded}
          selected={props.app.selected}
          onNodeSelect={action((event, nodeIds) => props.app.selected = nodeIds)}
          onNodeToggle={action(onTreeViewNodeToggle)}
          sx={{ flexGrow: 1, maxWidth: "100%", overflowX: 'hidden', overflowY: 'auto', margin: "1vh 0 0" }}
        >
          {
            props.paths.slice().sort((a, b) => (a.name < b.name ? -1 : 1)).map((path, pathIdx) => {
              return (
                <PathTreeItem key={path.uid} path={path} {...props} />
              )
            })
          }
        </TreeView>
      </AccordionDetails>
    </Card>
  )
});

export { PathTreeAccordion };
