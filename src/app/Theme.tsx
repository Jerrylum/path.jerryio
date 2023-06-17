import { Components, Theme, ThemeOptions, createTheme } from "@mui/material";

export enum AppTheme {
  Light,
  Dark, // UX: Default theme
}

export interface AppThemeInfo {
  name: string;
  foregroundColor: string; // UX: Default card background color
  backgroundColor: string;
  className: string;
  theme: Theme;
}

const componentsStyleOverrides: Components<Omit<Theme, 'components'>> = {};

const darkTheme: AppThemeInfo = {
  name: "Dark",
  foregroundColor: "#a4a4a4",
  backgroundColor: "#353535",
  className: "dark-theme",
  theme: createMuiTheme({
    palette: {
      mode: 'dark',
      primary: {
        light: '#5C469C',
        main: '#7F47B3',
        dark: '#474AB3',
        contrastText: "#fff"
      },
      background: {
        default: '#1E1E1E',
        paper: '#353535'
      },
    },
    components: componentsStyleOverrides
  })
};

const lightTheme: AppThemeInfo = {
  name: "Light",
  foregroundColor: "grey",
  backgroundColor: "#ffffff",
  className: "light-theme",
  theme: createMuiTheme({
    palette: {
      mode: 'light',
      primary: {
        main: '#5C469C'
      }
    },
    components: componentsStyleOverrides
  })
};

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

  return theme;
}

export { darkTheme, lightTheme };
