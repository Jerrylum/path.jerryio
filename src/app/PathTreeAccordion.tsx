import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import { AccordionDetails, AccordionSummary, Box, Card, IconButton, Tooltip, Typography } from "@mui/material";
import { action } from "mobx"
import { observer } from "mobx-react-lite";
import { TreeView } from '@mui/lab';
import { AppProps } from '../App';
import { PathTreeItem } from './PathTreeItem';
import { Spline, EndPointControl, Path } from '../math/Path';

const PathTreeAccordion = observer((props: AppProps) => {
  function onAddPathClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    const newPath = new Path(props.app.format.buildPathConfig(), new Spline(new EndPointControl(-60, -60, 0), [], new EndPointControl(-60, 60, 0)));
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
    <Card id='path-tree'>
      <AccordionSummary>
        <Typography>Paths</Typography>
        <Box>
          <Tooltip title='Add New Path'>
            <IconButton className='icon' onClick={action(onAddPathClick)}>
              <AddIcon />
            </IconButton>
          </Tooltip>
          {
            props.paths.length === 0
              ? <IconButton className='icon' onClick={action(onExpandAllClick)} disabled={props.paths.length === 0}><KeyboardDoubleArrowUpIcon /></IconButton>
              : <Tooltip title={props.app.expanded.length !== props.paths.length ? 'Expand All' : 'Collapse All'}>
                <IconButton className='icon' onClick={action(onExpandAllClick)}>
                  {
                    props.app.expanded.length !== props.paths.length
                      ? <KeyboardDoubleArrowDownIcon />
                      : <KeyboardDoubleArrowUpIcon />
                  }
                </IconButton>
              </Tooltip>
          }

        </Box>
      </AccordionSummary>
      <AccordionDetails>
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
