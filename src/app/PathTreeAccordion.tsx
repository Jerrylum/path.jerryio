import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";
import KeyboardDoubleArrowDownIcon from "@mui/icons-material/KeyboardDoubleArrowDown";
import KeyboardDoubleArrowUpIcon from "@mui/icons-material/KeyboardDoubleArrowUp";
import { AccordionDetails, AccordionSummary, Box, Card, IconButton, Tooltip, Typography } from "@mui/material";
import { action } from "mobx";
import { observer } from "mobx-react-lite";
import { TreeView } from "@mui/lab";
import { PathTreeItem } from "./PathTreeItem";
import { Segment, EndPointControl, Path } from "../core/Path";
import { AddPath } from "../core/Command";
import { useAppStores } from "../core/MainApp";

const PathTreeAccordion = observer((props: {}) => {
  const { app } = useAppStores();

  function onAddPathClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    const newPath = new Path(
      app.format.buildPathConfig(),
      new Segment(new EndPointControl(-60, -60, 0), [], new EndPointControl(-60, 60, 0))
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

  function onTreeViewNodeToggle(event: React.SyntheticEvent, nodeIds: string[]) {
    event.persist();
    // UX: Expand/Collapse if: the icon is clicked
    let iconClicked = (event.target as HTMLElement).closest(".MuiTreeItem-iconContainer");
    if (iconClicked) {
      app.clearExpanded();
      nodeIds.forEach(nodeId => app.addExpanded(nodeId));
    }
  }

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
        <TreeView
          defaultCollapseIcon={<ExpandMoreIcon />}
          defaultExpandIcon={<ChevronRightIcon />}
          multiSelect
          expanded={app.expandedEntityIds}
          selected={app.selectedEntityIds}
          onNodeSelect={action((event, nodeIds) => app.setSelected(nodeIds))}
          onNodeToggle={action(onTreeViewNodeToggle)}
          sx={{ flexGrow: 1, maxWidth: "100%", overflowX: "hidden", overflowY: "auto", margin: "1vh 0 0" }}>
          {app.paths
            .slice()
            .sort((a, b) => (a.name < b.name ? -1 : 1))
            .map((path, pathIdx) => {
              return <PathTreeItem key={path.uid} path={path} />;
            })}
        </TreeView>
      </AccordionDetails>
    </Card>
  );
});

export { PathTreeAccordion };
