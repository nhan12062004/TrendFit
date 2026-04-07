import MainContent from './MainContent';
import RightPanel from './RightPanel';

export default function Overview() {
  return (
    <div className="flex-1 flex flex-col xl:flex-row gap-6 min-w-0">
      <div className="flex-[2] min-w-0">
        <MainContent />
      </div>
      <div className="w-full xl:w-80 shrink-0">
        <RightPanel />
      </div>
    </div>
  );
}
