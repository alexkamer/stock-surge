import { createBrowserRouter } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { StockDetail } from "./pages/StockDetail";
import { SectorsIndustries } from "./pages/SectorsIndustries";
import { Chat } from "./pages/Chat";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Dashboard />,
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
]);
