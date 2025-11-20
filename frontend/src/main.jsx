import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import SearchPage from "./pages/SearchPage.jsx";
import "./index.css";
import SubscriptionVerifiedPage from './pages/SubscriptionVerifiedPage';


const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: "search", element: <SearchPage /> },
      {
        path: 'subscription/verified',   // 👈 this becomes /subscription/verified
        element: <SubscriptionVerifiedPage />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
