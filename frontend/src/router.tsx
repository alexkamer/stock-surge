import { createBrowserRouter } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { StockDetail } from "./pages/StockDetail";
import { SectorsIndustries } from "./pages/SectorsIndustries";

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
]);
