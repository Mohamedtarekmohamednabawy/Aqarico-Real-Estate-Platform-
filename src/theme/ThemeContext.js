import { createContext } from "react";

export const ThemeContext = createContext({
    themeName: "light",
    toggleTheme: () => { },
    setTheme: (name) => { },
});
