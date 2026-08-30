import LifecycleStepper from "./LifecycleStepper";
import CategoryGrid from "./CategoryGrid";
import ResolutionPanel from "./ResolutionPanel";

export default function OverviewView() {
  return (
    <div>
      <LifecycleStepper />
      <CategoryGrid />
      <ResolutionPanel />
    </div>
  );
}
