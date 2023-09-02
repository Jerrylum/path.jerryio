import { Card, Typography } from "@mui/material";
import { observer } from "mobx-react-lite";
import { Modal } from "../component/Modal";
import { APP_VERSION } from "../core/MainApp";

export const AboutModalSymbol = Symbol("AboutModal");

export const AboutModal = observer(() => {
  return (
    <Modal symbol={AboutModalSymbol}>
      <Card id="about-modal" className="modal-container">
        <img src="static/logo464.svg" alt="app logo" />
        <Typography variant="h3" gutterBottom align="center">
          PATH.JERRYIO Version {APP_VERSION.version}
        </Typography>
        <Typography variant="body1" align="center" sx={{ marginBottom: "2rem" }}>
          Made by Jerry Lum
        </Typography>
        <Typography variant="body1" align="center">
          This is a free software licensing under GPL-3.0
        </Typography>
        <Typography variant="body1" align="center">
          <a target="_blank" rel="noreferrer" href="https://github.com/Jerrylum/path.jerryio">
            Source Code
          </a>
          <a
            target="_blank"
            rel="noreferrer"
            href="https://www.tldrlegal.com/license/gnu-general-public-license-v3-gpl-3">
            License
          </a>
          <a target="_blank" rel="noreferrer" href="https://github.com/Jerrylum/path.jerryio/blob/main/PRIVACY.md">
            Privacy Terms
          </a>
          <a target="_blank" rel="noreferrer" href="https://www.gnu.org/philosophy/free-sw.html">
            About Free Software
          </a>
          <a target="_blank" rel="noreferrer" href="https://discord.gg/4uVSVXXBBa">
            Join Our Discord Server
          </a>
        </Typography>
      </Card>
    </Modal>
  );
});
