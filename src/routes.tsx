import { type RouteConfig } from "@/types/index";
import { lazy } from "react";
import { Navigate, useParams } from "react-router-dom";

// Lazy load pages
const Home = lazy(() => import("@/pages/Home"));
const Artists = lazy(() => import("@/pages/Artists"));
const Gallery = lazy(() => import("@/pages/Gallery"));
const Community = lazy(() => import("@/pages/Community"));
const Messages = lazy(() => import("@/pages/Messages"));
const CommissionDetail = lazy(() => import("@/pages/CommissionDetail"));
const Profile = lazy(() => import("@/pages/Profile"));
const Auth = lazy(() => import("@/pages/Auth"));
const Verify = lazy(() => import("@/pages/Verify"));
const Admin = lazy(() => import("@/pages/Admin"));

// /chat/:id → /messages/:id 兼容重定向
function ChatRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/messages/${id}`} replace />;
}

export const routes: RouteConfig[] = [
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/artists",
    element: <Artists />,
  },
  {
    path: "/gallery",
    element: <Gallery />,
  },
  {
    path: "/community",
    element: <Community />,
  },
  {
    path: "/messages",
    element: <Messages />,
  },
  {
    path: "/messages/:id",
    element: <Messages />,
  },
  // 旧路由兼容重定向
  {
    path: "/chat/:id",
    element: <ChatRedirect />,
  },
  {
    path: "/commission/:id",
    element: <CommissionDetail />,
  },
  {
    path: "/profile/:id",
    element: <Profile />,
  },
  {
    path: "/auth",
    element: <Auth />,
  },
  {
    path: "/verify",
    element: <Verify />,
  },
  {
    path: "/admin",
    element: <Admin />,
  },
];
