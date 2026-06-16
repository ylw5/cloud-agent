import "./styles.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createRoot } from "react-dom/client";
import App from "./app";

const root = createRoot(document.getElementById("root")!);
root.render(
  <TooltipProvider>
    <App />
  </TooltipProvider>
);
