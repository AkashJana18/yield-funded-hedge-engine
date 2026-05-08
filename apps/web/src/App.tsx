import { Navigate, Route, Routes } from "react-router-dom";
import { HedgePage } from "./pages/HedgePage";
import { LandingPage } from "./pages/LandingPage";
import { SimulatorPage } from "./pages/SimulatorPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<SimulatorPage />} />
      <Route path="/hedge" element={<HedgePage />} />
      <Route path="/build" element={<HedgePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
