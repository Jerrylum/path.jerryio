import { Components, Theme, ThemeOptions, createTheme } from "@mui/material";
import { getAppStores } from "@core/MainApp";

export enum AppThemeType {
  Light = "light",
  Dark = "dark" // UX: Default theme
}

export interface AppThemeInfo {
  name: string;
  foregroundColor: string; // UX: Default card background color
  backgroundColor: string;
  styleName: string;
  theme: Theme;
}

const componentsStyleOverrides: Components<Omit<Theme, "components">> = {};

function createMuiTheme(options?: ThemeOptions | undefined, ...args: object[]): Theme {
  const theme = createTheme(options, ...args);

  // Override default typography
  const t = theme.typography;
  t.h1.fontSize = "1.75rem";
  t.h2.fontSize = "1.5rem";
  t.h3.fontSize = "1.25rem";
  t.h4.fontSize = "1rem";
  t.h5.fontSize = "1rem";
  t.h6.fontSize = "1rem";

  // Also read: https://www.joshwcomeau.com/css/rules-of-margin-collapse/
  t.h1.marginTop = "1em";
  t.h2.marginTop = "1em";
  t.h3.marginTop = "1em";
  t.h4.marginTop = "1em";
  t.h5.marginTop = "1em";
  t.h6.marginTop = "1em";

  return theme;
}

export const themes = {
  [AppThemeType.Light]: {
    name: "Light",
    foregroundColor: "grey",
    backgroundColor: "#ffffff",
    styleName: "light",
    theme: createMuiTheme({
      palette: {
        mode: "light",
        primary: {
          main: "#5C469C"
        }
      },
      components: componentsStyleOverrides
    })
  },
  [AppThemeType.Dark]: {
    name: "Dark",
    foregroundColor: "#a4a4a4",
    backgroundColor: "#353535",
    styleName: "dark",
    theme: createMuiTheme({
      palette: {
        mode: "dark",
        primary: {
          light: "#5C469C",
          main: "#7F47B3",
          dark: "#474AB3",
          contrastText: "#FFF"
        },
        background: {
          default: "#1E1E1E",
          paper: "#353535"
        }
      },
      components: componentsStyleOverrides
    })
  }
} as const satisfies { [key in AppThemeType]: Readonly<AppThemeInfo> };

export function getAppThemeInfo() {
  return themes[getAppStores().appPreferences.themeType] ?? themes[AppThemeType.Dark];
}
