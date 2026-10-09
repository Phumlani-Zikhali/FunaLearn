import React from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { AccessibilityProvider } from "./lib/accessibility-context";
import { App } from "./app";
import "./styles.css";
const root = createRootRoute({
  component: () => (
    <AccessibilityProvider>
      <App />
    </AccessibilityProvider>
  ),
});
const paths = [
  "/",
  "/login",
  "/student",
  "/student/subjects",
  "/student/create",
  "/student/learn/$id",
  "/student/flashcards",
  "/student/flashcards/$id",
  "/student/quizzes",
  "/student/quizzes/$id",
  "/student/progress",
  "/student/badges",
  "/student/leaderboard",
  "/teacher/leaderboard",
  "/admin/leaderboard",
  "/student/resources",
  "/student/assignments",
  "/student/messages",
  "/student/ai",
  "/student/settings",
  "/teacher",
  "/teacher/classes",
  "/teacher/resources",
  "/teacher/assignments",
  "/teacher/activities",
  "/teacher/reports",
  "/teacher/messages",
  "/teacher/ai",
  "/teacher/settings",
  "/admin",
  "/admin/users",
  "/admin/classes",
  "/admin/resources",
  "/admin/settings",
];
const router = createRouter({
  routeTree: root.addChildren(
    paths.map((path) =>
      createRoute({ getParentRoute: () => root, path, component: () => null }),
    ),
  ),
  defaultNotFoundComponent: () => null,
});
class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="login">
        <h1>Let’s try that again.</h1>
        <p>
          The page could not load. Your saved learning is still in the database.
        </p>
        <button onClick={() => location.reload()}>Reload FunaLearn</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
const container = document.getElementById("root")! as HTMLElement & {
  funalearnRoot?: Root;
};
// Preserve the root during development updates so a source edit cannot mount twice.
const appRoot = (container.funalearnRoot ??= createRoot(container));
appRoot.render(
  <ErrorBoundary>
    <RouterProvider router={router} />
  </ErrorBoundary>,
);
