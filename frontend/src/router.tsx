import { createBrowserRouter } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { StockDetail } from "./pages/StockDetail";
import { SectorsIndustries } from "./pages/SectorsIndustries";
import { Chat } from "./pages/Chat";
import Portfolio from "./pages/Portfolio";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import Settings from "./pages/Settings";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Dashboard />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/signup",
    element: <Signup />,
  },
  {
    path: "/stock/:ticker",
    element: <StockDetail />,
  },
  {
    path: "/sectors",
    element: <SectorsIndustries />,
  },
  {
    path: "/chat",
    element: <Chat />,
  },
  {
    path: "/portfolio",
    element: <Portfolio />,
  },
  {
    path: "/settings",
    element: <Settings />,
  },
]);
