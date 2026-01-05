import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ErrorPage from "./components/ErrorPage.jsx";
import Home from "./pages/Home.jsx";
import SearchPage from "./pages/SearchPage.jsx";
import NotFound from "./pages/NotFound.jsx";
import "./index.css";
import SubscriptionVerifiedPage from './pages/SubscriptionVerifiedPage';
import ManageSubscriptionsPage from "./pages/ManageSubscriptionsPage.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Home /> },
      { path: "search", element: <SearchPage /> },
      {
        path: 'subscription/verified',   // 👈 this becomes /subscription/verified
        element: <SubscriptionVerifiedPage />,
      },
      {
        path: "subscriptions/manage",        // 🆕 bu da /subscriptions/manage oluyor
        element: <ManageSubscriptionsPage />,
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
