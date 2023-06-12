import { Components, Theme, createTheme } from "@mui/material";

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
  theme: createTheme({
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
        paper: '#2A2A2A'
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
  theme: createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: '#5C469C'
      }
    },
    components: componentsStyleOverrides
  })
};

export { darkTheme, lightTheme };
