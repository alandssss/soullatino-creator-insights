import { Outlet } from "react-router-dom";

const AppLayout = () => (
  <div className="min-h-screen flex w-full">
    <div className="flex-1 flex flex-col">
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  </div>
);

export default AppLayout;
