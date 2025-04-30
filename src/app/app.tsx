"use client";

import dynamic from "next/dynamic";

// note: dynamic import is required for components that use the Frame SDK
const Home = dynamic(() => import("~/components/Home"), {
  ssr: false,
});

export default function App() {
  return <Home />;
}
