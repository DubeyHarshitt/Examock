import { useAuthStore } from "../../store/auth.store";

const AdminDashboard = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <>
      <div>{"Welcome - " + user?.name}</div>
      <div>AdminDashboard</div>
    </>
  );
};

export default AdminDashboard;
