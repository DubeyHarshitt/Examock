import { useAuthStore } from "../../store/auth.store"

const DashboardPage = () => {
  const logout = useAuthStore((state) => state.logout);

  const isAdmin = useAuthStore(
  (state) => state.isAdmin()
);

  const handleLogout = ()=> {
    logout();
    console.log(isAdmin);
  }

  return (
    <>
    <button onClick={handleLogout} className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white m-4 border rounded-lg">
      Logout
    </button>
    <div>
      Header with user info and logout button Summary cards (e.g. upcoming
      exams, recent activity) <br /> Quick links (e.g. start new test, view notes) <br />
      DashboardPage Recent activity feed (e.g. recent tests taken, scores) <br />
      Footer with support/contact info
    </div>
    </>
  );
};

export default DashboardPage;
