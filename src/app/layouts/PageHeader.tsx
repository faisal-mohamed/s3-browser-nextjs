import { useEffect, useState } from "react";
import { FaUserCircle } from "react-icons/fa";
import "./custom-layout.scss";
import authService from "../services/auth-service";
import { useAppInitialized } from "../context/AppInitContext";

interface CommonHeaderProps {
  headerName: string;
}

const CommonHeader = ({ headerName }: CommonHeaderProps) => {
  const { isReady } = useAppInitialized();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await authService.signOut();
      window.location.href = '/s3-browser-login';
    } catch (err: any) {
      console.error(err.message || 'Failed to sign out');
    } finally {
      setIsSigningOut(false);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          setUsername(user.username || user.signInDetails?.loginId || "User");
        }
      } catch (err) {
        console.error("Failed to fetch current user:", err);
      }
    };

    if (isReady) {
      fetchUser();
    }
  }, [isReady]);

  if (!isReady) {
    return <div>Initializing Cognito...</div>;
  }

  return (
    <header className="common-header">
      <div className="header-left">
        <h1 className="header-title">{headerName}</h1>
      </div>
      <div className="header-right">
        {username && <span className="username-label">Hello, {username}</span>}
        <div className="profile-icon" onClick={toggleDropdown}>
          <FaUserCircle size={28} />
        </div>
        {dropdownOpen && (
          <div className="profile-dropdown">
            <ul>
              <li onClick={handleSignOut}>
                {isSigningOut ? "Signing out..." : "Sign out"}
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
};

export default CommonHeader;
