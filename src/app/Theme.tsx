import { createTheme } from "@mui/material";

const darkTheme = createTheme({
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
  }
});

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#5C469C'
    }
  },
});

export { darkTheme, lightTheme };
